'use strict';
/**
 * Price/source parity at the last buyer-facing affiliate adapter boundary.
 * Synthetic cases only; no WordPress, merchant or analytics network writes.
 */
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T12:00:00Z')});
global.window={
  location:{origin:'https://solar-expert.cz'},
  SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/affiliate-adapter.js');
const A=window.SolarExpertAffiliate;
const M=window.SolarExpertProductMatcher;
const date='2026-11-10';

const verified={merchant:'battery-cz',source_url:'https://www.battery.cz/actual-product/',
  verified_at:date,availability:'in_stock',price_czk:8650};
const mappedNoSource={merchant:'solar-import-cz',source_url:null,
  verified_at:date,availability:'in_stock',price_czk:7990};
const product={id:'synthetic-battery',type:'battery',merchant:'battery-cz',
  source_url:verified.source_url,price_czk:1000,verified_at:date,
  availability:'in_stock',offers:[mappedNoSource,verified]};
const redirect='https://ehub.cz/system/scripts/click.php?a_bid=independent-merchant';
window.SolarExpertConfig.affiliateMap.products[product.id+'@solar-import-cz']=redirect;

assert.equal(M.effectivePrice(product),8650,'Matcher only counts source-proven price');
const productOffers=A.offers(product);
assert.equal(productOffers.length,2,'Keep the actual approved affiliate link');
assert.equal(productOffers[0].merchantId,'battery-cz','Verified seller appears before unverified mapped offer');
assert.equal(productOffers[0].price_czk,8650);
assert.equal(productOffers[0].availability,'in_stock');
assert.equal(productOffers[1].merchantId,'solar-import-cz');
assert.equal(productOffers[1].href,redirect,'Preserve approved exact affiliate redirect');
assert.equal(productOffers[1].monetized,true);
assert.equal(productOffers[1].price_czk,null,'Do not advertise unproven cheap mapped price');
assert.equal(productOffers[1].availability,'unverified','Do not claim stock from unproven seller row');
assert.equal(productOffers[1].price_freshness,'unknown');
assert.equal(productOffers[1].is_best_price,false,'Unproven cheap row never wins best price');
assert.equal(productOffers[1].savings_vs_next_czk,null);
assert.equal(A.resolve(product).merchantId,'battery-cz','Legacy default CTA favors verified seller');

A.trackOffer(product,mappedNoSource,'battery-selector');
const click=window.dataLayer.find(x=>x.event==='affiliate_click');
assert.equal(click.merchant,'solar-import-cz','Actual affiliate click still attributable');
assert.equal(click.monetized,true);
assert.equal(click.priceCzk,null,'No false amount enters the conversion event');

const dealVerified={merchant:'solar-import-cz',
  source_url:'https://www.solar-import.cz/actual-set/',price_czk:8500,
  verified_at:date,availability:'in_stock'};
const dealMissing={merchant:'battery-cz',source_url:null,price_czk:1000,
  verified_at:date,availability:'in_stock'};
const deal={id:'synthetic-set',merchant:'battery-cz',
  source_url:'https://www.battery.cz/general-set-page/',
  price_czk:8500,savings_czk:1500,bankSavingsCzk:1500,
  effective_offer:dealVerified,
  offers:[dealMissing,dealVerified]};
const setOffers=A.bundleDealOffers(deal);
assert.equal(setOffers.length,2,'Seller with same-merchant parent URL remains navigable');
assert.equal(setOffers[0].merchantId,'solar-import-cz','Verified set listing takes first CTA');
assert.equal(setOffers[0].price_czk,8500);
assert.equal(setOffers[0].savings_czk,1500);
assert.equal(setOffers[1].merchantId,'battery-cz');
assert.equal(setOffers[1].href,deal.source_url,'Existing valid parent destination need not be destroyed');
assert.equal(setOffers[1].price_czk,null,'Parent deal URL does not verify child seller price');
assert.equal(setOffers[1].availability,'unverified');
assert.equal(setOffers[1].savings_czk,null,'Parent deal URL does not justify fabricated saving');
assert.equal(setOffers[1].bank_savings_czk,null);
assert.equal(setOffers[1].is_best_price,false);
window.dataLayer.length=0;
A.trackBundleDealOffer(deal,dealMissing,'builder-best');
const bundleClick=window.dataLayer.find(x=>x.event==='bundle_deal_click');
assert.equal(bundleClick.priceCzk,null,'Unverified price cannot enter set conversion analytics');
assert.equal(bundleClick.savingsCzk,null,'Unverified saving cannot enter set conversion analytics');

// Standalone legacy rows without explicit offers preserve their established
// date-verified product snapshot behavior during this narrowly scoped fix.
const legacy={id:'legacy',merchant:'battery-cz',price_czk:4550,
  verified_at:date,availability:'in_stock',affiliate_url:redirect};
assert.equal(A.offers(legacy)[0].price_czk,4550);
assert.equal(A.offers(legacy)[0].availability,'in_stock');
console.log('PASS: verified seller leads, unverified mapped clicks survive without price/stock/saving claims');
