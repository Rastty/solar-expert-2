'use strict';
// A reconciled price without exact seller destinations is NOT the end of the
// buyer path. Search a technically complete 24 V alternative when the 12 V
// design cannot actually be purchased, without hiding safety constraints.
// No live merchant requests, WordPress writes or affiliate clicks.
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-20T12:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz',search:''},dataLayer:[],
  SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
const seed=require('../data/product-seed.json');
const catalog=seed.products.map(p=>p.id==='battery-goowei-12-200'
  ?{...p,availability:'in_stock',offers:p.offers.map(o=>({...o,availability:'in_stock'}))}
  :p);

const builder=()=>{
  const b=window.solarExpertBuilder();
  b.catalog=catalog;
  b.bundleDeals=seed.bundle_deals;
  return b;
};

// The source-priced nominal 12 V assembly exists and passes the exact
// component arithmetic, but the full set of retailer destinations does not.
const source=builder();
source.quickPreview();
assert.equal(source.result.voltage,12);
assert(source.primaryShoppingList?.total>0);

// Real-page simulation: adapter has loaded, but exact 12 V product checkout
// is unavailable while the alternate 24 V group has verified full links.
window.SolarExpertAffiliate={};
const useful=builder();
useful.hasCompletePurchaseLinksFor=b=>b?.battery?.system_voltage_class===24&&
  Boolean(useful.purchaseBreakdownFor(b));
useful.quickPreview();
assert.equal(useful.result.nominalVoltage,12);
assert.equal(useful.result.voltage,24,
  'Price-only 12 V offer must not strand the buyer if 24 V has complete links');
assert.equal(useful.result.voltageAlternativeFrom,12);
assert(useful.primaryBundle?.complete&&useful.primaryBundle?.priceComplete);
assert.equal(useful.primaryBundle.battery.system_voltage_class,24);

const nominalReady=builder();
nominalReady.hasCompletePurchaseLinksFor=b=>Boolean(nominalReady.purchaseBreakdownFor(b));
nominalReady.quickPreview();
assert.equal(nominalReady.result.voltage,12,
  'Do not change electrical system voltage when existing checkout is actionable');

const noActionable=builder();
noActionable.hasCompletePurchaseLinksFor=()=>false;
noActionable.quickPreview();
assert.equal(noActionable.result.voltage,12,
  'Never present a 24 V source-only quote as an actionable alternative');
assert(noActionable.primaryShoppingList?.total>0,
  'Keep the transparent technical/priced fallback if no full checkout exists');

assert.equal(window.dataLayer.filter(x=>x.event==='affiliate_click').length,0);
console.log('PASS: actionability-aware voltage fallback and unchanged nominal/safety path');
