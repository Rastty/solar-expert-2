'use strict';
/**
 * Exercise actual published merchant adapter and no-fake-conversion paths.
 * No external requests, WordPress writes, fake purchases or source changes.
 */
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-09T20:00:00Z')});
global.window={
  location:{origin:'https://solar-expert.cz'},
  SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/affiliate-adapter.js');
const A=window.SolarExpertAffiliate;
const today='2026-11-09';
const main={merchant:'battery-cz',source_url:'https://www.battery.cz/actual-model/',price_czk:8650,verified_at:today,availability:'in_stock'};
const missing={merchant:'solar-import-cz',source_url:null,price_czk:7990,verified_at:today,availability:'in_stock'};
const product={id:'battery-test',merchant:'battery-cz',source_url:main.source_url,price_czk:8650,
  verified_at:today,availability:'in_stock',offers:[{...missing},{...main}]};
const events=event=>window.dataLayer.filter(x=>x.event===event);
function reset(){window.dataLayer.length=0;}

assert.equal(A.resolveOffer(product,missing).href,'#',
  'Secondary merchant may not borrow primary merchant source URL');
assert.equal(A.resolveOffer(product,missing).monetized,false);
assert.equal(A.offers(product).length,1,'No visible shopping button without actionable outbound URL');
assert.equal(A.offers(product)[0].merchantId,'battery-cz','Actual seller remains available');
assert.equal(A.resolve(product).href,main.source_url);

reset();
A.trackOffer(product,missing,'battery-selector');
assert.equal(events('affiliate_click').length,0,'Clicking a # placeholder is not an affiliate outbound');
A.track(product,'battery-selector');
assert.equal(events('affiliate_click').length,1,'Legacy helper must choose an actual shop over cheaper broken offer');
assert.equal(events('affiliate_click')[0].merchant,'battery-cz');
assert.equal(events('affiliate_click')[0].monetized,false,'Direct vendor link is not an approved affiliate tracking URL');

const deal={
  id:'deal-test',merchant:'battery-cz',source_url:'https://www.battery.cz/real-set/',
  availability:'in_stock',verified_at:today,price_czk:10000,
  effective_offer:{merchant:'battery-cz',price_czk:10000,availability:'in_stock',verified_at:today},
  offers:[
    {merchant:'solar-import-cz',source_url:null,price_czk:9000,availability:'in_stock',verified_at:today},
    {merchant:'battery-cz',source_url:'https://www.battery.cz/real-set/',price_czk:10000,availability:'in_stock',verified_at:today}
  ]
};
reset();
assert.equal(A.bundleDealOffers(deal).length,1,'No disabled set CTA appears among real vendors');
assert.equal(A.bundleDealOffers(deal)[0].merchantId,'battery-cz');
A.trackBundleDealOffer(deal,deal.offers[0],'builder-best');
assert.equal(events('bundle_deal_click').length,0,'Unknown merchant set destination is not a real click');
A.trackBundleDeal(deal,'builder-best');
assert.equal(events('bundle_deal_click').length,1,'Legacy set click chooses actually actionable vendor');
assert.equal(events('bundle_deal_click')[0].merchant,'battery-cz');

for(const bad of ['#','javascript:alert(1)','data:text/html,evil','mailto:vendor@example.com',
  'https://solar-expert.cz/another-page','/affiliate?click=1','']){
  assert.equal(A.isActionableMerchantHref(bad),false,'Rejected non-external buyer URL: '+bad);
  const poisoned={...main,source_url:bad,affiliate_url:bad};
  reset();
  const broken={...product,offers:[poisoned],source_url:bad};
  assert.equal(A.offers(broken).length,0,'Invalid offer destination cannot be rendered: '+bad);
  assert.equal(A.trackOffer(broken,poisoned,'builder-best').href,'#');
  assert.equal(events('affiliate_click').length,0,'No conversion counted for blocked URL: '+bad);
}
for(const legitimate of [
  'https://www.battery.cz/real-model/',
  'https://ehub.cz/system/scripts/click.php?a_aid=sample&a_bid=sample',
  'http://www.solar-import.cz/real-model/'
]){
  assert(A.isActionableMerchantHref(legitimate),'Keep legitimate external URLs: '+legitimate);
}

// A real exact seller affiliate mapping remains monetized when its source
// URL is absent. Conversely, unsafe affiliate mapping MUST fall back safely
// to the original independent merchant page without claiming monetization.
const altKey=product.id+'@solar-import-cz';
window.SolarExpertConfig.affiliateMap.products[altKey]='https://ehub.cz/system/scripts/click.php?a_bid=independent';
const mapped=A.resolveOffer(product,missing);
assert.equal(mapped.monetized,true);
assert.equal(mapped.href,window.SolarExpertConfig.affiliateMap.products[altKey]);
assert.equal(A.offers(product).length,2,'Do not drop real approved merchant deep links');
reset();
A.trackOffer(product,missing,'battery-selector');
assert.equal(events('affiliate_click')[0].merchant,'solar-import-cz');
assert.equal(events('affiliate_click')[0].monetized,true);

window.SolarExpertConfig.affiliateMap.products[altKey]='javascript:alert(1)';
const safeAlt={...missing,source_url:'https://www.solar-import.cz/real-model/'};
assert.equal(A.resolveOffer(product,safeAlt).href,safeAlt.source_url);
assert.equal(A.resolveOffer(product,safeAlt).monetized,false,
  'Rejected unsafe merchant mapping does not count as monetized');

window.SolarExpertConfig.affiliateBases['solar-import-cz']='https://ehub.cz/system/scripts/click.php?a_aid=safe&a_bid=real';
const affiliate=A.resolveOffer(product,safeAlt);
assert.equal(affiliate.monetized,true,'Approved affiliate base with real seller URL remains functional');
assert.equal(new URL(affiliate.href).searchParams.get('desturl'),safeAlt.source_url);
const poisoned={...safeAlt,source_url:'javascript:alert(1)'};
assert.equal(A.merchantDeepLink('solar-import-cz',poisoned.source_url),null,
  'Never encode unsafe URL in affiliate desturl, even behind a valid network redirect');
console.log('PASS: no dead merchant links or false affiliate/set clicks; real source and approved exact/base links remain actionable');
