'use strict';
/** Builder and Battery Selector must use the same AC energy/DC BMS model.
 * This is an offline regression: no real clicks, price edits or WP writes.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-17T12:00:00Z')});
global.window={SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}},dataLayer:[]};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');
require('../assets/js/builder.js');

const catalog=require('../data/product-seed.json');
const builder=()=>{
  const b=window.solarExpertBuilder();
  b.catalog=catalog.products;
  b.bundleDeals=catalog.bundle_deals;
  return b;
};
const B=window.SolarExpertBundleComposer;

for(const [scenario,wh,nominalKwh,dcW] of [
  ['chata',1448,2.1,334],
  ['offgrid',1718,2.4,445],
  ['backup',1188,1.7,334],
  ['pond',840,1.2,334]
]){
  const b=builder();
  b.preset(scenario);
  b.calc();
  assert.equal(b.result.energyWh,wh);
  assert.equal(b.result.batteryKwh,nominalKwh,
    `${scenario}: AC nominal energy = rounded Wh / (0.80*0.90)`);
  assert.equal(b.result.batteryDcW,dcW,
    `${scenario}: DC BMS discharge screen = ceil(inverter AC W / 0.90)`);
  assert(b.primaryShoppingList && b.primaryShoppingList.total>0,
    `${scenario}: existing proven purchase path stays intact`);
  assert.equal(b.primaryShoppingList.total,b.primaryBundle.totalPrice,
    `${scenario}: never invent or change a seller quote`);
}

const s=window.solarExpertBatterySelector();
s.voltage=24;s.dailyKwh=.7;s.autonomy=1;s.inverterW=900;
const b=builder();
b.selectPresetAppliances('chata');
b.appliances.forEach(x=>{x.selected=false;});
b.appliances.find(x=>x.id==='lights').selected=true;
b.appliances.find(x=>x.id==='lights').watts=70;
b.appliances.find(x=>x.id==='lights').hours=10;
b.manualPeak=900;
b.calc();
// Builder sizing preserves AC output W in its own calculator, and passes the
// DC-side requirement as a separate field to the battery-bank matcher.
assert.equal(b.result.batteryKwh,s.requiredBatteryKwh);
assert.equal(b.result.batteryDcW,Math.ceil(b.result.inverterW/.9));
assert.equal(s.requiredBatteryDcW,1000);

const base=catalog.products.find(p=>p.id==='battery-goowei-24-50');
assert(base && base.max_discharge_a===40);
const lowBms={...base,parallel_max_units:1};
const dcOnly={voltage:24,batteryKwh:1,inverterW:900,batteryDcW:1000};
assert(B.batteryBankCandidatesAll([lowBms],{...dcOnly,batteryDcW:undefined}).length>0,
  'Legacy caller with 900W DC requirement remains accepted at 24V*40A=960W');
assert.equal(B.batteryBankCandidatesAll([lowBms],dcOnly).length,0,
  '900W AC with 1000W DC battery draw must reject 24V 40A BMS');
assert(B.batteryBankCandidatesAll([lowBms],{...dcOnly,inverterW:800,batteryDcW:889}).length>0,
  '800W AC with 889W DC battery draw may pass if nominal energy is sufficient');

const pumphouse=builder();
pumphouse.preset('chata');pumphouse.toggle('pump');pumphouse.calc();
assert.equal(pumphouse.result.batteryKwh,2.6);
assert.equal(pumphouse.result.nominalVoltage,24);
assert.equal(pumphouse.completeBundles.length,0);
assert.equal(pumphouse.primaryShoppingList,null,
  '2.56kWh nominal stock cannot be falsely sold for a 2.6kWh requirement');
pumphouse.autonomy=.5;
pumphouse.calc();
assert.equal(pumphouse.result.batteryPeakDcW,Math.ceil(pumphouse.result.peak/0.90));
assert.equal(pumphouse.primaryShoppingList,null,
  'Reducing autonomy cannot make a 24V BMS able to supply an unsafe AC well-pump start surge');
assert(pumphouse.result.riskFlags.some(w=>w.includes('BMS')),
  'Explain the distinct battery surge-current constraint rather than silently dropping the bill');

const html=fs.readFileSync(path.join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
assert(html.includes('data-se-builder-ac-battery-assumptions="true"'));
assert(html.includes('80 % využitelné') && html.includes('90 % účinností'));
assert(html.includes('result?.batteryDcW'));
assert(html.includes('klidový odběr měniče'));
console.log('PASS: Builder AC-to-DC battery capacity and BMS guard parity, exact catalog and honest incomplete quote');
