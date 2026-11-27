import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const live=process.env.SOLAR_CANDIDATE_PROOF==='live';
const report={mode:live?'live_no_injection':'preview_injected',status:'not_verified',observed_events:[],external_visits:0,analytics_posts_delivered:0,wordpress_writes:0};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
  const captured=[];
  await ctx.route('**/*',async r=>{
    const q=r.request(),u=new URL(q.url());
    if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')))return r.continue();
    if(q.method()==='POST'&&u.origin===SITE){
      try{const x=q.postDataJSON();if(x.placement==='battery-24v-candidate')captured.push(x);}catch(_){}
    }
    return r.abort('blockedbyclient');
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  const root='[x-data="solarExpertBatterySelector()"]';
  assert.equal((await page.goto(SITE+'/vyber-baterii/?solar_candidate_measurement_proof=20261127',{waitUntil:'domcontentloaded'})).status(),200);
  await page.waitForFunction(root=>{const el=document.querySelector(root);const s=el&&window.Alpine?.$data(el);return s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0&&typeof window.SolarExpertAnalytics?.track==='function';},root,{timeout:35000});
  if(!live){
    await page.locator('[data-se-24v-high-current="v1"]').evaluate(e=>e.remove());
    await page.addScriptTag({path:'assets/js/battery-24v-high-current-measured.js'});
  }
  const card=page.locator('[data-se-24v-high-current="v1"]');
  assert.equal(await card.count(),1);
  assert.equal(await card.isVisible(),false);
  assert.equal(await card.locator('[data-se-candidate-measurement="v2"]').count(),2);
  await page.locator('[data-se-power-preset="24-2000"]').click();
  await card.waitFor({state:'visible'});
  const epever=card.locator('[data-se-product-id="candidate-epever-24-100"]');
  const pq=card.locator('[data-se-product-id="candidate-powerqueen-24-200"]');
  const href=await epever.getAttribute('href');
  assert.equal(new URL(href).hostname,'ehub.cz');
  // Block default navigation after target handlers, in addition to the network
  // route deny rule. Only trusted Chromium UI actions count locally.
  await page.evaluate(()=>window.addEventListener('click',e=>{if(e.target.closest?.('[data-se-candidate-measurement]'))e.preventDefault();}));
  await epever.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>window.dataLayer.some(x=>x.event==='offer_exposure'&&x.productId==='candidate-epever-24-100'),null,{timeout:6000});
  await epever.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0})));
  assert.equal(await page.evaluate(()=>window.dataLayer.filter(x=>x.event==='affiliate_click'&&x.placement==='battery-24v-candidate').length),0);
  await epever.click();
  await pq.click();
  await page.waitForFunction(()=>window.dataLayer.filter(x=>x.event==='affiliate_click'&&x.placement==='battery-24v-candidate').length===2);
  const clicks=await page.evaluate(()=>window.dataLayer.filter(x=>x.event==='affiliate_click'&&x.placement==='battery-24v-candidate').map(x=>({productId:x.productId,merchant:x.merchant,monetized:x.monetized,scenario:x.scenario,quantity:x.quantity})));
  assert.deepEqual(clicks,[{productId:'candidate-epever-24-100',merchant:'vselektro-eu',monetized:true,scenario:'inverter-2000-24v-1h',quantity:3},{productId:'candidate-powerqueen-24-200',merchant:'powerqueen-eu',monetized:false,scenario:'inverter-2000-24v-1h',quantity:1}]);
  await page.locator('[data-se-power-preset="24-3000"]').click();
  await epever.click();
  await page.waitForFunction(()=>window.dataLayer.filter(x=>x.event==='affiliate_click'&&x.placement==='battery-24v-candidate').length===3);
  assert.equal(await page.evaluate(()=>window.dataLayer.filter(x=>x.event==='affiliate_click'&&x.placement==='battery-24v-candidate').at(-1).quantity),4);
  await page.waitForTimeout(500);
  assert.equal(captured.filter(x=>x.event==='affiliate_click').length,3);
  assert.equal(captured.filter(x=>x.event==='offer_exposure'&&x.productId==='candidate-epever-24-100').length,1);
  report.observed_events=clicks;
  report.third_click_quantity_local=4;
  report.blocked_candidate_click_posts=3;
  report.quantity_in_network_payload=captured.filter(x=>x.event==='affiliate_click').every(x=>'quantity' in x);
  await page.locator('[data-se-power-preset="48-3000"]').click();
  await card.waitFor({state:'hidden'});
  assert.equal(errors.length,0);
  assert.equal((await page.goto(SITE+'/vyber-menice/',{waitUntil:'domcontentloaded'})).status(),200);
  assert.equal(await page.locator('[data-se-candidate-measurement]').count(),0);
  report.status='browser_verified';
  await ctx.close();
}catch(e){report.failure=String(e.message).split('\n')[0].slice(0,200);}
finally{if(browser)await browser.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/solar-candidate-offer-measurement-browser.json',JSON.stringify(report,null,2));console.log('SOLAR_CANDIDATE_BROWSER '+JSON.stringify(report));}
if(report.status!=='browser_verified')process.exitCode=1;
