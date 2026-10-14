'use strict';
/**
 * Exercise real selector functions with the verified catalog.
 * The examples must be real user interactions, not fake tool completions;
 * changing the values must not bypass electrical compatibility checks.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const catalog=JSON.parse(read('assets/data/product-seed.json')).products;
global.window={
  SolarExpertConfig:{catalogUrl:'/mock/product-seed.json',affiliateMap:{products:{},leads:{}},affiliateBases:{}},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');

const specs=[
  {kind:'battery',ctor:'solarExpertBatterySelector',part:'template-parts/battery-selector.php',
    examples:{
      panel400:{voltage:24,dailyKwh:0.7,autonomy:1,inverterW:800},
      cottage:{voltage:24,dailyKwh:1,autonomy:1,inverterW:1000},
      backup:{voltage:48,dailyKwh:3,autonomy:1,inverterW:2000}}},
  {kind:'mppt',ctor:'solarExpertMpptSelector',part:'template-parts/mppt-selector.php',
    examples:{
      single400:{voltage:24,panelWp:400,panelVoc:49,panelVmp:40,seriesCount:1},
      pair190:{voltage:12,panelWp:380,panelVoc:24,panelVmp:20,seriesCount:2}}},
  {kind:'inverter',ctor:'solarExpertInverterSelector',part:'template-parts/inverter-selector.php',
    examples:{
      cottage:{voltage:24,continuousW:1000,peakW:2000},
      backup:{voltage:48,continuousW:2000,peakW:4000}}}
];
for(const spec of specs){
  const markup=read(spec.part);
  assert(markup.includes('data-se-selector-examples="'+spec.kind+'"'),'Missing visible example card: '+spec.kind);
  const instance=window[spec.ctor]();
  instance.catalog=catalog;
  instance.catalogLoading=false;
  for(const [scenario,fields] of Object.entries(spec.examples)){
    assert(markup.includes("applyExample('"+scenario+"')"),'Model example not keyboard/click actionable: '+spec.kind+'/'+scenario);
    instance.applyExample(scenario);
    for(const [key,value] of Object.entries(fields)){
      assert.equal(instance[key],value,'Example '+spec.kind+'/'+scenario+' must update real electrical input '+key);
    }
    if(spec.kind!=='battery')assert(instance.inputValid,'Example must be internally valid: '+spec.kind+'/'+scenario);
    assert(instance.matches.length>0,'Verified catalog must contain compatible result for example '+spec.kind+'/'+scenario);
    assert(instance.matches.every(x=>x.product),'Example must use original ranked product records');
  }
  const events=window.dataLayer.filter(e=>e.event==='selector_engaged'&&e.selector===spec.kind);
  assert.equal(events.length,1,'Once-only engagement for real example interactions: '+spec.kind);
  assert(events[0].matchCount>0,'Engagement must count actual offers after valid calculation');
  instance.applyExample('unrecognized');
  assert.equal(window.dataLayer.filter(e=>e.event==='selector_engaged'&&e.selector===spec.kind).length,1,'Unknown scenarios must not count');
  window.dataLayer.length=0;
}
(async()=>{
  // Clicking a preset while the catalog is in flight must still be counted
  // once, after the catalog is ready; do not lose genuine early clicks.
  for(const spec of specs){
    window.dataLayer.length=0;
    let release;
    global.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({products:catalog})});});
    const instance=window[spec.ctor]();
    const initPromise=instance.init();
    const key=Object.keys(spec.examples)[0];
    instance.applyExample(key);
    assert.equal(instance.pendingExample,true,'Remember early selection while loading: '+spec.kind);
    release();
    await initPromise;
    assert.equal(instance.pendingExample,false,'Clear pending interaction after catalog ready');
    assert(instance.matches.length>0,'Early interaction must produce real compatible matches: '+spec.kind);
    assert.equal(window.dataLayer.filter(e=>e.event==='selector_engaged'&&e.selector===spec.kind).length,1,
      'Early click must count exactly once after loading: '+spec.kind);
  }
  console.log('PASS: seven genuine one-click selector scenarios, real matching and once-only engagement incl. early clicks');
})().catch(error=>{console.error(error);process.exitCode=1;});
