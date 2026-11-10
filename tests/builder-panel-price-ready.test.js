'use strict';
/**
 * Panel plan price evidence must be purchased from the SAME merchant that
 * verified the listing; the best physical fit may have no current price.
 * Synthetic fixture only: no network, merchant or WordPress side effects.
 */
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T18:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
const B=window.SolarExpertBundleComposer;
const M=window.SolarExpertProductMatcher;
const stamp={tier:'best',availability:'in_stock',verified_at:'2026-11-10'};
const sizing={voltage:24,batteryKwh:1.2,inverterW:500,peak:650,mpptA:10,panelWp:200};
const battery={...stamp,id:'battery',type:'battery',system_voltage_class:24,
  energy_wh:3000,max_discharge_a:100,parallel_max_units:1,price_czk:5000};
const inverter={...stamp,id:'inverter',type:'inverter',dc_voltage:24,
  continuous_w:600,peak_w:800,price_czk:4000};
const mppt={...stamp,id:'mppt',type:'mppt',battery_voltages:[24],rated_charge_a:30,
  max_pv_w_by_voltage:{'24':800},min_pv_start_v_by_voltage:{'24':20},
  max_pv_voc_v:150,max_pv_isc_a:30,price_czk:3000};
const panel=(id,rated_wp,price,overrides={})=>({
  ...stamp,id,type:'panel',rated_wp,voc_v:38,vmp_v:30,isc_a:8,
  cold_voc_factor:1.12,price_czk:999,
  offers:[{merchant:'battery-cz',source_url:'https://www.battery.cz/'+id+'/',
    verified_at:'2026-11-10',availability:'in_stock',price_czk:price}],
  ...overrides
});
const noPrice=panel('unquoted-200',200,null);
const verified=panel('verified-250',250,1900);
const badSeller=panel('mismatched-220',220,1600,{
  offers:[{merchant:'battery-cz',source_url:'https://www.ampul.eu/mismatched-220/',
    verified_at:'2026-11-10',availability:'in_stock',price_czk:1600}]
});
const stale=panel('stale-210',210,1000,{
  offers:[{merchant:'battery-cz',source_url:'https://www.battery.cz/stale-210/',
    verified_at:'2026-09-01',availability:'in_stock',price_czk:1000}]
});
const unsafeIsc=panel('unsafe-200',200,900,{isc_a:50});
const tooHighVoc=panel('over-voc-200',200,900,{voc_v:180});
const core=[battery,inverter,mppt];
assert.equal(M.effectivePrice(noPrice),Number.MAX_SAFE_INTEGER);
assert.equal(M.effectivePrice(badSeller),Number.MAX_SAFE_INTEGER);
assert.equal(M.effectivePrice(stale),Number.MAX_SAFE_INTEGER);
assert.equal(M.effectivePrice(verified),1900);
const physicalOnly=B.findPanelPlan([noPrice,verified],sizing,mppt,false,'best');
assert.equal(physicalOnly.product.id,'verified-250',
  'Only among electrically valid panel plans, select available verified price over unquoted exact fit');
assert.equal(physicalOnly.quoteReady,true);
const chosen=B.compose([...core,noPrice,verified,badSeller,stale,unsafeIsc,tooHighVoc],sizing,[])
  .find(b=>b.tier==='best');
assert.equal(chosen.complete,true);
assert.equal(chosen.priceComplete,true,'Builder should expose an independently verifiable priced bill');
assert.equal(chosen.panel.product.id,'verified-250');
assert.equal(chosen.totalPrice,13900,'Quoted panel price must not inherit a parent-level phantom price');
const allNoPrice=B.compose([...core,noPrice,badSeller,stale],sizing,[])
  .find(b=>b.tier==='best');
assert.equal(allNoPrice.complete,true,'If no panel has source-backed price keep technical design');
assert.equal(allNoPrice.panel.product.id,'unquoted-200','Fallback must retain original best technical score');
assert.equal(allNoPrice.panel.quoteReady,false);
assert.equal(allNoPrice.priceComplete,false,'Never manufacture price from wrong seller or expired offers');
assert.equal(allNoPrice.totalPrice,null);
const safety=B.compose([...core,noPrice,unsafeIsc,tooHighVoc],sizing,[])
  .find(b=>b.tier==='best');
assert.equal(safety.panel.product.id,'unquoted-200',
  'Priced but unsafe Isc/Voc panels must never outrank a technically valid unquoted plan');
assert.equal(safety.priceComplete,false);
console.log('PASS: panel selection prefers source-priced safe fit and never accepts wrong-shop, stale or unsafe quotes');
