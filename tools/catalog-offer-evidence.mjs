import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {catalogSources,validateMerchantSource} from './affiliate-source-audit.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MAX_HTML_BYTES=2_000_000;
const MAX_REDIRECTS=3;
const TIMEOUT_MS=15_000;

function property(tag,name) {
  const match=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\'])(.*?)\\1','i'));
  return match?.[2]||'';
}

function microdata(html,name,element='meta') {
  const regex=new RegExp('<'+element+'\\b[^>]*\\bitemprop\\s*=\\s*(["\'])'+name+'\\1[^>]*>','i');
  const tag=html.match(regex)?.[0]||'';
  return property(tag,element==='link'?'href':'content');
}

function primaryAvailability(html) {
  const tag=html.match(/<span\b[^>]*\bdata-testid\s*=\s*(["'])labelAvailability\1[^>]*>([\s\S]{0,700}?)<\/span>/i);
  return (tag?.[2]||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
    .replace(/\s+/g,' ').trim().slice(0,160);
}

export function availabilityFromLabel(label) {
  const normalized=String(label||'').trim().toLocaleLowerCase('cs-CZ');
  if(/^na dotaz\b|^vyprod[aá]no\b|^nen[ií] skladem\b|^nedostupn[eé]\b/.test(normalized)) return 'on_request';
  if(/^obvykle skladem\b|^skladem u dodavatele\b/.test(normalized)) return 'usually_in_stock';
  if(/^skladem\b/.test(normalized) && !/expedice do|u dodavatele|na objedn[aá]vku/.test(normalized)) return 'in_stock';
  return null;
}

export function extractOfferEvidence(html) {
  const text=String(html||'');
  const sku=microdata(text,'sku');
  const rawPrice=microdata(text,'price');
  const currency=microdata(text,'priceCurrency');
  const schemaUrl=microdata(text,'availability','link');
  const schemaValue=schemaUrl.match(/schema\.org\/(InStock|OutOfStock|PreOrder|LimitedAvailability)(?:\b|\/|$)/i)?.[1]||null;
  const label=primaryAvailability(text);
  const stock=availabilityFromLabel(label);
  const price=/^\d+(?:\.\d{1,2})?$/.test(rawPrice)?Number(rawPrice):null;
  const normalizedSchema=schemaValue?.toLowerCase()||'';
  const schemaConflict=!!stock && (
    (stock==='in_stock' && ['outofstock','preorder'].includes(normalizedSchema)) ||
    (stock==='on_request' && normalizedSchema==='instock')
  );
  return {sku:sku||null,price_czk:currency==='CZK'&&Number.isFinite(price)&&price>0?price:null,
    currency:currency||null,availability_label:label||null,availability:stock,
    schema_availability:schemaValue,schema_conflict:schemaConflict};
}

export function expectedSources(catalog) {
  const links=catalogSources(catalog);
  const expected=new Map();
  for(const rows of [catalog.products,catalog.bundle_deals]) {
    for(const row of rows) {
      const list=Array.isArray(row.offers)&&row.offers.length?row.offers:
        ['discontinued','unavailable'].includes(row.availability)?[]:[row];
      for(const offer of list) {
        const url=offer.source_url||row.source_url||'';
        const key=offer.merchant+'|'+url;
        const e={id:row.id,sku:row.sku||null,merchant:offer.merchant,
          source_url:url,price_czk:Number(offer.price_czk??row.price_czk),
          availability:offer.availability||row.availability,
          verified_at:offer.verified_at||row.verified_at||null};
        if(!expected.has(key))expected.set(key,[]);
        expected.get(key).push(e);
      }
    }
  }
  return links.map(link=>({...link,expected:expected.get(link.merchant+'|'+link.source_url)||[]}));
}

async function cappedHtml(response) {
  if(!response.body?.getReader) {
    const html=await response.text();
    return html.length>MAX_HTML_BYTES?null:html;
  }
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  const chunks=[];
  let size=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();
      if(done) break;
      size+=value.byteLength;
      if(size>MAX_HTML_BYTES) return null;
      chunks.push(decoder.decode(value,{stream:true}));
    }
    chunks.push(decoder.decode());
  } finally {
    try {await reader.cancel();}catch(_){}
  }
  return chunks.join('');
}

export async function inspectOfferEvidence(source,fetchImpl=fetch,timeoutMs=TIMEOUT_MS) {
  const legal=validateMerchantSource(source.merchant,source.source_url);
  if(!legal.ok) return {...source,state:'inconclusive',reason:'unsafe_target:'+legal.reason};
  let url=legal.url;
  for(let hop=0;hop<=MAX_REDIRECTS;hop++) {
    let response;
    try {
      response=await fetchImpl(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(timeoutMs),
        headers:{'User-Agent':'SolarExpertSourceEvidence/1.0 (+https://solar-expert.cz/; read-only SKU, price and stock)',
          'Accept':'text/html,application/xhtml+xml'}});
    } catch(error) {
      return {...source,state:'inconclusive',reason:error?.name==='TimeoutError'?'timeout':'network_error'};
    }
    if(response.status>=300&&response.status<400) {
      const location=response.headers?.get?.('location')||'';
      try {await response.body?.cancel?.();}catch(_){}
      if(!location)return {...source,state:'inconclusive',reason:'redirect_without_location',http_status:response.status};
      const destination=validateMerchantSource(source.merchant,new URL(location,url).toString());
      if(!destination.ok)return {...source,state:'inconclusive',reason:'redirect_to_unapproved_target',http_status:response.status};
      url=destination.url;
      continue;
    }
    if(response.status!==200) {
      try {await response.body?.cancel?.();}catch(_){}
      return {...source,state:'inconclusive',reason:'http_'+response.status,http_status:response.status};
    }
    const contentType=response.headers?.get?.('content-type')||'';
    if(contentType && !/html/i.test(contentType)) {
      try {await response.body?.cancel?.();}catch(_){}
      return {...source,state:'inconclusive',reason:'non_html_response',http_status:200};
    }
    let html;
    try {html=await cappedHtml(response);}catch(_) {return {...source,state:'inconclusive',reason:'invalid_or_incomplete_html',http_status:200};}
    if(html===null)return {...source,state:'inconclusive',reason:'html_too_large',http_status:200};
    const evidence=extractOfferEvidence(html);
    const expectedSku=source.expected?.[0]?.sku||null;
    // A source URL alone cannot prove a product's identity. If a shop's
    // SKU differs (or is hidden), never turn its price into a verified quote.
    if(!evidence.sku||!expectedSku) return {...source,state:'inconclusive',reason:'sku_identity_unverified',http_status:200,evidence};
    if(evidence.sku!==expectedSku)return {...source,state:'inconclusive',reason:'sku_identity_mismatch',http_status:200,evidence};
    if(evidence.schema_conflict)return {...source,state:'inconclusive',reason:'visible_stock_schema_conflict',http_status:200,evidence};
    if(evidence.price_czk===null||!evidence.availability)return {...source,state:'inconclusive',reason:'price_or_visible_stock_missing',http_status:200,evidence};
    const changes=(source.expected||[]).flatMap(e=>[
      ...(e.price_czk===evidence.price_czk?[]:[{id:e.id,field:'price_czk',recorded:e.price_czk,observed:evidence.price_czk}]),
      ...(e.availability===evidence.availability?[]:[{id:e.id,field:'availability',recorded:e.availability,observed:evidence.availability}]),
    ]);
    return {...source,state:changes.length?'drift':'matched',reason:changes.length?'seller_evidence_changed':'exact_seller_evidence',
      http_status:200,checked_url:url,evidence,changes};
  }
  return {...source,state:'inconclusive',reason:'redirect_limit'};
}

export async function auditOfferEvidence(catalog,fetchImpl=fetch,concurrency=3) {
  const items=expectedSources(catalog);
  const rows=new Array(items.length);
  let next=0;
  async function worker() {
    for(;;) {
      const index=next++;
      if(index>=items.length) return;
      rows[index]=await inspectOfferEvidence(items[index],fetchImpl);
    }
  }
  await Promise.all(Array.from({length:Math.min(Math.max(1,concurrency),4,items.length)},worker));
  const counts={matched:0,drift:0,inconclusive:0};
  for(const row of rows) counts[row.state]++;
  return {checked_at_utc:new Date().toISOString(),semantics:'Exact SKU and public merchant-page evidence only; no affiliate clicks, catalog mutation, checkout or commission inference.',
    source_count:items.length,counts,results:rows};
}

export function summaryMarkdown(report) {
  const lines=['## Solar Expert — merchant price and stock evidence', '',
    'Checked (UTC): '+report.checked_at_utc,
    `Exact merchant URLs: **${report.source_count}**; matched: **${report.counts.matched}**; price/availability drift: **${report.counts.drift}**; inconclusive: **${report.counts.inconclusive}**.`,
    '', '> Read-only evidence: no affiliate redirects, synthetic clicks, auto-repricing, merchant edits or proof of conversions. Missing/CAPTCHA sources are unknown, not sold out.'];
  const review=report.results.filter(row=>row.state!=='matched');
  if(review.length) {
    lines.push('','### Manual re-verification queue','',
      '| State | Product / merchant | Reason or difference | Exact source |','|---|---|---|---|',
      ...review.map(row=>'| '+row.state+' | '+[...row.products,...row.bundles].join(', ')+' / '+row.merchant+
        ' | '+(row.changes?.map(x=>x.field+': '+x.recorded+' → '+x.observed).join('; ')||row.reason)+
        ' | '+row.source_url.replaceAll('|','%7C')+' |'));
  }
  return lines.join('\n')+'\n';
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const catalog=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,'data/product-seed.json'),'utf8'));
    const report=await auditOfferEvidence(catalog);
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
    fs.writeFileSync(path.join(root,'artifacts/catalog-offer-evidence.json'),JSON.stringify(report,null,2)+'\n');
    const summary=summaryMarkdown(report);
    process.stdout.write(summary);
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
  } catch(error) {
    console.error('Merchant evidence audit cannot start:',error?.message||error);
    process.exitCode=1;
  }
}
