'use strict';
// A buyer-ready technical alternative must not be hidden by a quoted Best
// Value bill whose component destinations cannot all be opened. Pure fixtures:
// no network, affiliate click, WordPress mutation or invented price evidence.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-18T12:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},dataLayer:[],
  SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
require('../assets/js/affiliate-adapter.js');
const seed=require('../data/product-seed.json');
const builder=window.solarExpertBuilder();
builder.catalog=seed.products;
builder.bundleDeals=seed.bundle_deals;
builder.preset('chata');
builder.calc();

const source=builder.primaryBundle;
assert(source?.complete && builder.hasCompletePurchaseLinksFor(source),
  'The real cottage fixture starts with a source-backed full shopping list');
const batteryPrice=window.SolarExpertProductMatcher.effectivePrice(source.battery);
assert(Number.isFinite(batteryPrice)&&batteryPrice>0);

// A legacy dated quote can be arithmetically valid without a seller-specific
// product URL. It must NEVER become an invented actionable link.
const legacyBattery={...source.battery,id:'legacy-no-product-url',
  offers:[],source_url:null,affiliate_url:null,price_czk:batteryPrice,verified_at:'2026-11-17'};
const best={...source,tier:'best',label:'Best Value',battery:legacyBattery};
const budget={...source,tier:'budget',label:'Budget – kompletní odkazy'};
assert(builder.purchaseBreakdownFor(best),'Dated legacy quote still reconciles its component sum');
assert.equal(builder.hasCompletePurchaseLinksFor(best),false,
  'A matching price alone is not a complete verified checkout');
assert.equal(builder.hasCompletePurchaseLinksFor(budget),true);

builder.bundles=[best,budget];
assert.equal(builder.primaryBundle,budget,
  'Use complete technical alternative with links instead of leaving default buyer list stranded');
assert.equal(builder.canCopyPrimaryPurchaseList,true);
assert(builder.primaryPurchaseRows.every(row=>row.offer),
  'Every checkout row has an independently matched merchant destination');
assert(builder.primaryPurchaseText.includes('Budget – kompletní odkazy'));
assert.equal(builder.primaryShoppingList.total,source.totalPrice,
  'Changing buyer-summary tier cannot alter documented component prices');

builder.bundles=[budget,source];
assert.equal(builder.primaryBundle,source,'Keep source-backed Best Value when its full list is actionable');

builder.bundles=[best];
assert.equal(builder.primaryBundle,best,'Keep technical fallback if no link-complete alternative exists');
assert.equal(builder.canCopyPrimaryPurchaseList,false,'Never copy an incomplete seller list');
assert(builder.primaryPurchaseRows.some(row=>row.offer===null));

builder.bundles=[{...best,integratedMppt:true,pvIscVerified:false},budget];
assert.equal(builder.primaryBundle,budget,'Unsafe integrated PV input cannot become a primary alternative');

assert.equal(window.dataLayer.filter(event=>event.event==='affiliate_click').length,0,
  'Selecting a buyer-summary tier never manufactures merchant clicks');
const html=fs.readFileSync(path.join(__dirname,'../template-parts/solar-builder.php'),'utf8');
assert(html.includes('přímý odkaz na ověřenou nabídku'),
  'Explain to readers why a non-Best-Value tier became the first shopping list');
console.log('PASS: buyer-ready linked checkout fallback preserves safety, quoted sum and honest tier labels');
