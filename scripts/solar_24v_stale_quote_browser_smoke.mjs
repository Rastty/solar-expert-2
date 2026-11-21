#!/usr/bin/env node
/**
 * Independent real Chromium proof for two LIVE WordPress buyer pages with
 * today's 24V source quote AND simulated post-30day expiry (2026-12-09).
 * First-party sample CTA only. No WordPress writes, analytics POST, eHub
 * navigation, merchant GETs, fictitious affiliate clicks or commissions.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const SITE='https://solar-expert.cz';
const CATALOG=SITE+'/wp-json/solar-quote-overlay/v2/catalog';
const ARTIFACT='artifacts/solar-24v-expiry-browser-proof.json';
const CASES=[
  {page:'builder',path:'/solarni-sestava-na-chatu/',mode:'priced',
    date:'2026-11-21T12:30:00Z'},
  {page:'homepage',path:'/',mode:'priced',
    date:'2026-11-21T12:30:00Z'},
  {page:'builder',path:'/solarni-sestava-na-chatu/',mode:'unpriced',
    date:'2026-12-09T12:30:00Z'},
  {page:'homepage',path:'/',mode:'unpriced',
    date:'2026-12-09T12:30:00Z'}
];
const PRODUCTS=[
  'battery-goowei-24-100',
  'inverter-victron-24-1200',
  'mppt-victron-100-30',
  'panel-victron-190'
];
let blockedPosts=0,blockedExternal=0;
const browser=await chromium.launch({headless:true,
  args:['--disable-background-networking','--no-default-browser-check']});
const context=await browser.newContext({
  serviceWorkers:'block',acceptDownloads:false,locale:'cs-CZ',
  viewport:{width:1360,height:880},
  extraHTTPHeaders:{'X-Solar-Expert-QA':'read-only-no-tracking'}
});
await context.route('**/*',async route=>{
  const req=route.request();
  const url=req.url();
  if(!['GET','HEAD'].includes(req.method())){
    blockedPosts++;await route.abort('blockedbyclient');return;
  }
  let parsed;
  try{parsed=new URL(url)}catch{blockedExternal++;await route.abort();return}
  if(parsed.protocol==='https:'&&(
    parsed.origin===SITE ||
    (parsed.hostname==='cdn.jsdelivr.net'&&
      parsed.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')
  )){
    await route.continue();return;
  }
  blockedExternal++;await route.abort('blockedbyclient');
});
const results=[];
let passed=false;
try{
  for(const entry of CASES){
    const page=await context.newPage();
    // Playwright fixed-time changes Date/Date.now without freezing timers.
    await page.clock.setFixedTime(new Date(entry.date));
    const errors=[];
    const requests=[];
    page.on('pageerror',error=>errors.push(String(error.message).slice(0,120)));
    page.on('response',r=>{
      if(r.url()===CATALOG)requests.push({status:r.status(),method:r.request().method()});
    });
    const response=await page.goto(SITE+entry.path+
      '?solar_expiry_timewarp='+encodeURIComponent(entry.date),{
      waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response?.status(),200,'Page HTTP must be 200: '+entry.page);
    await page.waitForFunction(()=>{
      const node=document.querySelector('#builder[x-data="solarExpertBuilder()"]');
      if(!node||!window.Alpine||!window.Alpine.$data)return false;
      const d=window.Alpine.$data(node);
      return d.catalogReady&&!d.catalogLoading&&!d.catalogError;
    },null,{timeout:45000});
    const preCard=page.locator('#builder [data-se-reviewed-24v-example="v1"]');
    await preCard.waitFor({state:'attached',timeout:12000});
    assert.equal(await preCard.isVisible(),false,'Card must start hidden');
    const first=entry.page==='homepage'
      ? page.locator('[data-se-home-demo="builder-preview"]')
      : page.getByRole('button',{name:/Ukázat vzorovou sestavu/});
    assert.equal(await first.count(),1,'Primary sample CTA must be unique');
    await first.click({timeout:15000});
    await page.waitForFunction(()=>{
      const root=document.querySelector('#builder[x-data="solarExpertBuilder()"]');
      const d=window.Alpine.$data(root);
      return d.step===4&&!!d.result;
    },null,{timeout:15000});
    const card=page.locator('#builder [data-se-reviewed-24v-example="v1"]');
    await card.waitFor({state:'visible',timeout:15000});
    const mode=await card.getAttribute('data-se-quote-mode');
    assert.equal(mode,entry.mode,'Real buyer card date-sensitive status mismatched');
    const hrefs=await card.locator(
      'a[data-se-placement="builder-24v-reviewed-model"]').evaluateAll(nodes=>
      nodes.map(a=>{
        const u=new URL(a.href);
        const dest=u.searchParams.get('desturl');
        let host=null;
        try{host=new URL(dest).hostname}catch{}
        return {id:a.dataset.seProductId,href_host:u.hostname,
          dest_host:host,sponsored:a.rel.split(/\s+/).includes('sponsored'),
          nofollow:a.rel.includes('nofollow'),noopener:a.rel.includes('noopener'),
          data_placement:a.dataset.sePlacement,
          opens_new_tab:a.target==='_blank'};
      }));
    assert.equal(hrefs.length,4,'Exactly 4 separate merchant product links are required');
    assert.deepEqual(new Set(hrefs.map(x=>x.id)),new Set(PRODUCTS),
      'Selected technical product identities changed after time shift');
    assert.ok(hrefs.every(x=>x.href_host==='ehub.cz'&&
      ['www.battery.cz','www.solar-import.cz'].includes(x.dest_host)&&
      x.sponsored&&x.nofollow&&x.noopener&&x.opens_new_tab),
      'One of four links lost its exact sponsored eHub product destination');
    const total=card.locator('[data-se-model-total="true"]');
    const warning=card.locator('[data-se-unpriced-warning="true"]');
    const content=(await card.innerText()).replace(/\s+/g,' ');
    if(entry.mode==='priced'){
      assert.equal(await total.count(),1,'Fresh quote must retain visible subtotal');
      assert.equal(await warning.count(),0,'Fresh quote must not show stale warning');
      assert.equal((await total.innerText()).replace(/[^0-9]/g,''),'34109',
        'Original 34,109 CZK source-verified total changed');
    }else{
      assert.equal(await total.count(),0,
        'Expired quote must NEVER render an aggregate price');
      assert.equal(await warning.isVisible(),true,
        'Stale quote must prominently explain unknown current prices');
      assert.ok(content.includes('ceny a dostupnost nyní neověřené'),
        'Heading must disclose unavailable current prices');
      assert.ok(content.includes('Proto neuvádíme ceny, dostupnost ani součet'),
        'Loss of price evidence must be explicitly disclosed');
      for(const amount of ['34 109','14 690','7 431','2 984','2 251']){
        assert.ok(!content.includes(amount),
          'Stale component price leaked into visible buyer UI: '+amount);
      }
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    assert.ok(requests.length>=1&&requests.length<=2&&
      requests.every(x=>x.status===200&&x.method==='GET'),
      'Production REST catalog must load by first-party GET only');
    results.push({page:entry.page,date:entry.date,
      quote_mode:mode,catalog_gets:requests.length,
      sponsored_source_exact_merchant_links:hrefs.length,
      priced_total_visible:entry.mode==='priced',
      missing_price_warning_visible:entry.mode==='unpriced',
      no_unverified_amounts:entry.mode==='unpriced',
      browser_js_exceptions:errors.length,
      source_clicks:0,affiliate_clicks:0,wordpress_writes:0});
    console.log('SOLAR_24V_EXPIRY_BROWSER page='+entry.page+
      ' mode='+mode+' product_links='+hrefs.length+
      ' total_visible='+(entry.mode==='priced')+
      ' warning_visible='+(entry.mode==='unpriced')+
      ' merchant_clicks=0');
    await page.close();
  }
  passed=true;
}finally{
  await context.close();
  await browser.close();
  mkdirSync('artifacts',{recursive:true});
  const report={schema_version:1,status:passed?'verified':'not_verified',
    site:SITE,catalog:CATALOG,mode:'real_chromium_fixed_future_date',
    cases:results,no_affiliate_network_requests:true,
    external_requests_blocked:blockedExternal,
    analytics_posts_blocked:blockedPosts,
    wordpress_writes:0,affiliate_clicks:0,
    price_verified_by_merchants_now:false,paid_commissions_observed:false,
    theme_deployed:false};
  writeFileSync(ARTIFACT,JSON.stringify(report,null,2)+'\n');
  console.log('SOLAR_24V_EXPIRY_BROWSER status='+report.status+
    ' cases='+results.length+
    ' analytics_posts_blocked='+blockedPosts+
    ' merchant_clicks=0 wordpress_writes=0');
}
