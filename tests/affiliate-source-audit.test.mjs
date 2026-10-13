import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditCatalog,catalogSources,inspectCatalogSource,statusClass,summaryMarkdown,validateMerchantSource} from '../tools/affiliate-source-audit.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../data/product-seed.json',import.meta.url),'utf8'));
const deployedCatalog=JSON.parse(fs.readFileSync(new URL('../assets/data/product-seed.json',import.meta.url),'utf8'));
assert.deepEqual(deployedCatalog,catalog,'Audit source must stay identical to the actually served product catalog');
const offered=catalogSources(catalog);
const sumOffers=catalog.products.reduce((n,p)=>n+(p.offers?.length||1),0)+
  catalog.bundle_deals.reduce((n,p)=>n+(p.offers?.length||1),0);

test('catalog inventories every verified shop offer including bundle deals, never affiliate redirects',()=>{
  assert.equal(catalog.products.length,24);
  assert.equal(sumOffers,49);
  assert.equal(offered.length,49,'Do not silently drop offer-level retailer URLs');
  assert.equal(new Set(offered.map(x=>x.merchant+'|'+x.source_url)).size,offered.length);
  assert(offered.every(x=>validateMerchantSource(x.merchant,x.source_url).ok));
  assert(offered.some(x=>x.bundles.length));
  assert(!offered.some(x=>/ehub\.cz|click\.php|desturl/i.test(x.source_url)),
    'Do not send HTTP audits through affiliate click URLs or simulate sales attribution');
});

test('merchant allowlist forbids unknown hosts, tracking destinations, plain http and credentials',()=>{
  assert(validateMerchantSource('battery-cz','https://www.battery.cz/sample/').ok);
  assert(!validateMerchantSource('battery-cz','https://www.solar-import.cz/sample/').ok);
  assert(!validateMerchantSource('battery-cz','https://battery.cz.attacker.test/').ok);
  assert(!validateMerchantSource('other','https://battery.cz/sample/').ok);
  assert(!validateMerchantSource('battery-cz','http://battery.cz/sample/').ok);
  assert(!validateMerchantSource('battery-cz','https://battery.cz/?desturl=https://attacker.com').ok);
  assert(!validateMerchantSource('battery-cz','https://name:password@battery.cz/sample/').ok);
  assert(!validateMerchantSource('battery-cz','/relative/path').ok);
});

const item={merchant:'battery-cz',source_url:'https://www.battery.cz/product/',products:['p1'],bundles:[]};
function fakeResponse(status,location='') {
  return {status,headers:{get(name){return name==='location'?location:'';}},
    body:{cancel(){return Promise.resolve();}}};
}
function fixture(routes) {
  const seen=[];
  const fetchImpl=async(url,opts)=>{
    seen.push({url,method:opts.method,redirect:opts.redirect});
    const found=routes.get(opts.method+' '+url);
    if(found instanceof Error)throw found;
    if(!found)throw Error('Mock fixture has no defined HTTP response '+opts.method+' '+url);
    return found;
  };
  return {seen,fetchImpl};
}
test('reaches published HTTPS destination; may not infer stock or current prices',async()=>{
  const f=fixture(new Map([['HEAD '+item.source_url,fakeResponse(200)]]));
  const result=await inspectCatalogSource(item,f.fetchImpl);
  assert.equal(result.state,'reachable_http');
  assert.equal(result.http_status,200);
  assert.equal(result.detail,'head');
  assert.equal(f.seen.length,1);
  assert.equal(f.seen[0].redirect,'manual');
});
test('HEAD 404 is checked with GET before marking truly not found',async()=>{
  const f=fixture(new Map([
    ['HEAD '+item.source_url,fakeResponse(404)],
    ['GET '+item.source_url,fakeResponse(200)],
  ]));
  assert.equal((await inspectCatalogSource(item,f.fetchImpl)).state,'reachable_http');
  assert.equal(f.seen[1].method,'GET');
});
test('confirmed GET 404/410 is manual-review, not automatically deleted',async()=>{
  const f=fixture(new Map([
    ['HEAD '+item.source_url,fakeResponse(404)],
    ['GET '+item.source_url,fakeResponse(410)],
  ]));
  assert.equal((await inspectCatalogSource(item,f.fetchImpl)).state,'not_found');
  assert.equal(statusClass(404),'not_found');
});
test('HEAD blocked while GET accessible is not a false-positive dead link',async()=>{
  const f=fixture(new Map([
    ['HEAD '+item.source_url,fakeResponse(403)],
    ['GET '+item.source_url,fakeResponse(200)],
  ]));
  assert.equal((await inspectCatalogSource(item,f.fetchImpl)).state,'reachable_http');
});
test('storefront 429 stays inconclusive even after GET',async()=>{
  const f=fixture(new Map([
    ['HEAD '+item.source_url,fakeResponse(429)],
    ['GET '+item.source_url,fakeResponse(429)],
  ]));
  assert.equal((await inspectCatalogSource(item,f.fetchImpl)).state,'blocked_or_rate_limited');
});
test('follows only approved same-merchant redirects and caps redirect chains',async()=>{
  const next='https://battery.cz/new-product/';
  const f=fixture(new Map([
    ['HEAD '+item.source_url,fakeResponse(301,next)],
    ['HEAD '+next,fakeResponse(200)],
  ]));
  assert.equal((await inspectCatalogSource(item,f.fetchImpl)).state,'reachable_http');
  assert.equal(f.seen.length,2);

  const cross=fixture(new Map([['HEAD '+item.source_url,fakeResponse(302,'https://ehub.cz/click.php')]]));
  assert.equal((await inspectCatalogSource(item,cross.fetchImpl)).state,'redirect_review');
  assert.equal(cross.seen.length,1,'Never request external redirected domain');
});
test('network failures never become fake permanent 404 or dropped offer',async()=>{
  const f=fixture(new Map([['HEAD '+item.source_url,new Error('network_failed')]]));
  assert.equal((await inspectCatalogSource(item,f.fetchImpl)).state,'network_inconclusive');
});
test('complete audit remains readable with no network, no merchant writes',async()=>{
  const tiny={verifiedAt:'2026-10-07',products:[{
    id:'p1',offers:[{merchant:'battery-cz',source_url:item.source_url}],
  }],bundle_deals:[]};
  const f=fixture(new Map([['HEAD '+item.source_url,fakeResponse(200)]]));
  const report=await auditCatalog(tiny,f.fetchImpl);
  assert.equal(report.unique_source_urls,1);
  assert.equal(report.counts.reachable_http,1);
  assert.equal(report.action_needed,0);
  assert.match(summaryMarkdown(report),/non-affiliate source URL/);
  assert.match(summaryMarkdown(report),/not proof of product identity/i);
});
