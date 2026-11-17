#!/usr/bin/env node
/** Read-only comparison of dated dev offer evidence and live WP diagnostics.
 * A comparison never refreshes prices, proves retailer stock, or deploys code.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewCatalogFreshness} from './catalog-freshness.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const HEALTH='https://solar-expert.cz/wp-json/solar-expert/v1/health';
const MAX_HEALTH_BYTES=512*1024;

function validCount(value){return Number.isSafeInteger(value)&&value>=0;}

export function compareCatalogHealth(source,health,observedAt=new Date()){
  const checkedAt=new Date(observedAt).toISOString();
  const base={
    schema_version:1,
    checked_at_utc:checkedAt,
    status:'health_unavailable',
    source_total_offers:source.total_offers,
    source_date_fresh:source.counts.fresh+source.counts.expiring_soon,
    source_date_stale:source.counts.stale,
    live_theme_version:null,
    live_total_snapshots:null,
    live_price_fresh:null,
    live_price_stale:null,
    live_verification_unknown:null,
    fresh_count_gap:null,
    release_authorized:false,
    warning:'Source verified_at date evidence is not retailer verification today. Public health counts do not prove live WordPress database, media, theme PHP, conversion or backup restore. Never auto-refresh source timestamps or trigger deployment.'
  };
  if(!health||health.status!=='ok'||typeof health.theme_version!=='string'||
      !validCount(health.catalog_price_snapshots)||
      !validCount(health.catalog_price_fresh)||
      !validCount(health.catalog_price_stale)||
      !validCount(health.catalog_price_verification_unknown)||
      health.catalog_price_fresh+health.catalog_price_stale+
        health.catalog_price_verification_unknown!==health.catalog_price_snapshots){
    return base;
  }
  base.live_theme_version=health.theme_version;
  base.live_total_snapshots=health.catalog_price_snapshots;
  base.live_price_fresh=health.catalog_price_fresh;
  base.live_price_stale=health.catalog_price_stale;
  base.live_verification_unknown=health.catalog_price_verification_unknown;
  base.fresh_count_gap=base.source_date_fresh-base.live_price_fresh;
  if(base.source_total_offers!==base.live_total_snapshots){
    base.status='catalog_population_mismatch';
  }else if(base.fresh_count_gap>0){
    base.status='live_freshness_lag';
  }else{
    base.status='no_positive_freshness_gap';
  }
  return base;
}

export async function fetchLiveHealth(fetchImpl=fetch){
  const response=await fetchImpl(HEALTH,{
    method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000),
    headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}
  });
  if(response.status!==200||response.redirected)throw new Error('health HTTP not 200 or redirected');
  const length=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(length)&&length>MAX_HEALTH_BYTES)throw new Error('oversize health response');
  if(!response.body?.getReader)throw new Error('unreadable health response');
  const reader=response.body.getReader(),chunks=[];
  let count=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      count+=value.byteLength;
      if(count>MAX_HEALTH_BYTES)throw new Error('oversize health response');
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  if(!count)throw new Error('empty health response');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function run({dir=ROOT,output=join(ROOT,'artifacts/live-catalog-gap.json')}={}){
  const sourceText=readFileSync(join(dir,'data/product-seed.json'),'utf8');
  const runtimeText=readFileSync(join(dir,'assets/data/product-seed.json'),'utf8');
  if(sourceText!==runtimeText)throw new Error('Source and runtime catalog differ');
  const now=new Date();
  const source=reviewCatalogFreshness(JSON.parse(sourceText),now);
  let health=null;
  try{health=await fetchLiveHealth();}
  catch(_){/* Network and invalid JSON are explicitly unavailable, not evidence. */}
  const report=compareCatalogHealth(source,health,now);
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  const message='Solar catalog live gap: '+report.status+
    ' source_date_fresh='+report.source_date_fresh+'/'+report.source_total_offers+
    ' live_price_fresh='+(report.live_price_fresh??'unknown')+'/'+(report.live_total_snapshots??'unknown')+
    ' release_authorized=false';
  console.log(message);
  if(process.env.GITHUB_STEP_SUMMARY){
    const {appendFileSync}=await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### Production catalog price evidence gap\n\n'+message+'\n\n'+report.warning+'\n');
  }
  if(report.status==='live_freshness_lag'||report.status==='catalog_population_mismatch'||
      report.status==='health_unavailable')console.log('::warning::'+message);
  return report;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  try{await run();}
  catch(error){console.error('Catalog live-gap input inconsistency:',error.message);process.exitCode=1;}
}
