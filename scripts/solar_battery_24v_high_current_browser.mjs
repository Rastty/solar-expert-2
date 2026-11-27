import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const live=process.env.SOLAR_24V_HIGH_CURRENT_PROOF==='live';
const report={mode:live?'live_no_injection':'preview_injected',status:'not_verified',models:[],affiliate_route:null,wp_writes:0,external_visits:0,analytics_network_writes:0};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
  await ctx.route('**/*',async r=>{
    const q=r.request(),u=new URL(q.url());
    if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')))return r.continue();
    return r.abort('blockedbyclient');
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  const root='[x-data="solarExpertBatterySelector()"]';
  assert.equal((await page.goto(SITE+'/vyber-baterii/?solar_24v_high_current_proof=20261127',{waitUntil:'domcontentloaded'})).status(),200);
  await page.waitForFunction(root=>{const el=document.querySelector(root);const s=el&&window.Alpine?.$data(el);return s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0;},root,{timeout:35000});
  if(!live)await page.addScriptTag({path:'assets/js/battery-24v-high-current.js'});
  const card=page.locator('[data-se-24v-high-current="v1"]');
  assert.equal(await card.count(),1);
  assert.equal(await card.isVisible(),false);
  for(const voltage of [24,48])for(const watts of [2000,3000]){
    const b=page.locator('[data-se-power-preset="'+voltage+'-'+watts+'"]');
    await b.click();
    const matches=await page.evaluate(root=>window.Alpine.$data(document.querySelector(root)).matches.length,root);
    if(voltage===24){
      assert.equal(matches,0);
      await card.waitFor({state:'visible'});
      const n=watts===2000?3:4;
      assert.match(await card.locator('[data-se-epever-bank]').textContent(),new RegExp('orientačně '+n+' shodné'));
      const href=await card.getByRole('link',{name:/Ověřit cenu a počet kusů/}).getAttribute('href');
      const u=new URL(href);
      const target='https://www.vselektro.eu/lifepo4-baterie-24v-100ah-epever-lfp2-56kwh25-6v-p65l2ev50/';
      if(u.hostname==='ehub.cz'){
        assert.equal(u.pathname,'/system/scripts/click.php');
        assert.equal(u.searchParams.get('desturl'),target);
        assert.ok(u.searchParams.get('a_aid')&&u.searchParams.get('a_bid'));
        report.affiliate_route='existing_exact_ehub_mapping';
      }else{
        assert.equal(href,target);
        report.affiliate_route='direct_merchant_no_commission_claim';
      }
      assert.equal(await card.getByRole('link').count(),3);
      assert.match(await card.textContent(),/50 A trvale/);
      report.models.push({voltage,watts,visible:true,modules:n,matches});
    }else{
      await card.waitFor({state:'hidden'});
      report.models.push({voltage,watts,visible:false,matches});
    }
  }
  await page.locator('[data-se-power-preset="24-3000"]').click();
  await card.waitFor({state:'visible'});
  await page.evaluate(root=>{const s=window.Alpine.$data(document.querySelector(root));s.dailyKwh=4;s.run(false);},root);
  await card.waitFor({state:'hidden'});
  assert.equal(errors.length,0);
  assert.equal((await page.goto(SITE+'/vyber-menice/',{waitUntil:'domcontentloaded'})).status(),200);
  assert.equal(await page.locator('[data-se-24v-high-current]').count(),0);
  report.status='browser_verified';
  await ctx.close();
}catch(e){report.failure=String(e.message).split('\n')[0].slice(0,200);}
finally{if(browser)await browser.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/solar-battery-24v-high-current-browser.json',JSON.stringify(report,null,2));console.log('SOLAR_24V_HIGH_CURRENT '+JSON.stringify(report));}
if(report.status!=='browser_verified')process.exitCode=1;
