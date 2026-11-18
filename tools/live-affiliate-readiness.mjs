#!/usr/bin/env node
/**
 * Read-only audit of *public* WordPress affiliate configuration. Never fetches
 * tracking URLs, reads private WP options, or equates a base with a commission.
 */
import {appendFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchLiveHealth} from './live-catalog-gap.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const HOMEPAGE='https://solar-expert.cz/';
const MAX_HTML_BYTES=256*1024;

function cleanMap(value){
  return value && typeof value==='object' && !Array.isArray(value) ? value : {};
}

/** Parse only the JSON assigned to the one WordPress-localized public config. */
export function extractAffiliateConfig(html){
  if(typeof html!=='string')throw new TypeError('Missing homepage HTML');
  const match=/\bvar\s+SolarExpertConfig\s*=\s*/.exec(html);
  if(!match)throw new Error('Public SolarExpertConfig assignment missing');
  const start=match.index+match[0].length;
  if(html[start]!=='{')throw new Error('Public config is not a JSON object');
  let depth=0,inString=false,escaped=false;
  for(let i=start;i<html.length;i++){
    const ch=html[i];
    if(inString){
      if(escaped)escaped=false;
      else if(ch==='\\')escaped=true;
      else if(ch==='"')inString=false;
      continue;
    }
    if(ch==='"'){inString=true;continue;}
    if(ch==='{')depth++;
    if(ch==='}'){
      depth--;
      if(depth===0){
        if(i-start>128*1024)throw new Error('Oversize public affiliate config');
        const parsed=JSON.parse(html.slice(start,i+1));
        if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid public config');
        return parsed;
      }
    }
  }
  throw new Error('Unterminated public affiliate config');
}

function classifyBase(value){
  if(typeof value!=='string')return 'invalid';
  try{
    const url=new URL(value);
    if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||
      url.hostname==='solar-expert.cz'||url.hostname.endsWith('.solar-expert.cz')||
      ['localhost','127.0.0.1','::1'].includes(url.hostname))return 'invalid';
    if(url.hostname!=='ehub.cz')return 'external_unclassified';
    if(url.protocol==='https:'&&url.pathname==='/system/scripts/click.php'&&
      url.searchParams.get('a_aid')&&url.searchParams.get('a_bid'))return 'qualified_ehub';
    return 'invalid';
  }catch(_){return 'invalid';}
}

/** Count only safe, public metadata; NEVER include URLs or affiliate IDs. */
export function assessAffiliateReadiness(config,health=null,now=new Date()){
  const bases=cleanMap(config?.affiliateBases);
  const productMap=cleanMap(config?.affiliateMap?.products);
  const leadMap=cleanMap(config?.affiliateMap?.leads);
  const classifications=Object.entries(bases).map(([key,value])=>({
    merchant:/^[a-z0-9-]+$/.test(key)?key:'invalid-key',
    status:classifyBase(value)
  }));
  const qualified=classifications.filter(item=>item.status==='qualified_ehub');
  const unknown=classifications.filter(item=>item.status==='external_unclassified');
  const invalid=classifications.filter(item=>item.status==='invalid');
  const healthCount=Number.isSafeInteger(health?.affiliate_merchant_bases)&&health.affiliate_merchant_bases>=0
    ? health.affiliate_merchant_bases:null;
  let status='observed';
  if(!classifications.length)status='missing_bases';
  else if(invalid.length)status='invalid_bases';
  else if(unknown.length)status='unclassified_networks';
  else if(healthCount!==null&&healthCount!==classifications.length)status='health_count_mismatch';
  return {
    schema_version:1,
    checked_at_utc:new Date(now).toISOString(),
    status,
    configured_bases:classifications.length,
    qualified_ehub_bases:qualified.length,
    unclassified_external_bases:unknown.length,
    invalid_bases:invalid.length,
    unclassified_merchants:unknown.map(item=>item.merchant).sort(),
    invalid_merchants:invalid.map(item=>item.merchant).sort(),
    product_overrides:Object.keys(productMap).length,
    lead_overrides:Object.keys(leadMap).length,
    live_health_reported_bases:healthCount,
    live_theme_version:typeof health?.theme_version==='string'?health.theme_version:null,
    release_authorized:false,
    caveat:'Qualified eHub means only a recognizable public redirect template, not successful tracking, approved commission, stock, conversion, revenue or safe WordPress restore. Unclassified networks need manual verification; no redirect was visited.'
  };
}

export async function fetchPublicHomepage(fetchImpl=fetch){
  const response=await fetchImpl(HOMEPAGE,{
    method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000),
    headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}
  });
  if(response.status!==200||response.redirected)throw new Error('Homepage not HTTP 200');
  const length=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(length)&&length>MAX_HTML_BYTES)throw new Error('Oversize homepage');
  if(!response.body?.getReader)throw new Error('Unreadable homepage');
  const reader=response.body.getReader(),chunks=[];
  let count=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      count+=value.byteLength;
      if(count>MAX_HTML_BYTES)throw new Error('Oversize homepage');
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  if(!count)throw new Error('Empty homepage');
  return Buffer.concat(chunks).toString('utf8');
}

export async function run({output=join(ROOT,'artifacts/live-affiliate-readiness.json'),
    fetchHomepage=fetchPublicHomepage,fetchHealth=fetchLiveHealth}={}){
  const now=new Date();
  let config=null,health=null;
  try{config=extractAffiliateConfig(await fetchHomepage());}
  catch(_){/* Public homepage unavailable is explicitly unverified. */}
  try{health=await fetchHealth();}
  catch(_){/* The public health endpoint may be blocked independently. */}
  const report=config?assessAffiliateReadiness(config,health,now):{
    schema_version:1,checked_at_utc:now.toISOString(),status:'homepage_unavailable',
    configured_bases:null,qualified_ehub_bases:null,unclassified_external_bases:null,
    invalid_bases:null,product_overrides:null,lead_overrides:null,
    live_health_reported_bases:Number.isSafeInteger(health?.affiliate_merchant_bases)?health.affiliate_merchant_bases:null,
    release_authorized:false,
    caveat:'No affiliate configuration could be verified. No tracking redirects were visited.'
  };
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  const summary='Solar affiliate readiness: '+report.status+
    '; eHub templates='+String(report.qualified_ehub_bases)+'/'+String(report.configured_bases)+
    '; health bases='+String(report.live_health_reported_bases)+
    '; release_authorized=false';
  console.log(summary);
  if(process.env.GITHUB_STEP_SUMMARY){
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### Production affiliate configuration (read-only)\n\n'+summary+
      '\n\n'+report.caveat+'\n');
  }
  if(report.status!=='observed')console.log('::warning::'+summary);
  return report;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  try{await run();}
  catch(error){console.error('Affiliate monitor input error:',error.message);process.exitCode=1;}
}
