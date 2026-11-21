'use strict';
/** No-result buyer recovery: preserve manual work and name a real catalog
 * capacity shortage without manufacturing a smaller safe-looking quote.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-17T12:00:00Z')});
global.window={SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}},dataLayer:[]};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
const catalog=require('../data/product-seed.json');
const builder=()=>{
  const b=window.solarExpertBuilder();
  b.catalog=catalog.products;b.bundleDeals=catalog.bundle_deals;b.catalogReady=true;
  return b;
};

const b=builder();
b.preset('chata');b.toggle('pump');b.calc();
assert.equal(b.result.batteryKwh,2.6);
assert.equal(b.result.voltage,24);
assert.equal(b.completeBundles.length,0);
assert.equal(b.primaryShoppingList,null);
assert.deepEqual(b.batteryCapacityGap,{voltage:24,requiredKwh:2.6,availableKwh:2.56,missingWh:40},
  'Explain 40 Wh gap against real 2.56kWh stock without selling a short battery');
assert.equal(window.dataLayer.filter(x=>x.event==='affiliate_click').length,0);
// Date-expired stock snapshots are not reliable as currently stocked battery
// coverage; do not report them as a present-day catalogue capacity ceiling.
mock.timers.setTime(Date.parse('2026-12-10T12:00:00Z'));
assert.equal(b.batteryCapacityGap,null);
mock.timers.setTime(Date.parse('2026-11-17T12:00:00Z'));

const chosen=b.selectedAppliances.map(a=>[a.id,a.watts,a.hours,a.qty]);
const completeCount=window.dataLayer.filter(x=>x.event==='solar_builder_complete').length;
b.editPreview();
assert.equal(b.step,2);
assert.equal(b.previewMode,false);
assert.deepEqual(b.selectedAppliances.map(a=>[a.id,a.watts,a.hours,a.qty]),chosen,
  'Revise preserves selected appliances, watts, hours and quantity');
assert.equal(b.autonomy,1);
assert.equal(b.season,'three');
assert.equal(window.dataLayer.filter(x=>x.event==='solar_builder_complete').length,completeCount,
  'Revising a result must not fake another completed calculation');
b.advanceToUsage();
assert.equal(b.step,3);
b.autonomy=.5;
b.calc();
assert.equal(b.primaryShoppingList,null,
  'Reducing energy reserve alone cannot remove the AC pump BMS start-current constraint');
assert.equal(b.batteryCapacityGap,null,
  'The capacity deficit may disappear even when an independent BMS surge limit remains unsafe');
assert(b.result.riskFlags.some(msg=>msg.includes('BMS')),
  'Buyer must understand why a smaller battery does not unlock the shopping list');
b.toggle('pump'); // A genuinely changed load removes the high startup demand.
b.calc();
assert(b.primaryShoppingList?.total>0,
  'Removing the modeled high-surge AC pump restores a supported quoted configuration');
assert.equal(b.batteryCapacityGap,null,'Do not show a shortage beside a complete recommendation');

const usual=builder();
usual.preset('chata');usual.calc();
assert(usual.completeBundles.length>0);
assert.equal(usual.batteryCapacityGap,null);

const loading=builder();
loading.catalogReady=false;loading.preset('chata');loading.toggle('pump');loading.calc();
assert.equal(loading.batteryCapacityGap,null,'No claim before catalog has loaded');

const html=fs.readFileSync(path.join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
assert(html.includes('data-se-builder-capacity-gap="true"'));
assert(html.includes('x-show="batteryCapacityGap"'));
assert(html.includes('Slabší baterii nedoporučíme'));
assert(html.includes('data-se-builder-revise-without-reset="true"'));
assert(html.includes('@click="editPreview(); $nextTick(() => { $refs.builderHeading.focus'));
assert(html.includes("$refs.builderHeading.scrollIntoView({behavior:'smooth',block:'start'})"));
assert(html.includes('@click="reset()">Začít znovu'));
console.log('PASS: exact battery shortfall, source-date guard and non-destructive result revision');
