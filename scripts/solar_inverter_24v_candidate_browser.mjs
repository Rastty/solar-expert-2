import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const live=process.env.SOLAR_INVERTER_24V_CANDIDATE_PROOF==='live';
const report={mode:live?'live_no_injection':'preview_injected',status:'not_verified',analytics_posts_delivered:0,external_visits:0,wordpress_writes:0};
let browser;
try{
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
 await ctx.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')))return r.continue();return r.abort('blockedbyclient');});
 const p=await ctx.newPage();const root='[x-data="solarExpertInverterSelector()"]';
 assert.equal((await p.goto(SITE+'/vyber-menice/',{waitUntil:'domcontentloaded'})).status(),200);
 await p.waitForFunction(root=>{const s=window.Alpine?.$data(document.querySelector(root));return s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0;},root,{timeout:35000});
 if(!live)await p.addScriptTag({path:'assets/js/inverter-24v-candidate.js'});
 const btn=p.locator('[data-se-inverter-24v-example="v1"]'),card=p.locator('[data-se-inverter-24v-candidate="v1"]');
 await btn.waitFor({state:'visible'});assert.equal(await btn.count(),1);assert.equal(await card.isVisible(),false);
 await btn.click();await card.waitFor({state:'visible'});
 const s=await p.evaluate(root=>{const x=window.Alpine.$data(document.querySelector(root));return {voltage:x.voltage,continuousW:x.continuousW,peakW:x.peakW,matches:x.matches.length,catalog:x.catalog.length};},root);
 assert.equal(s.voltage,24);assert.equal(s.continuousW,2500);assert.equal(s.peakW,3000);assert.equal(s.matches,0);
 report.scenario=s;
 const link=card.locator('[data-se-product-id="candidate-carspa-p3000u-24"]');assert.equal(await link.count(),1);
 const href=await link.getAttribute('href'),u=new URL(href);
 assert.equal(u.hostname,'ehub.cz');assert.equal(u.pathname,'/system/scripts/click.php');assert.ok(u.searchParams.get('a_aid')&&u.searchParams.get('a_bid'));assert.equal(u.searchParams.get('desturl'),'https://www.vselektro.eu/menic-napeti-carspa-p3000-24v-230v-3000w-sinus-usb/');
 assert.match(await link.getAttribute('rel'),/sponsored/);report.exact_ehub_destination=true;
 assert.match(await card.textContent(),/nejsou ověřeny/);assert.match(await card.textContent(),/139 A/);
 assert.equal(await card.locator('a[href="/jakou-baterii-k-menici-3000w/"]').count(),1);
 // Intercept navigation; trusted browser action exercises only local event, not partner.
 await p.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('[data-se-product-id="candidate-carspa-p3000u-24"]'))e.preventDefault();}));
 await link.click();
 await p.waitForFunction(()=>window.dataLayer?.some(x=>x.event==='affiliate_click'&&x.productId==='candidate-carspa-p3000u-24'&&x.monetized===true));
 report.local_click_event=true;
 for(const [v,w,peak] of [[48,2500,3000],[24,3100,5000],[24,2500,6500],[24,2000,3000]]){
  await p.evaluate(({root,v,w,peak})=>{const x=window.Alpine.$data(document.querySelector(root));Object.assign(x,{voltage:v,continuousW:w,peakW:peak});x.run(false);},{root,v,w,peak});await card.waitFor({state:'hidden'});
 }
 await p.goto(SITE+'/vyber-baterii/',{waitUntil:'domcontentloaded'});assert.equal(await card.count(),0);
 report.status='browser_verified';await ctx.close();
}catch(e){report.failure=String(e.message).split('\n')[0].slice(0,200);}
finally{if(browser)await browser.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/solar-inverter-24v-candidate-browser.json',JSON.stringify(report,null,2));console.log('SOLAR_INVERTER_CANDIDATE_BROWSER '+JSON.stringify(report));}
if(report.status!=='browser_verified')process.exitCode=1;
