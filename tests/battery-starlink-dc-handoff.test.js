'use strict';
// Real buyer scenario: Starlink Mini 30W × 24h × 1.15 = 828Wh/day,
// a 2-day LiFePO4 DC system, WITHOUT imaginary AC inverter loss.
// Explicit CTA engagement is distinct from an editorial referral page load.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-09T19:00:00Z')});
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const catalog=JSON.parse(read('assets/data/product-seed.json')).products;
global.window={
  location:{search:'?scenario=starlinkmini&voltage=48&dailyKwh=.001&inverterW=1&merchant=fake'},
  SolarExpertConfig:{catalogUrl:'/mock/catalog.json'},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');
global.fetch=async()=>({ok:true,json:async()=>({products:catalog})});
const events=()=>window.dataLayer.filter(x=>x.event==='selector_engaged');

(async()=>{
  const selection=window.solarExpertBatterySelector();
  await selection.init();
  assert.equal(selection.articleExample,true,'Only fixed, audited editorial tokens may prefill inputs');
  assert.equal(selection.articleExampleKind,'starlinkmini');
  assert.equal(selection.activeScenario,'starlinkmini');
  assert.equal(selection.voltage,12,'Untrusted voltage query cannot override published illustrative model');
  assert.equal(selection.dailyKwh,.828,'Untrusted energy query cannot override measured/model distinction');
  assert.equal(selection.inverterW,60,'Untrusted DC watts cannot weaken the BMS screen');
  assert.equal(selection.supplyMode,'dc');
  assert.equal(selection.autonomy,2);
  assert.equal(events().length,0,'A passive article referral must NEVER count as selector engagement');

  // A human one-clicks the visible calculator example.
  selection.applyExample('starlinkmini');
  assert.equal(selection.articleExample,false,'Human preset choice clears article referral banner');
  assert.equal(selection.inputValid,true);
  assert.equal(selection.outputEfficiency,1,'No 230V inverter in direct DC model');
  assert.equal(30*24*1.15,827.9999999999999);
  assert.equal(Math.round(30*24*1.15),828);
  assert.equal(selection.requiredBatteryKwh,2.1,'828Wh/day × 2 days / 80% => 2.1kWh nominal');
  assert.equal(selection.requiredBatteryDcW,60,'60W is BMS design input, not continuous measured draw');
  assert.equal(selection.requiredDischargeA,5,'60W / 12V design class => 5A nominal BMS minimum');
  assert(selection.matches.length>0,'Verified catalog must present at least one matched buyer product');
  assert(selection.matches.some(x=>x.product.id==='battery-goowei-12-200'),
    'The 2.56kWh 12V 200Ah module must pass energy and BMS sizing');
  assert(!selection.matches.some(x=>x.product.id==='battery-goowei-12-100'),
    '12V 100Ah nominal 1.28kWh must NEVER be sold as sufficient for 2.1kWh');
  assert(selection.matches.every(x=>x.totalEnergyWh>=2100));
  assert(selection.matches.every(x=>x.dischargePowerW>=60));
  assert(selection.matches.every(x=>x.product.system_voltage_class===12));
  assert.equal(events().length,1,'One genuine click counts exactly once');
  assert.equal(events()[0].scenario,'starlinkmini');
  assert.equal(events()[0].batteryKwh,2.1);
  assert(events()[0].matchCount>0);

  // Changes of assumptions still recompute rather than retaining old offers.
  selection.dailyKwh=1.104;selection.run(false);
  assert.equal(selection.requiredBatteryKwh,2.8,'40W / 24h +15% for 2d needs 2.8kWh');
  assert(selection.matches.every(x=>x.totalEnergyWh>=2800),'No smaller bank offered as suitable');
  selection.dailyKwh=0;selection.run(false);
  assert.equal(selection.matches.length,0,'Zero daily energy cannot match');
  selection.dailyKwh=.828;selection.inverterW=-1;selection.run(false);
  assert.equal(selection.matches.length,0,'Negative power cannot bypass discharge checks');
  selection.inverterW=60;selection.supplyMode='invalid';selection.run(false);
  assert.equal(selection.matches.length,0,'Unknown supply mode fails closed');
  selection.supplyMode='dc';selection.run(false);
  assert(selection.matches.length>0,'Corrected real inputs recover matches');
  assert.equal(events().length,1,'Background recalculation is not a new user interaction');

  // Another buyer scenario clears the Starlink energy and DC model.
  selection.applyExample('panel400');
  assert.equal(selection.supplyMode,'ac');
  assert.equal(selection.requiredBatteryKwh,1.0);
  assert.equal(events().length,1,'Repeat buttons must not inflate selector engagements');
  // An unknown token is ignored rather than interpreted as raw URL numbers.
  window.location.search='?scenario=starlinkmini-unsafe&voltage=48&dailyKwh=.001';
  const unknown=window.solarExpertBatterySelector();
  await unknown.init();
  assert.equal(unknown.articleExample,false);
  assert.equal(unknown.dailyKwh,1.5);
  assert.equal(unknown.voltage,24);
  assert.equal(events().length,1);

  const ui=read('template-parts/battery-selector.php');
  assert(ui.includes('data-se-battery-dc-case="starlinkmini"'));
  assert(ui.includes("applyExample('starlinkmini')"));
  assert(ui.includes('data-se-article-example="starlinkmini"'));
  assert(ui.includes('828 Wh/den'));
  assert(ui.includes('stabilizaci DC') && ui.includes('BMS a jištění'),
    'Buyer must not confuse battery fit with Starlink USB-C/DC electrical certification');
  const js=read('assets/js/selectors.js');
  assert(js.includes('Object.prototype.hasOwnProperty.call(this.editorialExamples,scenario)'),
    'A strict approved scenario allowlist is required');
  assert(!js.includes('params.get("voltage")')&&!js.includes("get('dailyKwh')"),
    'No user-controlled URL numeric values may alter safety decisions');
  console.log('PASS: Starlink Mini 24h battery: 828Wh/day, DC 2d 2.1kWh, 12V 200Ah eligible, 100Ah excluded; one real engagement only');
})().catch(error=>{console.error(error);process.exitCode=1;});
