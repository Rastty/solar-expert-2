import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const live=process.env.SOLAR_HOME_SCENARIO_PROOF==='live';
const report={mode:live?'live_no_injection':'preview_injected',status:'not_verified',scenarios:[],analytics_posts_delivered:0,external_visits:0,wordpress_writes:0};
let browser;
try{
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812},reducedMotion:'reduce'});
 await ctx.route('**/*',async r=>{
  const q=r.request(),u=new URL(q.url());
  if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')))return r.continue();
  return r.abort('blockedbyclient');
 });
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message)));
 const group=page.locator('[data-se-home-scenarios="v1"]');
 const state=()=>page.evaluate(()=>{const s=window.Alpine.$data(document.querySelector('#builder'));return {step:s.step,scenario:s.scenario,selected:s.selectedAppliances.map(x=>x.id),dailyWh:s.dailyWh,preview:s.previewMode,energy:s.result?.energyWh};});
 async function home(){
  assert.equal((await page.goto(SITE+'/?solar_home_scenario_proof=20261127',{waitUntil:'domcontentloaded'})).status(),200);
  await page.waitForFunction(()=>{const e=document.querySelector('#builder'),s=e&&window.Alpine?.$data(e);return s&&s.catalogReady&&!s.catalogLoading&&typeof window.SolarExpertAnalytics?.track==='function';},null,{timeout:35000});
  if(!live)await page.addScriptTag({path:'assets/js/home-direct-scenarios.js'});
  await group.waitFor({state:'visible'});
  assert.equal(await group.count(),1);
  assert.equal(await group.locator('button').count(),3);
  assert.equal(await page.locator('[data-se-home-demo="builder-preview"]').count(),1);
  assert.equal((await state()).step,1);
 }
 for(const [id,expected] of [['chata',['fridge','lights','laptop','router']],['offgrid',['fridge','lights','laptop','router','tv']],['backup',['fridge','lights','router']]]){
  await home();
  const button=group.locator('[data-se-home-scenario="'+id+'"]');
  await button.evaluate(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true,button:0})));
  assert.equal((await state()).step,1);
  const initial=await button.boundingBox();
  assert.ok(initial&&initial.width>0);
  await button.click();
  await group.waitFor({state:'hidden'});
  const s=await state();
  assert.equal(s.step,2);assert.equal(s.scenario,id);assert.deepEqual(s.selected,expected);
  await page.waitForFunction(()=>document.activeElement===document.querySelector('#builder h2'));
  assert.equal(await page.locator('.se-hero-actions a[href="#builder"]').filter({hasText:'Spočítat vlastní sestavu'}).isVisible(),true);
  const events=await page.evaluate(()=>window.dataLayer.filter(x=>['tool_start','tool_activation','builder_step','solar_builder_complete'].includes(x.event)).map(x=>({event:x.event,tool:x.tool,status:x.status,scenario:x.scenario})));
  assert.equal(events.filter(x=>x.event==='tool_activation'&&x.tool==='builder').length,1);
  assert.equal(events.filter(x=>x.event==='tool_start'&&x.tool==='builder').length,1);
  assert.equal(events.filter(x=>x.event==='builder_step'&&x.status==='step_2'&&x.scenario===id).length,1);
  assert.equal(events.filter(x=>x.event==='solar_builder_complete').length,0);
  report.scenarios.push({id,step:s.step,selected:s.selected,dailyWh:s.dailyWh,activation_events:1,initial_button_bottom:Math.round(initial.y+initial.height)});
  if(id==='chata'){
   await page.evaluate(()=>window.Alpine.$data(document.querySelector('#builder')).appliances.find(a=>a.id==='fridge').hours=8);
   await page.locator('.se-hero-actions a[href="#builder"]').filter({hasText:'Spočítat vlastní sestavu'}).click();
   assert.equal((await state()).dailyWh,1308);
   await page.locator('[data-se-builder-custom-fast="v1"]').click();
   await page.waitForFunction(()=>window.Alpine.$data(document.querySelector('#builder')).step===4);
   const result=await state();assert.equal(result.energy,1308);assert.equal(result.preview,false);
   report.customized_result_wh=result.energy;
  }
 }
 await home();
 await page.locator('[data-se-home-demo="builder-preview"]').click();
 await page.waitForFunction(()=>window.Alpine.$data(document.querySelector('#builder')).step===4);
 assert.equal((await state()).preview,true);
 report.original_demo_preserved=true;
 await page.goto(SITE+'/solarni-sestava-na-chatu/',{waitUntil:'domcontentloaded'});
 assert.equal(await group.count(),0);
 assert.equal(errors.length,0);
 report.status='browser_verified';
 await ctx.close();
}catch(e){report.failure=String(e.message).split('\n')[0].slice(0,200);}
finally{if(browser)await browser.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/solar-home-direct-scenarios-browser.json',JSON.stringify(report,null,2));console.log('SOLAR_HOME_SCENARIOS_BROWSER '+JSON.stringify(report));}
if(report.status!=='browser_verified')process.exitCode=1;
