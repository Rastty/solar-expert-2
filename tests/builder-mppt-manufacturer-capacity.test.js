// 2026-11-17 snapshot scenario: the 25% charge-current recommendation is
// informational. Manufacturer input limits, topology and physical safety
// are the gates for selecting a real MPPT in the full-system Builder.
// Source: https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html
// Victron 100/30: rated battery charging 30 A, 12V nominal PV 440 Wp,
// maximum PV Isc 35 A, max PV Voc 100 V.
const {mock} = require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-17T12:00:00Z')});
const assert = require('node:assert/strict');

global.window={SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');

const seed=require('../data/product-seed.json');
const matcher=window.SolarExpertProductMatcher;
const composer=window.SolarExpertBundleComposer;
const sizing={voltage:12,panelWp:300,mpptA:35,mpptAIsAdvisory:true,batteryKwh:1,inverterW:900,peak:500};

const best=(products,requested=sizing)=>composer.compose(products,requested,seed.bundle_deals)
  .find(bundle=>bundle.tier==='best');
const baseline=best(seed.products);
const currentController=seed.products.find(p=>p.id==='mppt-victron-100-30');
const panel=seed.products.find(p=>p.id==='panel-victron-190');
assert.equal(currentController.rated_charge_a,30);
assert.equal(currentController.max_pv_w_by_voltage['12'],440);
assert.equal(currentController.max_pv_isc_a,35);
assert.equal(sizing.mpptA,35);
assert.equal(best(seed.products,{...sizing,mpptAIsAdvisory:false}).mppt.id,'mppt-victron-100-50',
  'An explicitly required minimum 35A must remain a real constraint for external consumers');
assert(!matcher.explain(currentController,sizing).pass,
  'The legacy 35A advisory was an actual hard-filter false negative');
assert.equal(baseline.complete,true);
assert.equal(baseline.priceComplete,true);
assert.equal(baseline.integratedMppt,false);
assert.equal(baseline.mppt.id,'mppt-victron-100-30',
  'Builder must include manufacturer-valid 30A unit for this 12V/300Wp scenario');
assert.equal(baseline.panel.product.id,panel.id);
assert.equal(baseline.panel.count,2);
assert.equal(baseline.panel.totalWp,380);
assert(baseline.panel.totalWp<=currentController.max_pv_w_by_voltage['12']);
assert(baseline.panel.parallel*panel.isc_a<=currentController.max_pv_isc_a*0.98);
assert(baseline.panel.coldStringVoc<currentController.max_pv_voc_v*0.98);
assert(baseline.panel.stringVmp>=currentController.min_pv_start_v_by_voltage['12']);
assert.equal(baseline.totalPrice,19026,
  'On the frozen 2026-11-07 merchant snapshot the safe smaller unit saves 1321 CZK');

// The real one-click Builder example asks for 700 Wp. The *electrical* MPPT
// fallback is checked below with an in-stock 1kWh bank, since the current
// catalog does not have a priced 1.8kWh 12V bank for that exact demo.
// Whole 190Wp panels require 4 x 190 = 760 Wp, so a 700Wp controller loses.
const preview=window.solarExpertBuilder();
preview.catalog=seed.products;
preview.bundleDeals=seed.bundle_deals;
preview.quickPreview();
assert.equal(preview.result.mpptAIsAdvisory,true);
assert.equal(preview.result.panelWp,700);
assert.equal(preview.result.voltage,12);
const largerPlan=best(seed.products,{...sizing,panelWp:preview.result.panelWp,mpptA:preview.result.mpptA});
assert.equal(largerPlan.complete,true);
assert.equal(largerPlan.priceComplete,true);
assert(largerPlan.panel.totalWp>=preview.result.panelWp);
assert(largerPlan.mppt.max_pv_w_by_voltage['12']>=largerPlan.panel.totalWp);
assert.equal(largerPlan.mppt.id,'mppt-victron-150-70',
  'A 760 Wp buyable panel plan must fall back beyond same-tier 700 Wp MPPTs');

const modified=(id,values)=>seed.products.map(product=>
  product.id===id?{...product,...values}:product);
const fallbackId='mppt-victron-100-50';

assert.equal(best(seed.products,{...sizing,panelWp:450,mpptA:50}).mppt.id,fallbackId,
  'Exceeding documented 440 Wp for 12V must still exclude 100/30');
assert.equal(best(modified(currentController.id,{max_pv_isc_a:8})).mppt.id,fallbackId,
  'Missing the array PV Isc limit must not be papered over by charge-current relaxation');
assert.equal(best(modified(currentController.id,{max_pv_voc_v:20})).mppt.id,fallbackId,
  'Cold string Voc must still reject a now-unsafe controller');
assert.equal(best(modified(currentController.id,{rated_charge_a:0})).mppt.id,fallbackId,
  'A regulator without documented positive battery charge current is never a valid candidate');
assert.equal(best(modified(currentController.id,{battery_voltages:[24]})).mppt.id,fallbackId,
  'Declared supported battery voltage must still be enforced');

const withoutVerifiedPanelIsc=seed.products.map(product=>
  product.type==='panel'?{...product,isc_a:0}:product);
assert.notEqual(best(withoutVerifiedPanelIsc).complete,true,
  'Builder must refuse a complete standalone MPPT system when no panel has Isc data');
console.log('Builder MPPT manufacturer-capacity safety: OK');
