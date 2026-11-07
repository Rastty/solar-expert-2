import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
globalThis.window={SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}}};
require('../assets/js/affiliate-adapter.js');
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
const M=window.SolarExpertProductMatcher;
const A=window.SolarExpertAffiliate;
const B=window.SolarExpertBundleComposer;
const raw=readFileSync('data/product-seed.json','utf8');
const runtime=readFileSync('assets/data/product-seed.json','utf8');
const catalog=JSON.parse(raw);
const AUDIT_DAY='2026-11-07';
const checked=[
 ['battery-goowei-12-100','battery-cz',8650,'in_stock'],
 ['battery-goowei-12-100','solar-import-cz',8650,'in_stock'],
 ['battery-goowei-24-100','battery-cz',14690,'in_stock'],
 ['battery-goowei-24-100','solar-import-cz',14690,'in_stock'],
 ['battery-seplos-pusung-48','battery-cz',20990,'in_stock'],
 ['battery-seplos-pusung-48','solar-import-cz',21834,'in_stock'],
 ['mppt-victron-100-30','battery-cz',2984,'in_stock'],
 ['mppt-victron-100-30','solar-import-cz',2995,'in_stock'],
 ['inverter-growatt-48-3500','battery-cz',11990,'in_stock'],
 ['inverter-growatt-48-3500','solar-import-cz',11990,'in_stock'],
 ['battery-goowei-12-200','battery-cz',14690,'on_request'],
 ['battery-goowei-12-200','solar-import-cz',14690,'on_request'],
 ['battery-goowei-24-50','battery-cz',8650,'in_stock'],
 ['battery-goowei-24-50','solar-import-cz',8650,'in_stock'],
 ['mppt-victron-100-20','battery-cz',2091,'in_stock'],
 ['mppt-victron-100-20','solar-import-cz',2098,'in_stock'],
 ['panel-victron-190','battery-cz',2496,'in_stock'],
 ['panel-victron-190','solar-import-cz',2251,'in_stock'],
 ['inverter-victron-24-1200','battery-cz',7431,'in_stock'],
 ['inverter-victron-24-1200','solar-import-cz',7431,'in_stock'],
 ['battery-pylontech-us5000','battery-cz',22900,'in_stock'],
 ['inverter-rogerele-rep2000-24','battery-cz',4990,'in_stock'],
 ['inverter-rogerele-rep2000-24','solar-import-cz',4990,'in_stock'],
 ['inverter-growatt-48-6000','battery-cz',13490,'in_stock'],
 ['inverter-growatt-48-6000','solar-import-cz',13490,'in_stock'],
];

test('runtime and source catalogs remain byte-identical; do not claim full audit',()=>{
 assert.equal(runtime,raw);
 assert.equal(catalog.products.length,24);
 assert.equal(catalog.verifiedAt,'2026-10-07','Partial recheck must not move whole-catalog verification date');
 assert.equal(catalog.bundle_deals.length,2,'Original bundle deals must stay distinct, not silently refreshed');
 assert.ok(catalog.bundle_deals.every(d=>d.offers.every(o=>o.verified_at==='2026-10-07')),'Bundles were not checked and their evidence date must remain unchanged');
});

test('only 25 exact retailer offers have 2026-11-07 price, stock and source evidence',()=>{
 assert.equal(CHECKED_SIZE(),25);
 const observed=new Set();
 for(const [id,merchant,price,stock] of checked){
   const product=catalog.products.find(x=>x.id===id);
   assert.ok(product,'Missing audited product '+id);
   const offer=product.offers.find(x=>x.merchant===merchant);
   assert.ok(offer,'Missing merchant '+id+'@'+merchant);
   const key=id+'@'+merchant;
   assert.ok(!observed.has(key),'Duplicate audited offer '+key);
   observed.add(key);
   assert.equal(offer.price_czk,price,key+' price');
   assert.equal(offer.availability,stock,key+' availability');
   assert.equal(offer.verified_at,AUDIT_DAY,key+' exact dated evidence');
   const url=new URL(offer.source_url);
   assert.equal(url.protocol,'https:');
   assert.equal(url.hostname,merchant==='battery-cz'?'www.battery.cz':'www.solar-import.cz');
   assert.ok(!url.searchParams.has('desturl')&&!url.hostname.includes('ehub'),'No affiliate tracking request in evidence');
 }
 assert.equal(catalog.products.flatMap(p=>(p.offers||[]).filter(o=>o.verified_at===AUDIT_DAY)).length,25,'Never advance unobserved snapshots');
 assert.equal(new Set(checked.map(x=>x[0])).size,13);
 for(const id of new Set(checked.map(x=>x[0]))){
   const product=catalog.products.find(x=>x.id===id);
   const primary=product.offers.find(x=>x.merchant===product.merchant);
   assert.equal(product.verified_at,AUDIT_DAY,id+' primary product verification');
   assert.equal(product.price_czk,primary.price_czk,id+' product-price mirror');
   assert.equal(product.price_czk_snapshot,primary.price_czk,id+' product snapshot mirror');
   assert.equal(product.availability,primary.availability,id+' availability mirror');
 }
});
function CHECKED_SIZE(){return checked.length;}

test('seller on-request signal prevents unsupported 12V ready-to-buy bank',()=>{
 const product=catalog.products.find(p=>p.id==='battery-goowei-12-200');
 assert.equal(product.availability,'on_request');
 assert.equal(product.tier,'reference','On-request offer cannot remain an active Best Value recommendation');
 assert.ok(product.offers.every(o=>o.availability==='on_request'));
 assert.equal(M.availabilityRank(product),0);
 const candidates=B.batteryBankCandidatesAll(catalog.products,{voltage:12,batteryKwh:2,inverterW:800});
 assert.ok(!candidates.some(x=>x.product.id===product.id),'Do not recommend unstocked 12V 200Ah battery');
});

test('actual 30-day gate: 28 fresh, 20 stale product offers on 2026-11-07',()=>{
 const offers=catalog.products.flatMap(p=>p.offers||[]);
 assert.equal(offers.length,48);
 const now='2026-11-07T12:00:00Z';
 const fresh=offers.filter(o=>M.verificationState(o.verified_at,now)==='fresh');
 const stale=offers.filter(o=>M.verificationState(o.verified_at,now)==='stale');
 assert.equal(fresh.length,28);
 assert.equal(stale.length,20);
 const stalePrice=catalog.products.find(x=>x.id==='mppt-victron-100-50').offers.find(x=>x.merchant==='battery-cz');
 assert.equal(M.verificationState(stalePrice.verified_at,now),'stale');
 // Evaluate with the real wall clock too: expired offer prices must never leak.
 if(M.verificationState(stalePrice.verified_at)==='stale'){
   const resolved=A.resolveOffer(catalog.products.find(x=>x.id==='mppt-victron-100-50'),stalePrice);
   assert.equal(resolved.price_czk,null,'Old public price must remain suppressed');
 }
 assert.equal(M.verificationState(AUDIT_DAY,'2026-12-09T00:00:00Z'),'stale','New snapshots must age out automatically');
 assert.equal(M.verificationState('2000-01-01',now),'stale');
});
