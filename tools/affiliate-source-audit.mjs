import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const allowedHosts=new Map([
  ['battery-cz',new Set(['battery.cz','www.battery.cz'])],
  ['solar-import-cz',new Set(['solar-import.cz','www.solar-import.cz'])],
]);
const anomalyStates=new Set(['not_found','blocked_or_rate_limited','server_error','network_inconclusive','unsafe_target','redirect_review','other_status']);

export function validateMerchantSource(merchant,sourceUrl) {
  try {
    const url=new URL(String(sourceUrl||''));
    const hosts=allowedHosts.get(merchant);
    if(!hosts || url.protocol!=='https:' || !hosts.has(url.hostname.toLowerCase())
       || url.username || url.password || url.searchParams.has('desturl')) {
      return {ok:false,reason:'unapproved_domain_or_scheme'};
    }
    return {ok:true,url:url.toString()};
  } catch(_) {
    return {ok:false,reason:'invalid_absolute_https_url'};
  }
}

export function catalogSources(catalog) {
  if(!catalog || !Array.isArray(catalog.products) || !Array.isArray(catalog.bundle_deals)) {
    throw new Error('Catalog must contain products and bundle_deals arrays');
  }
  const byKey=new Map();
  for(const [kind,rows] of [['product',catalog.products],['bundle',catalog.bundle_deals]]) {
    for(const row of rows) {
      if(!row || typeof row.id!=='string' || !row.id) throw new Error('Catalog row missing an ID');
      // A discontinued seed item can have no real published shop offer.
      // Do not fabricate a fallback audit URL for such a withdrawn SKU.
      const explicit=Array.isArray(row.offers)&&row.offers.length;
      if(!explicit && ['discontinued','unavailable'].includes(row.availability)) continue;
      const offers=explicit?row.offers:[{
        merchant:row.merchant,source_url:row.source_url,
        availability:row.availability,verified_at:row.verified_at
      }];
      for(const offer of offers) {
        if(!offer || !offer.merchant) throw new Error('Catalog offer lacks merchant: '+row.id);
        const sourceUrl=offer.source_url || row.source_url || '';
        const key=offer.merchant+'|'+sourceUrl;
        const item=byKey.get(key)||{
          merchant:offer.merchant,source_url:sourceUrl,products:[],bundles:[],
          latest_verified_at:offer.verified_at||row.verified_at||null,
        };
        const owners=kind==='product'?item.products:item.bundles;
        if(!owners.includes(row.id)) owners.push(row.id);
        byKey.set(key,item);
      }
    }
  }
  return [...byKey.values()].sort((a,b)=>a.merchant.localeCompare(b.merchant)
      || a.source_url.localeCompare(b.source_url));
}

export function statusClass(status) {
  if(status>=200 && status<300) return 'reachable_http';
  if(status===404 || status===410) return 'not_found';
  if(status===401 || status===403 || status===429) return 'blocked_or_rate_limited';
  if(status>=500 && status<=599) return 'server_error';
  if(status>=300 && status<400) return 'redirect_review';
  return 'other_status';
}

export async function inspectCatalogSource(item,fetchImpl=fetch,timeoutMs=12000) {
  const legal=validateMerchantSource(item.merchant,item.source_url);
  if(!legal.ok) return {...item,state:'unsafe_target',detail:legal.reason,http_status:null,checked_url:item.source_url};
  let current=legal.url;
  for(let hop=0;hop<4;hop++) {
    let response=null;
    let method='HEAD';
    try {
      response=await fetchImpl(current,{
        method,redirect:'manual',signal:AbortSignal.timeout(timeoutMs),
        headers:{'User-Agent':'SolarExpertCatalogAudit/1.0 (+https://solar-expert.cz/; link availability only)','Accept':'text/html,application/xhtml+xml'},
      });
      // Some stores do not implement HEAD. A GET fallback avoids false 404 or
      // bot-blocker alerts; do not download/parse a product's full page.
      if([400,401,403,404,405,410,429,501].includes(response.status)) {
        response.body?.cancel?.().catch?.(()=>{});
        method='GET';
        response=await fetchImpl(current,{
          method,redirect:'manual',signal:AbortSignal.timeout(timeoutMs),
          headers:{'User-Agent':'SolarExpertCatalogAudit/1.0 (+https://solar-expert.cz/; link availability only)','Accept':'text/html,application/xhtml+xml'},
        });
      }
      const status=response.status;
      const location=response.headers?.get?.('location')||'';
      response.body?.cancel?.().catch?.(()=>{});
      if(status>=300 && status<400) {
        if(!location) return {...item,state:'redirect_review',detail:'redirect_without_location',http_status:status,checked_url:current};
        const next=new URL(location,current).toString();
        const same=validateMerchantSource(item.merchant,next);
        if(!same.ok) return {...item,state:'redirect_review',detail:'redirect_to_unapproved_domain',http_status:status,checked_url:current};
        current=same.url;
        continue;
      }
      return {...item,state:statusClass(status),detail:method==='GET'?'get_fallback':'head',http_status:status,checked_url:current};
    } catch(error) {
      return {...item,state:'network_inconclusive',detail:error?.name==='TimeoutError'?'timeout':String(error?.name||'network_error').slice(0,60),http_status:null,checked_url:current};
    }
  }
  return {...item,state:'redirect_review',detail:'too_many_redirects',http_status:null,checked_url:current};
}

