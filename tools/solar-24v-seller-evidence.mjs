#!/usr/bin/env node
/**
 * Solar Expert: recurring read-only exact retailer quote evidence for the
 * four products in the already-live 24V example. Merchant-owned URLs only.
 *
 * No WordPress write, no affiliate/eHub navigation, no automatic verified_at
 * refresh, no scraping unrelated pages. Accept a quote ONLY if the current
 * same-page Product JSON-LD proves exact SKU, CZK price and availability.
 * Unknown, blocked and changed-price states are explicit, not "in stock".
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const SITE='https://solar-expert.cz';
export const REST=SITE+'/wp-json/solar-quote-overlay/v2/catalog';
export const OUTPUT='artifacts/solar-24v-retailer-evidence.json';
export const TARGETS=Object.freeze([
  {id:'battery-goowei-24-100',sku:'E8286',merchant:'battery-cz',host:'www.battery.cz',qty:1},
  {id:'inverter-victron-24-1200',sku:'E7540',merchant:'battery-cz',host:'www.battery.cz',qty:1},
  {id:'mppt-victron-100-30',sku:'E7358',merchant:'battery-cz',host:'www.battery.cz',qty:1},
  {id:'panel-victron-190',sku:'E8934',merchant:'solar-import-cz',host:'www.solar-import.cz',qty:4}
]);
const MAX_BYTES=2_000_000;
const MAX_CATALOG=650_000;
const VALID_AVAIL=new Map([
  ['InStock','in_stock'],['OutOfStock','out_of_stock'],
  ['LimitedAvailability','limited'],['BackOrder','backorder'],
  ['PreOrder','preorder'],['Discontinued','discontinued']
]);

function insist(ok,code){if(!ok)throw new Error(code);}
function safeSource(url,host){
  insist(typeof url==='string'&&url.length<500,'invalid_source');
  const u=new URL(url);
  insist(u.protocol==='https:'&&u.hostname===host&&
    !u.username&&!u.password&&!u.port&&
    !u.search&&!u.hash&&u.pathname.length>10,
    'untrusted_source_url');
  return u.toString();
}
async function limitedText(response,maxBytes){
  const chunks=[];let total=0;
  insist(response.body&&typeof response.body.getReader==='function','missing_http_body');
  const reader=response.body.getReader();
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      insist(total<=maxBytes,'response_over_size_limit');
      chunks.push(Buffer.from(value));
    }
  }finally{reader.releaseLock()}
  return Buffer.concat(chunks,total).toString('utf8');
}
export function parseProductJsonLd(html){
  insist(typeof html==='string','invalid_html');
  const blocks=[];
  const re=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;let seen=0;
  while((match=re.exec(html))!==null&&++seen<150){
    if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(match[1]))continue;
    if(match[2].length>250000)continue;
    try{blocks.push(JSON.parse(match[2].trim()))}catch{}
  }
  const products=[];const stack=[...blocks];let visited=0;
  while(stack.length&&visited++<350){
    const n=stack.pop();
    if(Array.isArray(n)){stack.push(...n.slice(0,120));continue}
    if(!n||typeof n!=='object')continue;
    if(String(n['@type']||'').split('/').includes('Product') ||
       (Array.isArray(n['@type'])&&n['@type'].includes('Product'))){
      products.push(n);
    }
    for(const key of ['@graph','mainEntity','itemListElement']){
      if(n[key])stack.push(n[key]);
    }
  }
  return products;
}
function numericPrice(value){
  if(typeof value==='number')return Number.isFinite(value)&&value>0&&value<250000?value:null;
  if(typeof value!=='string'||!/^\d{1,6}(?:\.\d{1,2})?$/.test(value.trim()))return null;
  const n=Number(value.trim());
  return n>0&&n<250000?n:null;
}
export function qualifySchema(html,sku){
  const products=parseProductJsonLd(html).filter(p=>
    String(p.sku||p.productID||'').trim()===sku);
  if(products.length===0)return {status:'identity_not_proven'};
  const candidates=[];
  for(const product of products){
    const offers=Array.isArray(product.offers)?product.offers:[product.offers];
    for(const o of offers){
      if(!o||typeof o!=='object')continue;
      const price=numericPrice(o.price??o.priceSpecification?.price);
      const currency=o.priceCurrency??o.priceSpecification?.priceCurrency;
      const label=String(o.availability||'').split('/').pop();
      if(!price||currency!=='CZK'||!VALID_AVAIL.has(label))continue;
      candidates.push({price_czk:price,availability:VALID_AVAIL.get(label)});
    }
  }
  if(!candidates.length)return {status:'exact_sku_no_complete_structured_quote'};
  const keys=new Set(candidates.map(x=>x.price_czk+'|'+x.availability));
  if(keys.size!==1)return {status:'ambiguous_same_sku_quotes'};
  return {status:'verified_source_quote',...candidates[0]};
}
async function fetchPage(fetcher,url,accept,maxBytes){
  const ctrl=new AbortController();
  const cancel=setTimeout(()=>ctrl.abort(),20000);
  try{
    const r=await fetcher(url,{method:'GET',redirect:'manual',
      signal:ctrl.signal,headers:{
        Accept:accept,'Cache-Control':'no-cache',
        'User-Agent':'SolarExpert-Seller-Evidence-ReadOnly/1.0'}});
    insist(r.status===200&&r.url===url&&!r.redirected,'source_http_not_exact_200');
    const type=r.headers.get('content-type')||'';
    insist(type.includes(accept.includes('json')?'application/json':'text/html'),
      'unexpected_content_type');
    return await limitedText(r,maxBytes);
  }finally{clearTimeout(cancel)}
}
export async function capture(fetcher=fetch,now=new Date()){
  const stamp=now.toISOString();
  const rest=JSON.parse(await fetchPage(fetcher,REST,'application/json',MAX_CATALOG));
  insist(Array.isArray(rest.products)&&rest.products.length===24,
    'live_rest_product_cohort_changed');
  const products=new Map(rest.products.map(x=>[x.id,x]));
  insist(products.size===24,'duplicate_rest_product');
  const results=[];
  for(const target of TARGETS){
    const product=products.get(target.id);
    insist(product&&product.sku===target.sku,'live_sku_changed_'+target.id);
    const offers=Array.isArray(product.offers)?product.offers:[];
    const matches=offers.filter(o=>o.merchant===target.merchant);
    insist(matches.length===1,'selected_seller_row_not_unique_'+target.id);
    const offer=matches[0];
    const url=safeSource(offer.source_url,target.host);
    const current={id:target.id,sku:target.sku,merchant:target.merchant,
      qty:target.qty,source_host:target.host,
      catalog_price_czk:Number(offer.price_czk)||null,
      catalog_availability:offer.availability||null,
      catalog_verified_at:offer.verified_at||null};
    try{
      const page=await fetchPage(fetcher,url,'text/html',MAX_BYTES);
      const parsed=qualifySchema(page,target.sku);
      const ok=parsed.status==='verified_source_quote';
      const same=ok&&parsed.price_czk===current.catalog_price_czk&&
         parsed.availability===current.catalog_availability;
      results.push({...current,
        observation_status:ok?(same?'same_quote':'quote_changed'):parsed.status,
        observed_price_czk:ok?parsed.price_czk:null,
        observed_availability:ok?parsed.availability:null,
        observed_at_utc:ok?stamp:null,
        evidence_type:ok?'same_page_exact_sku_product_jsonld':null});
    }catch(e){
      results.push({...current,observation_status:'fetch_unverified',
        observed_price_czk:null,observed_availability:null,
        observed_at_utc:null,
        blocked_reason:String(e.message||'unknown').slice(0,60)});
    }
    // polite rate limit; four merchant-owned product GETs only.
    await new Promise(resolve=>setTimeout(resolve,600));
  }
  const verified=results.filter(x=>['same_quote','quote_changed'].includes(x.observation_status));
  const changed=results.filter(x=>x.observation_status==='quote_changed');
  return {schema_version:1,mode:'exact_4_retailer_merchant_get_only',
    site:SITE,observed_run_at_utc:stamp,
    protected_live_rest_products:24,
    selected_source_product_count:4,
    observed_verified:verified.length,observed_changed:changed.length,
    observed_unknown:results.length-verified.length,
    wordpress_writes:0,affiliate_network_gets:0,
    merchant_product_gets:4,merchant_clicks:0,
    automatic_catalog_date_refresh:false,
    seller_attribution_method:'sku+same_page_product_schema_offer_price_currency_stock',
    rows:results};
}
export async function main(){
  let report;
  try{
    report=await capture();
  }catch(e){
    report={schema_version:1,status:'blocked_no_write',
      reason:String(e.message||'unknown').slice(0,100),
      wordpress_writes:0,merchant_clicks:0,
      affiliate_network_gets:0,automatic_catalog_date_refresh:false};
  }
  mkdirSync('artifacts',{recursive:true});
  writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.log('SOLAR_24V_SELLER_EVIDENCE status='+
    (report.status||'captured')+
    ' verified='+String(report.observed_verified??0)+'/4'+
    ' changed='+String(report.observed_changed??0)+
    ' unknown='+String(report.observed_unknown??4)+
    ' wordpress_writes=0 affiliate_clicks=0');
  for(const x of report.rows||[]){
    console.log('SOLAR_24V_SELLER product='+x.id+
      ' merchant='+x.merchant+
      ' status='+x.observation_status+
      ' observed_price='+(x.observed_price_czk??'unknown')+
      ' stock='+(x.observed_availability??'unknown'));
  }
  if(report.status==='blocked_no_write')process.exitCode=2;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();
