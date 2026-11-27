import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const live=process.env.SOLAR_POWER_PRESETS_PROOF==='live';
const report={mode:live?'live_no_injection':'preview_injected',status:'not_verified',models:[],wp_writes:0,external_visits:0,analytics_network_writes:0};
let browser;
try {
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
  await ctx.route('**/*',async r=>{
    const q=r.request(),u=new URL(q.url());
    if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')))return r.continue();
    return r.abort('blockedbyclient');
  });
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  const root='[x-data="solarExpertBatterySelector()"]';
  assert.equal((await page.goto(SITE+'/vyber-baterii/?solar_power_presets_proof=20261127',{waitUntil:'domcontentloaded'})).status(),200);
  await page.waitForFunction(root=>{const el=document.querySelector(root);const s=el&&window.Alpine?.$data(el);return s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0;},root,{timeout:35000});
  if(!live)await page.addScriptTag({path:'assets/js/battery-power-presets.js'});
  const model=page.locator('[data-se-power-presets="v1"]');
  await model.waitFor({state:'visible'});
  assert.equal(await model.count(),1);
  assert.equal(await model.getByRole('button').count(),4);
  for(const voltage of [24,48])for(const watts of [2000,3000]){
    const button=model.locator('[data-se-power-preset="'+voltage+'-'+watts+'"]');
    assert.equal(await button.isEnabled(),true);
    await button.click();
    const r=await page.evaluate(root=>{const s=window.Alpine.$data(document.querySelector(root));return {voltage:Number(s.voltage),dailyKwh:Number(s.dailyKwh),autonomy:Number(s.autonomy),inverterW:Number(s.inverterW),matches:Array.isArray(s.matches)?s.matches.length:null};},root);
    assert.deepEqual([r.voltage,r.dailyKwh,r.autonomy,r.inverterW],[voltage,watts/1000,1,watts]);
    assert.notEqual(r.matches,null);
    report.models.push(r);
  }
  assert.equal(await model.getByRole('link').count(),2);
  assert.equal(errors.length,0);
  assert.equal((await page.goto(SITE+'/vyber-menice/',{waitUntil:'domcontentloaded'})).status(),200);
  assert.equal(await page.locator('[data-se-power-presets]').count(),0);
  report.status='browser_verified';
  await ctx.close();
} catch(e){report.failure=String(e.message).split('\n')[0].slice(0,200);}
finally {if(browser)await browser.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/solar-battery-power-presets-browser.json',JSON.stringify(report,null,2));console.log('SOLAR_POWER_PRESETS '+JSON.stringify(report));}
if(report.status!=='browser_verified')process.exitCode=1;