export async function auditCatalog(catalog,fetchImpl=fetch,concurrency=3) {
  const list=catalogSources(catalog);
  const results=new Array(list.length);
  let next=0;
  async function worker() {
    for(;;) {
      const i=next++;
      if(i>=list.length)break;
      results[i]=await inspectCatalogSource(list[i],fetchImpl);
    }
  }
  await Promise.all(Array.from({length:Math.min(Math.max(1,concurrency),5,list.length)},worker));
  const counts={};
  for(const row of results) counts[row.state]=(counts[row.state]||0)+1;
  return {
    checked_at_utc:new Date().toISOString(),
    inventory_verification_date:catalog.verifiedAt||null,
    semantics:'Source URL HTTP check only; no checkout clicks, product identity, stock, current prices or affiliate conversion verification.',
    unique_source_urls:results.length,
    counts,
    action_needed:results.filter(r=>r.state==='not_found'||r.state==='unsafe_target').length,
    inconclusive:results.filter(r=>anomalyStates.has(r.state)&&r.state!=='not_found'&&r.state!=='unsafe_target').length,
    results,
  };
}

export function summaryMarkdown(report) {
  const states=Object.entries(report.counts).sort((a,b)=>a[0].localeCompare(b[0]));
  const lines=[
    '## Solar Expert — catalogue source-link audit',
    '',
    'Checked at UTC: '+report.checked_at_utc,
    'Source URL count: **'+report.unique_source_urls+'**; potential broken/unsafe: **'+report.action_needed+'**; access-limited/inconclusive: **'+report.inconclusive+'**.',
    '',
    '| Outcome | URL count |','|---|---:|',
    ...states.map(([k,v])=>'| '+k+' | '+v+' |'),
    '',
    '> This is a **non-affiliate source URL** HTTP probe, not proof of product identity, availability, current price, merchant tracking or Google indexing. 403/429, timeouts and 5xx are inconclusive until manually checked. It never changes customer-visible offers.',
  ];
  const anomalies=report.results.filter(r=>anomalyStates.has(r.state));
  if(anomalies.length) {
    lines.push('','### URLs for manual review','',
      '| Outcome | Merchant | Product(s) / bundle | Source URL |','|---|---|---|---|',
      ...anomalies.slice(0,60).map(r=>'| '+r.state+' (HTTP '+(r.http_status??'?')+') | '+r.merchant+
       ' | '+[...r.products,...r.bundles].join(', ')+' | '+r.source_url.replaceAll('|','%7C')+' |'));
  }
  return lines.join('\n')+'\n';
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const filename=process.argv[2]||path.join(root,'data/product-seed.json');
    const catalog=JSON.parse(fs.readFileSync(filename,'utf8'));
    const report=await auditCatalog(catalog,fetch,3);
    fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
    fs.writeFileSync(path.join(root,'artifacts/affiliate-source-audit.json'),JSON.stringify(report,null,2)+'\n');
    const md=summaryMarkdown(report);
    process.stdout.write(md);
    if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
    if(report.action_needed) process.stdout.write('Review URLs with confirmed HTTP 404/410 or invalid source domains before changing any catalog item.\n');
    // Status remains successful: a third-party 403/429/404 must not crash
    // release/deploy or cause auto-removal of approved affiliate links.
  } catch(err) {
    console.error('Invalid catalogue or audit runtime:',err?.message||err);
    process.exitCode=1;
  }
}
