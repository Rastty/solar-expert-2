#!/usr/bin/env node
/* A/B source-vs-live read-only Chromium proof: suppress only duplicate x-init.
 * Browser loads real public Solar Expert PHP/JS/REST (same-origin GET),
 * pinned Alpine CDN GET. ALL analytics, merchant requests and writes blocked.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync,writeFileSync } from 'node:fs';

const SITE='https://solar-expert.cz';
const CATALOG=SITE+'/wp-json/solar-quote-overlay/v2/catalog';
const LIVE=process.env.SOLAR_CATALOG_SINGLE_INIT_PROOF==='live';
const PATH='assets/js/catalog-alpine-single-init.js';
const OUTPUT='artifacts/solar-catalog-single-init-browser.json';
const PAGES=[
  {kind:'builder',path:'/solarni-sestava-na-chatu/',root:'[x-data="solarExpertBuilder()"]'},
  {kind:'home',path:'/',root:'[x-data="solarExpertBuilder()"]'},
  {kind:'battery',path:'/vyber-baterii/',root:'[x-data="solarExpertBatterySelector()"]'},
  {kind:'mppt',path:'/mppt-kalkulacka/',root:'[x-data="solarExpertMpptSelector()"]'},
  {kind:'inverter',path:'/vyber-menice/',root:'[x-data="solarExpertInverterSelector()"]'}
];
const result={
  schema_version:1,proof_mode:LIVE?'post_release_no_injection':'preview_source_injected',
  site:SITE,method:'browser_get_only',tested_pages:[],
  status:'not_verified',outside_site_gets_blocked:0,non_get_requests_blocked:0,
  affiliate_visits:0,wordpress_writes:0,analytics_posts:0,
  human_conversions:0,verified_revenue:false
};
let browser;
try{
  browser=await chromium.launch({headless:true,
    args:['--disable-background-networking','--no-default-browser-check']});
  const context=await browser.newContext({serviceWorkers:'block',
    viewport:{width:1260,height:810},locale:'cs-CZ'});
  if(!LIVE)await context.addInitScript({path:PATH});
  await context.route('**/*',async route=>{
    const request=route.request();
    let u;try{u=new URL(request.url());}catch(_){await route.abort();return;}
    const allowed=(request.method()==='GET'&&u.protocol==='https:'&&
      (u.origin===SITE || (u.hostname==='cdn.jsdelivr.net'&&
       u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')));
    if(!allowed){
      if(request.method()!=='GET')result.non_get_requests_blocked++;
      else result.outside_site_gets_blocked++;
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  for(const def of PAGES){
    const page=await context.newPage();
    const catalogRequests=[];
    const runtimeErrors=[];
    page.on('request',r=>{
      if(r.url()===CATALOG&&r.method()==='GET')catalogRequests.push(true);
    });
    page.on('pageerror',e=>runtimeErrors.push(String(e.message||'javascript_exception').slice(0,80)));
    const response=await page.goto(SITE+def.path+'?solar_catalog_native_init_proof=20261122',
      {waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response?.status(),200,def.kind+' live HTML not HTTP 200');
    await page.waitForFunction(root=>{
      const element=document.querySelector(root);
      if(!element || !window.Alpine?.$data)return false;
      const data=window.Alpine.$data(element);
      return data?.catalogLoading===false && Array.isArray(data.catalog);
    },def.root,{timeout:35000});
    const shape=await page.evaluate(root=>{
      const el=document.querySelector(root);
      const d=window.Alpine.$data(el);
      return {nativeInitMarker:el.getAttribute('data-se-native-init-only')==='v1',
        explicitInitRemains:el.hasAttribute('x-init'),
        catalogLength:Array.from(d.catalog||[]).length,
        catalogError:Boolean(d.catalogError),
        computedResult:Boolean(d.result)||Boolean(d.matches?.length),
        globalFastResultPresent:!!document.querySelector('[data-se-builder-custom-fast="v1"]')};
    },def.root);
    const row={kind:def.kind,page_http_200:true,source_injected:!LIVE,
      native_init_marker:shape.nativeInitMarker,
      redundant_explicit_init_removed:!shape.explicitInitRemains,
      catalog_gets:catalogRequests.length,catalog_products:shape.catalogLength,
      catalog_error:shape.catalogError,js_exception_count:runtimeErrors.length,
      builder_fast_result_preserved:(def.kind==='builder'||def.kind==='home')?
        shape.globalFastResultPresent:null};
    result.tested_pages.push(row);
    assert.equal(row.native_init_marker,true,def.kind+': exact inline script not executed');
    assert.equal(row.redundant_explicit_init_removed,true,
      def.kind+': old template still calls init twice');
    assert.equal(row.catalog_gets,1,def.kind+': duplicate catalog GET remains');
    assert.equal(row.catalog_products,24,def.kind+': source-backed catalog not hydrated');
    assert.equal(row.catalog_error,false,def.kind+': product catalog failed');
    assert.equal(row.js_exception_count,0,def.kind+': JS runtime exception');
    if(def.kind==='builder'||def.kind==='home'){
      assert.equal(row.builder_fast_result_preserved,true,
        def.kind+': previously live personalized Builder shortcut regressed');
    }
    await page.close();
  }
  await context.close();
  result.status='verified';
}catch(e){
  result.status='blocked_not_verified';
  result.failure_class=e?.name||'error';
  result.failure_stage=result.tested_pages.length;
  // No raw URLs, affiliate ids, query rows or private payloads in artifacts.
}finally{
  if(browser)await browser.close();
  mkdirSync('artifacts',{recursive:true});
  writeFileSync(OUTPUT,JSON.stringify(result,null,2)+'\n','utf8');
  console.log('SOLAR_CATALOG_SINGLE_INIT status='+result.status+
    ' proof='+result.proof_mode+' pages='+result.tested_pages.length+
    ' gets='+result.tested_pages.map(x=>x.catalog_gets).join(',')+
    ' external_visits=0 analytics_posts=0 wp_writes=0');
}
if(result.status!=='verified'||result.tested_pages.length!==PAGES.length||
   result.affiliate_visits!==0||result.wordpress_writes!==0||
   result.analytics_posts!==0||result.verified_revenue!==false){
  process.exitCode=1;
}
