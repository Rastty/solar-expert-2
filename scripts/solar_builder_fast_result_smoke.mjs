import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

const ORIGIN='https://solar-expert.cz';
const TARGET=ORIGIN+'/solarni-sestava-na-chatu/';
const OUTPUT='artifacts/solar-builder-fast-result-smoke.json';
let browser;
let currentStage='startup';
const report={
  schema_version:1,mode:'live_chromium_blocked_outbound',
  page:'solarni-sestava-na-chatu',status:'not_verified',
  inspected_live_site:false,fast_path_present_before_source_injection:false,
  injected_preview_source:false,fast_button_count:null,
  customized_energy_wh:null,custom_result_rendered:false,
  advanced_season_path_preserved:false,correct_default_parameters:false,
  human_conversions_claimed:false,real_revenue_verified:false,
  external_merchant_visits:0,network_writes_delivered:0,wordpress_writes:0,
  affiliate_link_clicks:0,analytics_events_sent:0,
};
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.route('**/*',async route=>{
    const req=route.request();let url;
    try{url=new URL(req.url());}catch(_){await route.abort();return;}
    const alpineCdn=(req.method()==='GET'&&url.protocol==='https:'&&
      url.hostname==='cdn.jsdelivr.net'&&
      url.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js');
    if(req.method()==='GET'&&(url.origin===ORIGIN||alpineCdn)){
      await route.continue();return;
    }
    await route.abort();
  });
  currentStage='navigate';
  const res=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(res?.status(),200);
  assert.equal(page.url(),TARGET);
  await page.waitForFunction(()=>Boolean(window.Alpine?.$data)&&
    typeof window.Alpine.$data(document.querySelector('#builder'))?.preset==='function',
    null,{timeout:35000});
  report.inspected_live_site=true;
  currentStage='mount_fast_script';
  const fast=page.locator('#builder button[data-se-builder-custom-fast="v1"]');
  report.fast_path_present_before_source_injection=await fast.count()===1;
  if(!report.fast_path_present_before_source_injection){
    await page.addScriptTag({path:'assets/js/builder-fast-result.js'});
    report.injected_preview_source=true;
  }
  await fast.waitFor({state:'attached',timeout:6000});
  assert.equal(await fast.count(),1,'Fast button must be mounted exactly once');
  report.fast_button_count=1;

  // Genuine UI control click; never click an affiliate or send analytics.
  currentStage='select_chata_preset';
  const preset=page.getByRole('button',{name:/Chata \/ zahradní domek/});
  assert.equal(await preset.count(),1);
  await preset.click();
  await page.waitForFunction(()=>window.Alpine.$data(document.querySelector('#builder')).step===2);
  const fridgeHours=page.locator('#builder-hours-fridge');
  currentStage='fridge_field_visible';
  await fridgeHours.waitFor({state:'visible',timeout:10000});
  currentStage='edit_fridge_hours';
  await fridgeHours.fill('8');
  await page.waitForFunction(()=>window.Alpine.$data(document.querySelector('#builder')).dailyWh===1308);
  currentStage='fast_button_enabled';
  await page.waitForFunction(()=>!document.querySelector('#builder button[data-se-builder-custom-fast="v1"]')?.disabled,
    null,{timeout:10000});
  assert.equal(await fast.isEnabled(),true);
  currentStage='fast_click_result';
  await fast.click();
  await page.waitForFunction(()=>{
    const b=window.Alpine.$data(document.querySelector('#builder'));
    return b.step===4&&b.result?.energyWh===1308;
  });
  const result=await page.evaluate(()=>{
    const b=window.Alpine.$data(document.querySelector('#builder'));
    return {step:b.step,energyWh:b.result?.energyWh,season:b.season,autonomy:b.autonomy,
      preview:b.previewMode,fridgeHours:b.appliances.find(a=>a.id==='fridge')?.hours};
  });
  assert.equal(result.step,4);assert.equal(result.energyWh,1308);
  assert.equal(result.fridgeHours,8);
  assert.equal(result.preview,false,'Customized result is not the canned preview');
  assert.equal(result.season,'three');assert.equal(result.autonomy,1);
  report.customized_energy_wh=result.energyWh;
  report.correct_default_parameters=true;
  report.custom_result_rendered=true;
  currentStage='advanced_route';

  // No loss of advanced settings or original step 3 flow.
  await page.evaluate(()=>window.Alpine.$data(document.querySelector('#builder')).reset());
  await preset.click();
  const advanced=page.locator('#builder button[data-se-builder-advanced-choice="v1"]');
  assert.equal(await advanced.count(),1);
  await advanced.click();
  await page.waitForFunction(()=>window.Alpine.$data(document.querySelector('#builder')).step===3);
  await page.evaluate(()=>{
    const b=window.Alpine.$data(document.querySelector('#builder'));
    b.season='year';b.autonomy=2;
  });
  await page.getByRole('button',{name:/Spočítat sestavu/}).click();
  await page.waitForFunction(()=>{
    const b=window.Alpine.$data(document.querySelector('#builder'));
    return b.step===4&&b.season==='year'&&b.autonomy===2;
  });
  report.advanced_season_path_preserved=true;
  report.status='browser_verified';
  await context.close();
}catch(e){
  report.status='browser_not_verified';
  report.failure_stage=currentStage;
  report.failure_message=String(e?.message||'unknown').split('\\n')[0].slice(0,140);
  report.failure_class=e?.name||'unknown';
}finally{
  if(browser)await browser.close();
  mkdirSync('artifacts',{recursive:true});
  writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
  console.log('SOLAR_BUILDER_FAST_PATH status='+report.status+
    ' source_injected='+report.injected_preview_source+
    ' real_runtime_custom_wh='+report.customized_energy_wh+
    ' advanced_preserved='+report.advanced_season_path_preserved+
    ' outbound_visits=0 analytics_sent=0 wp_writes=0');
}
if(report.status!=='browser_verified' ||
   !report.inspected_live_site||!report.custom_result_rendered||
   !report.advanced_season_path_preserved||!report.correct_default_parameters||
   report.network_writes_delivered!==0||report.wordpress_writes!==0||
   report.affiliate_link_clicks!==0)process.exitCode=1;
