import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
globalThis.window={SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}}};
require('../assets/js/affiliate-adapter.js');
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
const A=window.SolarExpertAffiliate;
const M=window.SolarExpertProductMatcher;
const B=window.SolarExpertBundleComposer;
const catalog=JSON.parse(readFileSync('assets/data/product-seed.json','utf8'));

test('POLO-W + Growatt deal marked on request at both real sellers cannot appear as a buyer saving',()=>{
 const deal=catalog.bundle_deals.find(d=>d.id==='deal-battery-polo-w-growatt6000');
 assert.equal(deal.sku,'E9021');
 assert.equal(deal.price_czk,32990);
 assert.equal(deal.availability,'on_request');
 assert.equal(deal.verified_at,'2026-11-20');
 assert.equal(deal.offers.length,2);
 for(const offer of deal.offers){
  assert.equal(offer.availability,'on_request');
  assert.equal(offer.price_czk,32990);
  assert.equal(offer.verified_at,'2026-11-20');
  assert.match(offer.source_url,/set-lithiova-baterie-seplos-polo-w--5-12kwh--menic-growatt-spf-6000es-plus--6000w-48v\/$/);
  assert.equal(M.verificationState(offer.verified_at,'2026-11-20T12:00:00Z'),'fresh');
 }
 assert.equal(B.findBundleDeal([deal],deal.components,40000),null,
   'Stock unavailability must defeat even an apparently attractive bundle discount');
 assert.ok(A.bundleDealOffers(deal).every(o=>o.availability==='on_request'&&!o.is_best_price&&o.savings_vs_next_czk===null));
 const stocked=catalog.bundle_deals.find(d=>d.id==='deal-battery-pusung-growatt6000');
 assert.equal(stocked.availability,'in_stock');
 assert.equal(B.findBundleDeal([stocked],stocked.components,40000)?.id,stocked.id,
   'Keep the independently available PUSUNG combination eligible');
});

test('exact Battery.cz 190W panel price changed without inventing a Solar-Import price change',()=>{
 const panel=catalog.products.find(p=>p.id==='panel-victron-190');
 const battery=panel.offers.find(o=>o.merchant==='battery-cz');
 const solar=panel.offers.find(o=>o.merchant==='solar-import-cz');
 assert.equal(panel.sku,'E8934');
 assert.equal(battery.price_czk,3486);
 assert.equal(battery.availability,'in_stock');
 assert.equal(battery.verified_at,'2026-11-20');
 assert.equal(new URL(battery.source_url).hostname,'www.battery.cz');
 assert.equal(solar.price_czk,2251);
 assert.equal(solar.verified_at,'2026-11-07');
 assert.equal(panel.price_czk,solar.price_czk,'Primary merchant snapshot must not be overwritten by alternate');
 assert.equal(M.effectivePrice(panel),2251,'Only the actual lowest in-stock seller price can enter a bundle');
 assert.equal(A.resolveOffer(panel,battery).price_czk,3486);
});
