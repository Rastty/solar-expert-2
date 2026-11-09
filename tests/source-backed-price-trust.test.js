'use strict';
/**
 * Real product matcher and bundle composer source-evidence regression.
 * A price from a seller without a verifiable individual listing must NEVER
 * become the Builder's displayed cheapest purchase total.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-09T20:00:00Z')});
global.window={
  location:{origin:'https://solar-expert.cz'},
  SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/affiliate-adapter.js');
require('../assets/js/bundle-composer.js');
const M=window.SolarExpertProductMatcher;
const A=window.SolarExpertAffiliate;
const B=window.SolarExpertBundleComposer;
const date='2026-11-09';

const valid={merchant:'battery-cz',verified_at:date,availability:'in_stock',
  price_czk:8650,source_url:'https://www.battery.cz/actual-battery/'};
const noSource={merchant:'solar-import-cz',verified_at:date,availability:'in_stock',
  price_czk:1000,source_url:null};
const wrongSource={merchant:'ampul-eu',verified_at:date,availability:'in_stock',
  price_czk:900,source_url:'javascript:alert(1)'};
const sameSite={merchant:'eon-cz',verified_at:date,availability:'in_stock',
  price_czk:800,source_url:'https://solar-expert.cz/not-a-merchant-listing/'};
const battery={
  id:'battery-test',type:'battery',merchant:'battery-cz',
  system_voltage_class:12,energy_wh:1280,max_discharge_a:100,
  verified_at:date,availability:'in_stock',price_czk:800,
  source_url:valid.source_url,offers:[noSource,wrongSource,sameSite,valid]
};
assert.equal(M.hasSellerSource(valid),true);
for(const invalid of [noSource,wrongSource,sameSite]){
  assert.equal(M.hasSellerSource(invalid),false,'Unverifiable seller source should be rejected: '+invalid.merchant);
}
assert.equal(M.effectivePrice(battery),8650,'A fake 800CZK parent or cheaper unlinked offers cannot win');
assert.equal(M.availabilityRank(battery),2,'A valid dated and in-stock seller still proves availability');
assert.equal(M.evidenceQuality(battery).freshOffers,1,'Only exactly one source-backed seller proves availability');
assert.equal(M.merchantDiversity(battery),1,'Missing URL merchants cannot inflate genuine operator/store diversity');
assert.equal(A.offers(battery).length,1,'Only one merchant can actually receive the buyer');
assert.equal(A.offers(battery)[0].merchantId,'battery-cz');
const ranking=M.rank([battery],{voltage:12,batteryKwh:1.1,inverterW:60});
assert.equal(ranking.length,1,'Technical fit remains valid');
assert.equal(ranking[0].decision.priceCzk,8650,'Public ranking uses actually source-backed best price');

const allBroken={...battery,offers:[noSource,wrongSource,sameSite],price_czk:100};
assert.equal(M.effectivePrice(allBroken),Number.MAX_SAFE_INTEGER,
  'No product-level price fallback when explicit seller offers are missing URLs');
assert.equal(M.availabilityRank(allBroken),1,'No verified in-stock claim from unlinked seller records');
assert.equal(M.evidenceQuality(allBroken).freshOffers,0);
assert.equal(M.merchantDiversity(allBroken),0);
assert.equal(M.rank([allBroken],{voltage:12,batteryKwh:1.1,inverterW:60})[0].decision.priceCzk,null,
  'A technical-only fallback candidate must not pretend to have a shop price');

// Legacy solo product without explicit merchant offers retains independent
// source-date validation path, rather than unexpectedly removing old guides.
const legacy={id:'legacy',type:'battery',system_voltage_class:12,energy_wh:1280,
  max_discharge_a:100,price_czk:4550,verified_at:date,availability:'in_stock'};
assert.equal(M.effectivePrice(legacy),4550,'Existing standalone product compatibility stays supported');

const deal={
  id:'real-deal',merchant:'battery-cz',
  components:['battery-test','inverter-test'],
  offers:[
    {...noSource,price_czk:1000},
    {...wrongSource,price_czk:2000},
    {...valid,price_czk:8500,source_url:'https://www.battery.cz/real-set/'}
  ]
};
const checked=B.findBundleDeal([deal],['inverter-test','battery-test'],10000);
assert(checked,'A real discounted set should still be selected');
assert.equal(checked.price_czk,8500,'Cheapest unreachable set must not create a false advertised discount');
assert.equal(checked.savings_czk,1500);
assert.equal(checked.effective_offer.merchant,'battery-cz');
assert.equal(B.findBundleDeal([{...deal,offers:[noSource,wrongSource]}],
  ['inverter-test','battery-test'],10000),null,
  'No bundle discount from dealer rows lacking source evidence');

const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'..','assets/data/product-seed.json'),'utf8'));
const rows=[...seed.products,...(seed.bundle_deals||[])].flatMap(p=>p.offers||[]);
assert.equal(rows.length,52,'Real 52-offer catalogue has been maintained without inventing new sellers');
assert(rows.every(o=>M.hasSellerSource(o)),
  'All 52 currently accepted seller offers must retain exact external source-page evidence');
console.log('PASS: source-backed price, genuine stock, trust score and bundle savings agree with actionable merchant quotes');
