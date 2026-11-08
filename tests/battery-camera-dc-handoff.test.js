'use strict';
// 24h direct DC/PoE loads must not pay fictional 230V inverter losses.
// A human choosing a model is engagement; a URL visit is not.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-08T10:00:00Z')});
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const catalog=JSON.parse(read('assets/data/product-seed.json')).products;
global.window={
  location:{search:'?scenario=camera24h&voltage=48&inverterW=1&dailyKwh=0.01'},
  SolarExpertConfig:{catalogUrl:'/offline/products.json'},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');
global.fetch=async()=>({ok:true,json:async()=>({products:catalog})});
const events=()=>window.dataLayer.filter(x=>['selector_engaged','affiliate_click'].includes(x.event));

async function test(){
 const s=window.solarExpertBatterySelector();
 await s.init();
 assert.equal(s.supplyMode,'ac','Untrusted query cannot enable DC mode');
 assert.equal(s.voltage,24,'Untrusted query cannot change electrical voltage');
 assert.equal(s.dailyKwh,1.5,'Only exact allowlisted editorial URL presets are accepted');
 assert.equal(events().length,0,'Page load is not engagement');
 
 // The only model is selected by a deliberate CTA click, never automatic
 // query-string rewriting (exact native article HTML is separately pinned).
 s.applyExample('camera24h');
 assert.equal(s.supplyMode,'dc');
 assert.equal(s.voltage,12);
 assert.equal(s.dailyKwh,0.461);
 assert.equal(s.autonomy,2);
 assert.equal(s.inverterW,20);
 assert.equal(s.outputEfficiency,1,'No fictional 230V inverter for direct DC');
 assert.equal(s.inputValid,true);
 // Camera 6W + router 10W, 24h, plus 20% DC supply loss margin:
 assert.equal((6+10)*24,384);
 assert.equal(Math.round(384*1.2),461);
 assert.equal(s.requiredBatteryKwh,1.2,'2 days at 461Wh/day / 80% usable battery -> 1.2kWh nominal minimum');
 assert.equal(s.requiredBatteryDcW,20);
 assert.equal(s.requiredDischargeA,2,'20W / 12V class ~= 2A, BMS continuous gate');
 assert(s.matches.length>0,'Verified 12V battery catalog should have a technically plausible 100Ah model');
 assert(s.matches.some(x=>x.product.id==='battery-goowei-12-100'),'12V 100Ah candidate should fit 1.2kWh nominal');
 assert(s.matches.every(x=>x.product.system_voltage_class===12));
 assert(s.matches.every(x=>x.totalEnergyWh>=1200),'No under-sized battery reaches purchase results');
 assert(s.matches.every(x=>x.dischargePowerW>=20),'No undersized BMS path');
 assert.equal(events().length,1,'Only the real preset click counts as engagement');

 // A 230V model pays 90% inverter losses for energy AND continuous draw.
 s.applyExample('panel400');
 assert.equal(s.supplyMode,'ac','Switching presets clears the DC assumption');
 assert.equal(s.requiredBatteryKwh,1.0,'Existing 400Wp editorial model unchanged');
 assert.equal(s.requiredBatteryDcW,889);
 assert.equal(s.requiredDischargeA,38);
 assert.equal(events().length,1,'No repeated engagement after another click');

 s.applyExample('camera24h');
 assert.equal(s.supplyMode,'dc');
 s.dailyKwh=0;
 s.run(false);
 assert.equal(s.inputValid,false);
 assert.equal(s.matches.length,0,'No buyer offer for invalid zero energy');
 s.dailyKwh=Number.NaN;
 s.run(false);
 assert.equal(s.matches.length,0,'NaN cannot bypass the energy gate');
 s.dailyKwh=0.461;
 s.inverterW=-100;
 s.run(false);
 assert.equal(s.matches.length,0,'Negative requested DC power cannot bypass BMS checks');
 s.inverterW=20;
 s.supplyMode='any';
 s.run(false);
 assert.equal(s.matches.length,0,'Unknown supply mode may not bypass energy losses');
 s.supplyMode='dc';
 s.autonomy=2;
 s.voltage=12;
 s.run(false);
 assert(s.matches.length>0,'Manual corrected inputs recover safe buyer matches');
 assert.equal(events().length,1,'Background re-evaluation does not fake engagement');

 const ui=read('template-parts/battery-selector.php');
 assert(ui.includes('data-se-battery-dc-case="camera24h"'));
 assert(ui.includes("applyExample('camera24h')"));
 assert(ui.includes('se-battery-supply-mode'));
 assert(ui.includes('ztráty DC-DC/PoE'));
 assert(ui.includes('kompatibilitu DC napětí, PoE, jištění ani MPPT'));
 assert(ui.includes("x-show=\"!inputValid\""),'Unsafe inputs must be explained');
 const src=read('assets/js/selectors.js');
 assert(src.includes("supplyMode:'dc'"));
 assert(src.includes("this.supplyMode==='dc'?1:this.inverterEfficiency"));
 const originalTest=read('tests/battery-article-handoff.test.js');
 assert(originalTest.includes('panel400'),'Existing AC scenario regression must be kept');
 console.log('PASS: human-selected router/camera DC 461Wh/day -> honest 12V 100Ah battery, no fake AC loss or fake engagement');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
