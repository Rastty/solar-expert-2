'use strict';
/**
 * Editorial article -> Builder handoff. A model preview is an input convenience,
 * NOT a user-start, completed calculator run, verified retailer price, or sale.
 * The URL can select one finite editor-owned example only; it cannot inject
 * numbers, product IDs, merchant choices, analytics actions or prices.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

global.window={
  location:{search:'?scenario=fridge230&watts=999999&price=1&merchant=evil'},
  dataLayer:[],
  SolarExpertConfig:{catalogUrl:'/fixture/no-requests-on-read'}
};
global.fetch=async()=>({ok:true,json:async()=>({products:[],bundle_deals:[]})});
window.SolarExpertBundleComposer={compose(){return[];}};
require('../assets/js/builder.js');

const model=()=>window.solarExpertBuilder();
const activity=()=>window.dataLayer.filter(e=>['builder_step','solar_builder_complete','affiliate_click','tool_start','tool_activation'].includes(e.event));

async function main(){
 const article=read('content/rewrites/solarni-sestava-na-chatu-pro-lednici.html');
 assert(article.includes('href="/solarni-panel-pro-wifi-kameru-a-router-na-chate/"') && article.includes('není</strong> zahrnutá v modelových 850 Wh/den'),
   'Fridge buyer guide must route always-on camera/router load to the dedicated live 24h guide, not silently fold it into 850 Wh');
 const markup=read('template-parts/solar-builder.php');
 const js=read('assets/js/builder.js');
 assert(article.includes('href="/solarni-sestava-na-chatu/?scenario=fridge230#builder"'),
   'Buyer article must link directly to the editable model with #builder anchor');
 assert(article.includes('850 Wh')&&article.includes('65 W × 10')&&article.includes('20 W × 5')&&article.includes('50 W × 2'),
   'Model math and its public caveats must be in source editorial copy');
 assert(markup.includes('data-se-article-example="fridge230"')&&markup.includes('Nejde o naměřené hodnoty'),
   'The inline Builder must honestly identify the illustrative origin');
 assert(markup.includes('x-model.number="a.watts"')&&markup.includes('min="1" max="10000"'),
   'Real appliance wattage must be editable within the input bound');
 assert(js.includes("params.get('scenario')!=='fridge230'"),
   'No open-ended URL sizing or merchant injection is permitted');

 const inbound=model();
 assert.equal(inbound.step,1,'Before loading URL example does not automatically calculate');
 await inbound.init();
 assert.equal(inbound.articleExample,true,'Public editorial scenario should be recognized');
 assert.equal(inbound.step,2,'Skip empty chooser, land in editable appliance step');
 assert.equal(inbound.scenario,'chata');
 assert.equal(inbound.dailyWh,850,'65×10 + 20×5 + 50×2 must equal the article model');
 assert.equal(inbound.catalogReady,true,'Normal catalog loading still runs');
 assert.deepEqual(inbound.selectedAppliances.map(x=>x.id),['fridge','lights','laptop']);
 assert.deepEqual(inbound.selectedAppliances.map(x=>x.watts),[65,20,50]);
 assert.deepEqual(inbound.selectedAppliances.map(x=>x.hours),[10,5,2]);
 assert.equal(inbound.previewMode,false);
 assert.equal(inbound.result,null,'A page load is not a sizing-complete event');
 assert.equal(activity().length,0,'Landing page must not fabricate starts, activations or completion');

 // Real measurements override a disclosed example, not query parameters.
 inbound.appliances.find(a=>a.id==='fridge').watts=75;
 assert.equal(inbound.dailyWh,950);
 assert(inbound.estimatedPeak>=inbound.runningWatts);
 inbound.advanceToUsage();
 assert.equal(inbound.step,3,'First explicit user action advances normally');
 assert.deepEqual(activity().map(e=>e.status),['step_2','step_3'],
   'Only the genuine continue action creates two progress markers, no passive page-load event');
 inbound.calc();
 assert.equal(inbound.step,4);
 assert.equal(inbound.result.energyWh,950);
 assert.equal(window.dataLayer.filter(e=>e.event==='solar_builder_complete').length,1,
   'Normal user-initiated computation stays measurable');

 inbound.reset();
 assert.equal(inbound.step,1);
 assert.equal(inbound.articleExample,false);
 assert.equal(inbound.dailyWh,0);
 assert.equal(inbound.appliances.find(a=>a.id==='fridge').watts,70);
 assert.equal(inbound.appliances.find(a=>a.id==='lights').watts,40);
 assert.equal(inbound.appliances.find(a=>a.id==='laptop').watts,65);
 inbound.preset('chata');
 assert.equal(inbound.dailyWh,1448,'Normal homepage cottage preset must be unaffected by inbound example');

 window.dataLayer.length=0;
 window.location.search='?scenario=not-approved&watts=1';
 const invalid=model();
 await invalid.init();
 assert.equal(invalid.step,1);
 assert.equal(invalid.articleExample,false);
 assert.equal(invalid.dailyWh,0);
 assert.equal(activity().length,0,'Unrecognized links do not emit fake activity');

 window.location.search='?scenario=fridge230';
 const failed=model();
 await failed.init();
 failed.appliances.find(a=>a.id==='fridge').watts=0;
 failed.advanceToUsage();
 assert.equal(failed.step,2,'Invalid editable watts must block sizing');
 assert.match(failed.inputError,/příkon/);
 assert.equal(failed.result,null);
 failed.appliances.find(a=>a.id==='fridge').watts=10001;
 failed.advanceToUsage();
 assert.equal(failed.step,2,'Above max watts must also block');
 assert.match(failed.inputError,/10 000 W/);

 // Opening the ordinary first-step quick preview after arriving from article
 // must restore the original generic wattage, not silently reuse 850Wh data.
 const fromGuide=model();
 await fromGuide.init();
 fromGuide.quickPreview();
 assert.equal(fromGuide.previewMode,true);
 assert.equal(fromGuide.articleExample,false);
 assert.equal(fromGuide.dailyWh,1448);
 assert.equal(window.dataLayer.filter(e=>e.event==='solar_builder_complete').length,0,
   'Quick preview must not claim personalized Builder completion');

 // Real frontend attribution, not a fabricated server referral. The direct
 // article link must be counted only AFTER a real visitor click; query/fragment
 // must not make the destination fail the same-origin route allowlist.
 const listenerMap={};
 const requests=[];
 const articleLocation={
   href:'https://solar-expert.cz/solarni-sestava-na-chatu-pro-lednici/',
   pathname:'/solarni-sestava-na-chatu-pro-lednici/',
   origin:'https://solar-expert.cz'
 };
 const analyticDocument={
   readyState:'complete',body:{},
   querySelector(){return null;},
   querySelectorAll(){return [];},
   addEventListener(type,callback){(listenerMap[type]||(listenerMap[type]=[])).push(callback);}
 };
 const analyticWindow={
   location:articleLocation,dataLayer:[],
   SolarExpertAnalyticsConfig:{endpoint:'/wp-json/solar-expert/v1/track'}
 };
 vm.runInNewContext(read('assets/js/analytics.js'),{
   window:analyticWindow,document:analyticDocument,URL,console,
   fetch(url,options){requests.push({url,body:JSON.parse(options.body)});return Promise.resolve({ok:true});},
   setTimeout(){return 1;},clearTimeout(){}
 },{filename:'analytics.js'});
 assert.equal(requests.length,0,'Rendering an article link must not fabricate a referral click');
 const targetHref='https://solar-expert.cz/solarni-sestava-na-chatu/?scenario=fridge230#builder';
 for(const callback of listenerMap.click||[]){
   callback({target:{closest(selector){return selector==='a[href]'?{href:targetHref}:null;}}});
 }
 const inboundClicks=requests.filter(x=>x.body.event==='tool_referral_click');
 assert.equal(inboundClicks.length,1,'One actual article click must count exactly one tool referral');
 assert.equal(inboundClicks[0].body.tool,'builder','Query/fragment must retain owned Builder route');
 assert.equal(inboundClicks[0].body.page,'solarni-sestava-na-chatu-pro-lednici',
   'First-party analytics must attribute the referral to the actual buyer guide');
 assert.equal(requests.filter(x=>x.body.event==='affiliate_click').length,0,
   'Article navigation is not an affiliate click or sale');

 console.log('PASS: fridge article 850Wh model, strict token, honest prefill, editable watts, no synthetic starts, reset and surge guard');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
