'use strict';
/**
 * Prevent retailer-domain cross-contamination in buyer price/stock claims
 * and public affiliate CTAs. No requests, live prices or credentials.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T15:00:00Z')});
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
const date='2026-11-10';
const valid={merchant:'battery-cz',price_czk:8990,verified_at:date,
  availability:'in_stock',source_url:'https://www.battery.cz/real-battery/'};
const wrong={merchant:'solar-import-cz',price_czk:900,verified_at:date,
  availability:'in_stock',source_url:'https://www.battery.cz/cheaper-different-shop/'};
assert.equal(M.hasSellerSource(valid),true);
assert.equal(M.hasSellerSource(wrong),false,'Wrong seller domain cannot evidence a cheap quote');
for(const fake of [
  {...valid,source_url:'https://www.battery.cz.evil.example/sku/'},
  {...valid,source_url:'https://www.solar-import.cz/wrong-shop/'},
  {...valid,source_url:'https://solar-expert.cz/offer/'},
  {...valid,source_url:'https://www.battery.cz/'},
  {...valid,source_url:'https://attacker@www.battery.cz/offer/'},
  {...valid,source_url:'https://www.battery.cz:8443/offer/'},
  {...valid,merchant:'unapproved-shop',source_url:'https://www.battery.cz/offer/'}
]){
  assert.equal(M.hasSellerSource(fake),false,'Reject untrusted source '+fake.source_url);
}
const p={id:'battery-example',type:'battery',merchant:'battery-cz',
  system_voltage_class:12,energy_wh:1280,max_discharge_a:100,
  verified_at:date,availability:'in_stock',price_czk:900,
  offers:[wrong,valid]};
assert.equal(M.effectivePrice(p),8990,'Do not prefer other seller host as cheapest price');
assert.equal(M.evidenceQuality(p).freshOffers,1);
assert.equal(M.merchantDiversity(p),1);
assert.equal(A.offers(p).length,1,'Cross-store URL must not create a merchant CTA');
assert.equal(A.offers(p)[0].merchantId,'battery-cz');
assert.equal(A.resolveOffer(p,wrong).href,'#');
window.dataLayer.length=0;
A.trackOffer(p,wrong,'battery-selector');
assert.equal(window.dataLayer.length,0,'Wrong-store CTA is not a measured conversion');

// Independently approved exact affiliate mapping may still be clicked,
// but it must not backfill wrong-host prices or stock claims.
const affiliate='https://ehub.cz/system/scripts/click.php?a_bid=already-approved';
window.SolarExpertConfig.affiliateMap.products[p.id+'@solar-import-cz']=affiliate;
const mapped=A.offers(p);
assert.equal(mapped.length,2);
assert.equal(mapped[0].merchantId,'battery-cz','Real verified offer remains first');
assert.equal(mapped[1].href,affiliate);
assert.equal(mapped[1].price_czk,null);
assert.equal(mapped[1].availability,'unverified');
assert.equal(mapped[1].is_best_price,false);
window.dataLayer.length=0;
A.trackOffer(p,wrong,'battery-selector');
assert.equal(window.dataLayer.length,1,'Actual approved affiliate click remains attributable');
assert.equal(window.dataLayer[0].priceCzk,null);

const deal={id:'set-example',merchant:'battery-cz',
  components:['battery-example','inverter-example'],offers:[
    {...wrong,price_czk:1000},
    {...valid,price_czk:8500,source_url:'https://www.battery.cz/real-set/'}
  ]};
const selected=B.findBundleDeal([deal],['battery-example','inverter-example'],10000);
assert.equal(selected.price_czk,8500,'Other retailer domain must not fabricate set discount');
assert.equal(selected.savings_czk,1500);
assert.equal(B.findBundleDeal([{...deal,offers:[wrong]}],
  ['battery-example','inverter-example'],10000),null);
assert.equal(A.bundleDealOffers(deal).length,1);
assert.equal(A.bundleDealOffers(deal)[0].merchantId,'battery-cz');
assert.equal(A.resolveBundleDealOffer(deal,wrong).href,'#');

// All real currently reviewed source rows must remain eligible, and domain
// allowlist must not silently stop a paid retailer lane.
const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'..','assets/data/product-seed.json'),'utf8'));
const rows=[...seed.products,...(seed.bundle_deals||[])].flatMap(x=>x.offers||[]);
assert.equal(rows.length,52);
assert(rows.every(row=>M.hasSellerSource(row)),
  'Every real catalog quote belongs to its declared approved shop domain');
console.log('PASS: seller-domain source integrity, correct shop CTAs, accurate prices and bundle savings');
