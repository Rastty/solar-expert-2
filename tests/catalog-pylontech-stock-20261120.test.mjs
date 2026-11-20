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

test('both independently checked Pylontech merchant pages are on request, not buyable inventory',()=>{
 const product=catalog.products.find(p=>p.id==='battery-pylontech-us5000');
 assert.equal(product.sku,'E8221');
 assert.equal(product.tier,'reference');
 assert.equal(product.availability,'on_request');
 assert.equal(product.price_czk,22900,'Keep the observed price without presenting it as ready to buy');
 assert.equal(product.verified_at,'2026-11-20');
 assert.equal(product.offers.length,2);
 for(const offer of product.offers){
  const retailer=offer.merchant==='battery-cz'?'www.battery.cz':'www.solar-import.cz';
  assert.equal(new URL(offer.source_url).hostname,retailer);
  assert.match(offer.source_url,/pylontech-us5000-lithiova-baterie-48v-4-8kwh\/$/);
  assert.equal(offer.price_czk,22900);
  assert.equal(offer.availability,'on_request');
  assert.equal(offer.verified_at,'2026-11-20');
  assert.equal(A.resolveOffer(product,offer).availability,'on_request',
    'An exact historical quote must retain its non-stocked merchant status');
 }
 assert.ok(A.offers(product).every(offer=>!offer.is_best_price),
   'An unavailable quote must never be labeled as a current best purchasable price');
 assert.equal(M.availabilityRank(product),0);
 assert.equal(M.effectivePrice(product),Number.MAX_SAFE_INTEGER);
});

test('48 V buyer selection excludes on-request Pylontech but retains stocked alternative',()=>{
 const candidates=B.batteryBankCandidatesAll(catalog.products,{voltage:48,batteryKwh:4,inverterW:1800});
 assert.ok(!candidates.some(row=>row.product.id==='battery-pylontech-us5000'));
 assert.ok(candidates.some(row=>row.product.id==='battery-seplos-pusung-48'),
   'Do not suppress an independently verified stocked 48 V alternative');
});
