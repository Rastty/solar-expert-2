#!/usr/bin/env node
/**
 * Create a NOT-DEPLOYABLE quote-only preview by copying dated seller evidence
 * onto the exact live public product catalog, never overwriting technical
 * limits, product identities, photos, safety flags, or affiliate mappings.
 *
 * This is NOT permission to change WordPress media, theme or price snapshots.
 * Skips unresolved VSelektro SKU ownership; never refreshes a verification
 * date to "today" and never requests retailer/eHub/affiliate URLs.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

export const SITE='https://solar-expert.cz';
export const PUBLIC_URL=SITE+'/wp-content/themes/solar-expert-2/assets/data/product-seed.json';
export const DEV_PIN='535698742864442c839261613c6583110223204f';
export const UNRESOLVED=new Set(['vselektro-eu']);
const MAX_BYTES=4*1024*1024;
const allowedAvailability=new Set(['in_stock','usually_in_stock','on_request','out_of_stock','unavailable','discontinued']);
const sha256=b=>createHash('sha256').update(b).digest('hex');
const bytes=v=>Buffer.from(JSON.stringify(v));

function guard(x,message){if(!x)throw new Error(message);}
function sourceKey(o){
  guard(o&&typeof o==='object'&&typeof o.merchant==='string'&&
    typeof o.source_url==='string','Offer missing exact seller or source URL');
  const u=new URL(o.source_url);
  guard(['http:','https:'].includes(u.protocol) && !u.username && !u.password &&
        Boolean(u.hostname) && !/[\x00-\x20]/.test(o.source_url),
        'Unsafe seller source URL');
  return o.merchant+'|'+u.origin+u.pathname+u.search;
}
function rowMap(row){
  const offers=Array.isArray(row.offers)&&row.offers.length?row.offers:[row];
  const map=new Map();
  for(const offer of offers){
    const key=sourceKey(offer);
    guard(!map.has(key),'Duplicated seller source identity');
    map.set(key,offer);
  }
  return map;
}
function dated(when,now){
  guard(typeof when==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(when),'Invalid seller verification date');
  const epoch=Date.parse(when+'T00:00:00Z');
  guard(Number.isFinite(epoch) && new Date(epoch).toISOString().slice(0,10)===when,
        'Invalid seller calendar date');
  const days=Math.floor((now.getTime()-epoch)/86400000);
  return days>=0&&days<=30;
}
function exactRows(rows,label){
  guard(Array.isArray(rows),'Missing '+label);
  const m=new Map();
  for(const row of rows){
    guard(row&&typeof row==='object'&&typeof row.id==='string'&&row.id,
          'Invalid '+label+' identity');
    guard(!m.has(row.id),'Duplicate '+label+' identity');
    m.set(row.id,row);
  }
  return m;
}

export function previewOverlay(live,dev,{now=new Date()}={}){
  guard(live&&dev&&Array.isArray(live.products)&&Array.isArray(dev.products),
        'Invalid product catalogs');
  const old=exactRows(live.products,'product');
  const next=exactRows(dev.products,'product');
  guard(old.size===24&&next.size===24,'Expected exact 24-product cohort');
  guard([...old.keys()].every(id=>next.has(id)),'Product identities not identical');
  const oldDeals=exactRows(live.bundle_deals||[],'deal');
  const devDeals=exactRows(dev.bundle_deals||[],'deal');
  guard(oldDeals.size===devDeals.size,'Bundle identity cohort drift');
  guard([...oldDeals.keys()].every(id=>devDeals.has(id)),'Bundle identities not identical');

  const patch=JSON.parse(JSON.stringify(live));
  const counts={all_offer_rows:0,exact_seller_matches:0,eligible:0,
                skipped_unresolved_sku:0,skipped_source_changed:0,
                skipped_date_expired:0,skipped_bad_quote:0,
                changed_price:0,changed_stock:0};
  const exceptions=[];

  function transfer(rows,devMap,type){
    for(const row of rows){
      const target=devMap.get(row.id);
      guard(row.sku===target.sku || type==='bundle',
            'Product manufacturer/SKU mismatch: '+row.id);
      guard(row.merchant===target.merchant,
            'Primary merchant identity mismatch: '+row.id);
      const alternatives=rowMap(target);
      const originalOffers=Array.isArray(row.offers)&&row.offers.length?row.offers:[row];
      const targetOffers=Array.isArray(target.offers)&&target.offers.length?target.offers:[target];
      guard(originalOffers.length===targetOffers.length,
            'Offer count drift: '+row.id);
      const changed=[];
      for(const quote of originalOffers){
        counts.all_offer_rows++;
        const key=sourceKey(quote);
        const candidate=alternatives.get(key);
        if(!candidate){
          counts.skipped_source_changed++;
          exceptions.push(type+':'+row.id+':source_identity_changed');
          continue;
        }
        counts.exact_seller_matches++;
        if(UNRESOLVED.has(quote.merchant)){
          counts.skipped_unresolved_sku++;
          exceptions.push(type+':'+row.id+':merchant_sku_unresolved');
          continue;
        }
        if(!dated(candidate.verified_at,now)){
          counts.skipped_date_expired++;
          exceptions.push(type+':'+row.id+':seller_evidence_expired');
          continue;
        }
        const price=Number(candidate.price_czk);
        if(!Number.isFinite(price)||price<=0||
           !allowedAvailability.has(candidate.availability)){
          counts.skipped_bad_quote++;
          exceptions.push(type+':'+row.id+':no_qualified_quote');
          continue;
        }
        // A candidate only changes dated quote fields in a record with exact
        // merchant+source identity. It must never copy electrical model fields.
        if(Number(quote.price_czk)!==price)counts.changed_price++;
        if(quote.availability!==candidate.availability)counts.changed_stock++;
        quote.price_czk=price;
        quote.availability=candidate.availability;
        quote.verified_at=candidate.verified_at;
        counts.eligible++;
        changed.push(quote);
      }
      const primary=changed.find(q=>q.merchant===row.merchant);
      if(primary&&Array.isArray(row.offers)&&row.offers.length){
        row.price_czk=primary.price_czk;
        row.availability=primary.availability;
        row.verified_at=primary.verified_at;
      }
    }
  }
  transfer(patch.products,next,'product');
  transfer(patch.bundle_deals||[],devDeals,'bundle');
  guard(counts.all_offer_rows===52,'Expected exactly 52 current public priced offer rows');
  guard(counts.exact_seller_matches+counts.skipped_source_changed===counts.all_offer_rows,
        'Seller/source accounting inconsistent');
  guard(counts.eligible+counts.skipped_unresolved_sku+
        counts.skipped_date_expired+counts.skipped_bad_quote+
        counts.skipped_source_changed===counts.all_offer_rows,
        'Quote eligibility accounting inconsistent');
  // Preview must never quietly change electrical model specifications.
  for(let i=0;i<live.products.length;i++){
    const exclude=row=>{const x=JSON.parse(JSON.stringify(row));
      for(const p of ['price_czk','availability','verified_at'])delete x[p];
      if(Array.isArray(x.offers))for(const o of x.offers){
        delete o.price_czk;delete o.availability;delete o.verified_at;
      }
      return x;};
    guard(JSON.stringify(exclude(patch.products[i]))===
          JSON.stringify(exclude(live.products[i])),
          'Technical/identity data changed during quote-only preview');
  }
  return {
    summary:{schema_version:1,mode:'public_quote_only_overlay_preview',
      source_revision:DEV_PIN,site:SITE,
      current_catalog_sha256:sha256(bytes(live)),
      preview_catalog_sha256:sha256(bytes(patch)),
      counts,exceptions:exceptions.sort(),
      active_theme_modified:false,wordpress_writes:0,
      merchant_requests:0,affiliate_clicks:0,
      release_authorized:false,
      limitation:'Candidate only. Dated source quotes require independent current retailer evidence. Old frontend compatibility, full WordPress price health, upload/rollback and JS runtime behavior are NOT verified. No production asset or theme modified.'},
    catalog:patch
  };
}
export async function readPublicCatalog(fetcher=fetch){
  const response=await fetcher(PUBLIC_URL,{
    method:'GET',redirect:'manual',signal:AbortSignal.timeout(25000),
    headers:{'Cache-Control':'no-cache','User-Agent':'SolarCatalogOverlay-ReadOnly/1.0'}
  });
  guard(response.status===200&&!response.redirected&&
        response.url.split('?')[0]===PUBLIC_URL,'Public catalog status/identity failed');
  const reader=response.body?.getReader();
  guard(reader,'Public catalog body unavailable');
  const chunks=[];
  let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;guard(size<=MAX_BYTES,'Public catalog too large');chunks.push(value);
    }
  }finally{reader.releaseLock();}
  guard(size>0,'Public catalog empty');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function pinnedDevCatalog(){
  const raw=execFileSync('git',['show',DEV_PIN+':assets/data/product-seed.json'],
    {maxBuffer:MAX_BYTES,stdio:['ignore','pipe','ignore']});
  return JSON.parse(raw.toString('utf8'));
}
export async function run({output='artifacts/solar-catalog-quote-overlay-preview.json'}={}){
  const result=previewOverlay(await readPublicCatalog(),pinnedDevCatalog());
  mkdirSync('artifacts',{recursive:true});
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  const c=result.summary.counts;
  console.log('SOLAR_QUOTE_OVERLAY status=preview_only matched='+c.exact_seller_matches+
    ' eligible='+c.eligible+' unresolved='+c.skipped_unresolved_sku+
    ' source_changed='+c.skipped_source_changed+
    ' release_authorized=false wordpress_writes=0 affiliate_clicks=0');
  return result;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
  try{await run();}
  catch(e){console.error('SOLAR_QUOTE_OVERLAY blocked='+e.message+
    ' release_authorized=false writes=0');process.exitCode=2;}
}
