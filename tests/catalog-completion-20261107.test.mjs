import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
globalThis.window={SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
const M=window.SolarExpertProductMatcher, B=window.SolarExpertBundleComposer;
const catalog=JSON.parse(readFileSync('assets/data/product-seed.json','utf8'));
const CHECKED_AT='2026-11-07';
const checked=[
 ['battery-pylontech-us5000','solar-import-cz',22900,'in_stock'],
 ['battery-seplos-polo-w-48','battery-cz',20990,'on_request'],
 ['battery-seplos-polo-w-48','solar-import-cz',20990,'on_request'],
 ['mppt-victron-100-50','solar-import-cz',4305,'in_stock'],
 ['mppt-victron-100-50','battery-cz',4305,'in_stock'],
 ['mppt-victron-150-35','solar-import-cz',4305,'in_stock'],
 ['mppt-victron-150-35','battery-cz',4291,'in_stock'],
 ['mppt-victron-150-70','solar-import-cz',9650,'in_stock'],
 ['mppt-victron-150-70','battery-cz',9650,'in_stock'],
 ['mppt-victron-250-100','solar-import-cz',14294,'in_stock'],
 ['mppt-victron-250-100','battery-cz',14246,'in_stock'],
 ['inverter-victron-48-1200','solar-import-cz',7623,'usually_in_stock'],
 ['inverter-victron-48-1200','battery-cz',7623,'usually_in_stock'],
 ['inverter-kosun-48-3000','solar-import-cz',9563,'in_stock'],
 ['inverter-kosun-48-3000','battery-cz',7990,'in_stock'],
 ['inverter-kosun-12-1000','solar-import-cz',6580,'in_stock'],
 ['inverter-kosun-12-1000','battery-cz',4990,'in_stock'],
 ['inverter-rogerele-rep1000-12','solar-import-cz',2890,'in_stock'],
 ['inverter-rogerele-rep1000-12','battery-cz',2890,'in_stock'],
 ['inverter-rogerele-rep1500-24','battery-cz',4190,'in_stock']
];
test('second seller-page audit is exact, distinct and genuinely dated',()=>{
 assert.equal(checked.length,20);
 const seen=new Set();
 for(const [id,merchant,price,availability] of checked){
  const product=catalog.products.find(p=>p.id===id);
  assert.ok(product,'Product missing: '+id);
  const offer=product.offers.find(o=>o.merchant===merchant);
  assert.ok(offer,'Source merchant missing: '+id+' '+merchant);
  const key=id+'@'+merchant;
  assert.ok(!seen.has(key),'Duplicate offer '+key);
  seen.add(key);
  assert.equal(offer.price_czk,price,'Exact evidence price '+key);
  assert.equal(offer.availability,availability,'Exact evidence status '+key);
  assert.equal(offer.verified_at,CHECKED_AT,'Exact verification day '+key);
  const url=new URL(offer.source_url);
  assert.equal(url.protocol,'https:');
  assert.equal(url.hostname,merchant==='battery-cz'?'www.battery.cz':'www.solar-import.cz');
  assert.equal(url.searchParams.has('desturl'),false,'Never audit an affiliate redirect');
  if(product.merchant===merchant){
   assert.equal(product.price_czk,offer.price_czk,'Primary price must match '+key);
   assert.equal(product.price_czk_snapshot,offer.price_czk,'Snapshot must match '+key);
   assert.equal(product.availability,offer.availability,'Primary stock must match '+key);
   assert.equal(product.verified_at,CHECKED_AT,'Primary observation date must match '+key);
  }
 }
 assert.equal(seen.size,20);
 assert.equal(catalog.products.flatMap(p=>p.offers||[]).filter(o=>o.verified_at===CHECKED_AT).length,45);
 const remaining=catalog.products.flatMap(p=>p.offers||[]).filter(o=>o.verified_at!==CHECKED_AT);
 assert.equal(remaining.length,3);
 assert.ok(remaining.every(o=>o.merchant==='vselektro-eu'&&o.verified_at==='2026-10-13'),'Never invent an audit of independent merchant');
});
test('source product identity and bundle offer receipts',()=>{
 const p=catalog.products.find(p=>p.id==='battery-pylontech-us5000');
 const solar=p.offers.find(o=>o.merchant==='solar-import-cz');
 assert.equal(solar.source_url,'https://www.solar-import.cz/baterie/pylontech-us5000-lithiova-baterie-48v-4-8kwh/','Fix legacy seller source path to exact current SKU');
 assert.equal(catalog.verifiedAt,'2026-10-07','Full-catalog audit date must not be relabeled');
 assert.equal(catalog.bundle_deals.length,2);
 for(const deal of catalog.bundle_deals){
   assert.equal(deal.verified_at,CHECKED_AT);
   assert.equal(deal.price_czk,32990);
   assert.equal(deal.availability,'in_stock');
   assert.equal(deal.offers.length,2);
   assert.equal(deal.verified_price_source_url,deal.offers.find(o=>o.merchant===deal.merchant).source_url);
   for(const o of deal.offers){
    assert.equal(o.price_czk,32990);
    assert.equal(o.availability,'in_stock');
    assert.equal(o.verified_at,CHECKED_AT);
    assert.ok(o.source_url.startsWith(o.merchant==='battery-cz'?'https://www.battery.cz/':'https://www.solar-import.cz/'));
    assert.ok(o.source_url.includes('/set-lithiova-baterie-seplos-'),'Only exact SKU bundle links pass');
   }
 }
});
test('standalone POLO-W availability and incompatible lead-acid charger never become LiFePO4 recommendations',()=>{
 const polo=catalog.products.find(p=>p.id==='battery-seplos-polo-w-48');
 assert.equal(polo.availability,'on_request');
 assert.equal(polo.tier,'reference');
 assert.ok(polo.offers.every(o=>o.availability==='on_request'));
 assert.equal(M.availabilityRank(polo),0);
 assert.ok(!B.batteryBankCandidatesAll(catalog.products,{voltage:48,batteryKwh:4,inverterW:3000}).some(x=>x.product.id===polo.id));
 const kosun=catalog.products.find(p=>p.id==='inverter-kosun-48-3000');
 assert.equal(kosun.lifepo4_charge_supported,false);
 assert.equal(kosun.tier,'reference');
 const sizing={voltage:48,inverterW:2800,peak:5500};
 assert.deepEqual(M.explain(kosun,sizing),{pass:false,reasons:['lifepo4_charger_not_supported']});
 assert.ok(!M.rank(catalog.products.filter(p=>p.type==='inverter'||p.type==='inverter_hybrid'),sizing).some(x=>x.product.id===kosun.id));
 assert.equal(B.batteryInverterCompatible(catalog.products.find(p=>p.id==='battery-pylontech-us5000'),kosun),false);
 assert.equal(catalog.products.find(p=>p.id==='inverter-kosun-12-1000').lifepo4_charge_supported,true,'Separate 12V KOSUN has a seller-declared LiFePO4 mode');
 const rep=catalog.products.find(p=>p.id==='inverter-rogerele-rep1500-24');
 assert.equal(rep.availability,'in_stock','Refreshed stock can differ from historic quote');
 assert.equal(rep.tier,'reference','Stock alone does not promote an unreviewed recommendation tier');
});
