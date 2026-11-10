'use strict';
/**
 * Real Builder composer regression: the first technically fitting part may
 * lack an attributable seller price. Preserve technical-only fallbacks, but
 * do not bury another fully priced, independently safe purchase path.
 *
 * Isolated synthetic products; no network requests, production mutations,
 * affiliate redirects, or invented merchant prices.
 */
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T16:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
const M=window.SolarExpertProductMatcher;
const B=window.SolarExpertBundleComposer;
const d='2026-11-10';
const stamp={tier:'best',verified_at:d,availability:'in_stock'};
const sizing={voltage:24,batteryKwh:1.2,inverterW:500,peak:650,mpptA:10,panelWp:200};
const battery={...stamp,id:'battery',name:'24V 3kWh',type:'battery',
  system_voltage_class:24,energy_wh:3000,max_discharge_a:100,parallel_max_units:1,price_czk:5000};
const panel={...stamp,id:'panel',name:'200Wp panel',type:'panel',
  rated_wp:200,voc_v:38,vmp_v:30,isc_a:8,cold_voc_factor:1.12,price_czk:2000};
const mppt={...stamp,id:'mppt',name:'24V MPPT',type:'mppt',
  battery_voltages:[24],rated_charge_a:30,max_pv_w_by_voltage:{'24':800},
  min_pv_start_v_by_voltage:{'24':20},max_pv_voc_v:150,max_pv_isc_a:30,price_czk:3000};
const unquoted={...stamp,id:'inverter-unquoted',name:'Better physical fit without price',type:'inverter',
  dc_voltage:24,continuous_w:520,peak_w:700,price_czk:null};
const quoted={...stamp,id:'inverter-quoted',name:'Quoted viable alternative',type:'inverter',
  dc_voltage:24,continuous_w:1200,peak_w:1500,price_czk:4000};
const base=[battery,panel,mppt];

assert.equal(M.effectivePrice(unquoted),Number.MAX_SAFE_INTEGER);
assert.equal(M.rank([unquoted,quoted],sizing)[0].product.id,'inverter-unquoted',
  'The problem is real: physical-fit ordering puts a no-price inverter first');
const chosen=B.compose([...base,unquoted,quoted],sizing).find(x=>x.tier==='best');
assert.equal(chosen.complete,true);
assert.equal(chosen.priceComplete,true,'Priced alternative must win over first no-price candidate');
assert.equal(chosen.inverter.id,'inverter-quoted');
assert.equal(chosen.totalPrice,14000,'Total must include only real component prices');

const fallback=B.compose([...base,unquoted],sizing).find(x=>x.tier==='best');
assert.equal(fallback.complete,true,'Keep a physical design when no seller price is proved');
assert.equal(fallback.priceComplete,false,'Technical-only fallback must not fabricate a price');
assert.equal(fallback.totalPrice,null);

const hybrid={...stamp,id:'hybrid-no-isc',name:'Hybrid lacks absolute Isc certificate',
  type:'inverter_hybrid',dc_voltage:24,continuous_w:510,peak_w:700,price_czk:3900,
  integrated_mppt:{
    evidence_complete_for_bundle:true,pv_w_max:1200,pv_voc_max:200,
    mppt_v_min:25,mppt_v_max:180,pv_tracker_count:1,pv_strings_per_tracker:1,
    pv_input_operating_a_per_tracker:15,pv_w_max_per_tracker:1200,
    pv_operating_current_source_url:'https://example.org/manufacturer-model',
    pv_isc_absolute_status:'unknown'
  }};
const chosenOverUnsafe=B.compose([...base,hybrid,quoted],sizing).find(x=>x.tier==='best');
assert.equal(chosenOverUnsafe.inverter.id,'inverter-quoted',
  'A priced hybrid missing absolute PV Isc proof cannot hide a safe standalone MPPT path');
assert.equal(chosenOverUnsafe.priceComplete,true);
assert.equal(chosenOverUnsafe.integratedMppt,false);

const uncertain=B.compose([...base,hybrid],sizing).find(x=>x.tier==='best');
assert.equal(uncertain.integratedMppt,true);
assert.equal(uncertain.pvIscVerified,false,'Do not claim an unsupported safety certificate');
assert.equal(uncertain.status,'pv_isc_limit_unverified');

console.log('PASS: Builder chooses priced safe combinations; preserves honest unquoted and Isc-blocked fallbacks');
