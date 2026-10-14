'use strict';
/**
 * Battery Selector: the article -> calculator route must carry only one
 * reviewed demonstration token, not arbitrary input from a URL. Loading it
 * is NOT selector engagement or product click; editing remains a real action.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const catalog=JSON.parse(read('assets/data/product-seed.json')).products;

global.window={
  location:{search:'?scenario=panel400'},
  dataLayer:[],
  SolarExpertConfig:{catalogUrl:'/fixtures/catalog.json'}
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');
global.fetch=async()=>({ok:true,json:async()=>({products:catalog})});
const events=()=>window.dataLayer.filter(x=>x.event==='selector_engaged'||x.event==='affiliate_click');

async function main(){
  const link=read('content/rewrites/jakou-baterii-k-solarnimu-panelu-400w.html');
  assert(link.includes('href="/vyber-baterii/?scenario=panel400"'),
    'Crawlable primary CTA must carry editorially reviewed model token');

  const sample=window.solarExpertBatterySelector();
  await sample.init();
  assert.equal(sample.articleExample,true,'Show honest source-specific example context');
  assert.equal(sample.voltage,24);
  assert.equal(sample.dailyKwh,.7);
  assert.equal(sample.autonomy,1);
  assert.equal(sample.inverterW,800);
  assert.equal(sample.requiredBatteryKwh,1.0);
  assert.equal(sample.requiredBatteryDcW,889);
  assert.equal(sample.requiredDischargeA,38);
  assert(sample.matches.length>0,'Real catalog must contain a compatible 400Wp model battery');
  assert(sample.matches.every(x=>x.totalEnergyWh>=1000),'Never bypass storage sizing via URL');
  assert(sample.matches.every(x=>x.dischargePowerW>=889),'Never bypass BMS DC discharge boundary');
  assert.equal(events().length,0,'Page load is not user engagement or a product click');

  // A page-level user interaction must still be counted only once.
  sample.applyExample('panel400');
  assert.equal(events().length,1);
  assert.equal(events()[0].selector,'battery');
  assert.equal(events()[0].matchCount,sample.matches.length);
  assert.equal(sample.articleExample,false,'Manual preset click removes inbound URL context');
  sample.applyExample('cottage');
  assert.equal(events().length,1,'Once-only genuine engagement across real changes');

  // Unknown input cannot change any field, inject a price or bypass matcher.
  window.dataLayer.length=0;
  window.location.search='?scenario=panel400&inverterW=999999&voltage=12&dailyKwh=0.01&merchant=evil';
  const injected=window.solarExpertBatterySelector();
  await injected.init();
  assert.equal(injected.voltage,24);
  assert.equal(injected.dailyKwh,.7);
  assert.equal(injected.inverterW,800);
  assert.equal(events().length,0);
  assert(injected.matches.every(x=>x.dischargePowerW>=889));

  window.location.search='?scenario=unknown';
  const unknown=window.solarExpertBatterySelector();
  await unknown.init();
  assert.equal(unknown.voltage,24);
  assert.equal(unknown.dailyKwh,1.5);
  assert.equal(unknown.inverterW,1200);
  assert.equal(unknown.articleExample,false);
  assert.equal(events().length,0);

  window.location.search='';
  const direct=window.solarExpertBatterySelector();
  await direct.init();
  assert.equal(direct.dailyKwh,1.5,'Ordinary Battery Selector defaults must stay unchanged');
  assert.equal(events().length,0);

  const markup=read('template-parts/battery-selector.php');
  assert(markup.includes("applyExample('panel400')"),
    'All visitors should be able to click the same real example');
  assert(markup.includes('data-se-article-example="panel400"')&&
    markup.includes('Před nákupem upravte spotřebu'),
    'Example is explicitly illustrative and editable');

  const tracker=read('assets/js/analytics.js');
  assert(tracker.includes("['/vyber-baterii','battery']"),
    'Tracking should still attribute the actual article-to-selector navigation');
  console.log('PASS: safe 400W article handoff, 700Wh/800W model, strict URL allowlist, no synthetic conversion, original user actions intact');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
