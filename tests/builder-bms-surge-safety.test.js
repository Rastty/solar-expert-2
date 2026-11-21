'use strict';
// A 230V pump/compressor surge at the inverter output still needs sufficient
// DC discharge current from the BATTERY BANK. An inverter peak-W claim does
// not certify the BMS transient limit. Pure synthetic, no network or writes.
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-21T08:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},dataLayer:[],
 SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
require('../assets/js/affiliate-adapter.js');

const b=window.solarExpertBuilder();
b.appliances.forEach(a=>a.selected=a.id==='pump');
b.season='three';b.autonomy=1;b.calc();
assert.equal(b.result.peak,2200);
assert.equal(b.result.inverterW,1000);
assert.equal(b.result.nominalVoltage,24);
assert.equal(b.result.batteryDcW,Math.ceil(1000/0.90));
assert.equal(b.result.batteryPeakDcW,Math.ceil(2200/0.90));
assert(b.result.riskFlags.some(s=>s.includes('BMS')));

const battery=(maxA,id='test-battery')=>({
 id,type:'battery',name:id,tier:'best',system_voltage_class:24,
 energy_wh:2560,max_discharge_a:maxA,parallel_max_units:1,
 verified_at:'2026-11-20',availability:'in_stock',price_czk:9999
});
const composer=window.SolarExpertBundleComposer;
const sizing={voltage:24,batteryKwh:0.6,batteryDcW:1112,batteryPeakDcW:2445,inverterW:1000};
const insufficient=battery(100); // 24 V × 100 A = 2400 W < 2445 W DC surge
assert.equal(composer.batteryBankCandidatesAll([insufficient],sizing).length,0,
 'A 24V/100A battery may pass continuous draw but cannot support a 2200W AC startup under modeled losses');
const sufficient=battery(120);
let safe=composer.batteryBankCandidatesAll([sufficient],sizing);
assert.equal(safe.length,1);
assert.equal(safe[0].dischargePowerW,2880);

const continuousOnly=composer.batteryBankCandidatesAll([insufficient],
 {...sizing,batteryPeakDcW:undefined});
assert.equal(continuousOnly.length,1,
 'Legacy callers without a modeled surge preserve the continuous current contract');

assert.equal(composer.batteryBankCandidatesAll([sufficient],
 {...sizing,batteryPeakDcW:Infinity}).length,0,
 'Nonsensical peak evidence must never authorize an unsafe bank');
assert.equal(composer.batteryBankCandidatesAll([sufficient],
 {...sizing,batteryPeakDcW:-10}).length,0,
 'Invalid negative peak requirements must fail closed');

// No prices, inventory dates, URLs or affiliate clicks are invented by sizing.
assert.equal(window.dataLayer.filter(e=>e.event==='affiliate_click').length,0);
console.log('PASS: modeled 230V AC startup surge requires conservatively evidenced battery-bank BMS current');
