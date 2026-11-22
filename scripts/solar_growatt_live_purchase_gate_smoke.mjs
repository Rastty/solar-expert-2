#!/usr/bin/env node
/** Production old-theme Growatt purchase gate, real Chromium, no merchant clicks.
 * Preview injects only reviewed source AFTER live catalogue fetch; post-release
 * must run with zero source injection and require the real WP Code Snippet.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

const ORIGIN='https://solar-expert.cz';
const TARGET=ORIGIN+'/solarni-sestava-na-chatu/?solar_growatt_guard_probe=20261122';
const MODE=process.env.SOLAR_GROWATT_GUARD_PROOF==='live'?'live_no_injection':'preview_injected';
const IDS=['inverter-growatt-48-3500','inverter-growatt-48-6000'];
const OUTPUT='artifacts/solar-growatt-purchase-gate-browser.json';
const report={schema_version:1,mode:MODE,status:'not_verified',
    actual_live_catalog:false,source_injected:false,guard_present_before_injection:false,
    tested_inverter_ids:[],baseline_bundle_states:[],guarded_bundle_states:[],
    unknown_integrated_bundles_blocked:false,standalone_unmodified:true,
    runtime_errors:0,prohibited_requests_blocked:0,affiliate_clicks:0,
    external_merchant_visits:0,delivered_wordpress_writes:0,
    analytics_events_sent:0,verified_paid_commissions:false};
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--disable-background-networking']});
  const context=await browser.newContext({serviceWorkers:'block',locale:'cs-CZ',
    viewport:{width:1280,height:800}});
  await context.route('**/*',async route=>{
    const req=route.request();let u;
    try{u=new URL(req.url())}catch(_){await route.abort();return}
    const pass=req.method()==='GET'&&u.protocol==='https:'&&
      (u.origin===ORIGIN||(u.hostname==='cdn.jsdelivr.net'&&
       u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js'));
    if(!pass){report.prohibited_requests_blocked++;await route.abort('blockedbyclient');return}
    await route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',()=>report.runtime_errors++);
  const res=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(res?.status(),200);
  await page.waitForFunction(()=>{
    const el=document.querySelector('[x-data="solarExpertBuilder()"]');
    if(!el||!window.Alpine?.$data)return false;
    const d=window.Alpine.$data(el);
    return d.catalogLoading===false&&Array.isArray(d.catalog)&&d.catalog.length===24;
  },null,{timeout:35000});
  report.actual_live_catalog=true;
  const snapshot=()=>page.evaluate(ids=>{
    const d=window.Alpine.$data(document.querySelector('[x-data="solarExpertBuilder()"]'));
    const B=window.SolarExpertBundleComposer;
    if(!B||typeof B.compose!=='function')return {composerMissing:true};
    const products=Array.from(d.catalog||[]);
    const found=ids.filter(id=>products.some(p=>p.id===id));
    const sizing={voltage:48,batteryKwh:2,inverterW:3000,peak:5000,panelWp:1000,mpptA:30};
    const eventsBefore=Array.isArray(window.dataLayer)?window.dataLayer.length:0;
    const bundles=B.compose(products,sizing,Array.from(d.bundleDeals||[]));
    const eventsAfter=Array.isArray(window.dataLayer)?window.dataLayer.length:0;
    return {found,guard:Boolean(B.__seGrowattPVGuardV1),
      noSyntheticEvents:eventsBefore===eventsAfter,
      bundles:Array.isArray(bundles)?bundles.map(b=>({
        tier:b.tier,complete:b.complete===true,integrated:b.integratedMppt===true,
        inverterId:b.inverter?.id||null,status:String(b.status||'unknown'),
        pvIscVerified:b.pvIscVerified===true,
        purchaseGate:b.pvPurchaseGate||null
      })):[]};
  },IDS);
  const before=await snapshot();
  assert.equal(before.composerMissing,undefined);
  assert.equal(before.found.length,2);
  assert.equal(before.noSyntheticEvents,true);
  report.tested_inverter_ids=before.found;
  report.baseline_bundle_states=before.bundles;
  report.guard_present_before_injection=before.guard;
  if(MODE==='preview_injected'&&!before.guard){
    await page.addScriptTag({path:'assets/js/growatt-isc-purchase-guard-v1.js'});
    report.source_injected=true;
  }
  const after=await snapshot();
  assert.equal(after.guard,true,'Reviewed guard must be active before any buyer bundle selection');
  assert.equal(after.noSyntheticEvents,true);
  report.guarded_bundle_states=after.bundles;
  const affected=after.bundles.filter(b=>b.integrated&&IDS.includes(b.inverterId));
  assert.equal(affected.length,2,'Both exact Growatt variants must still be visible as provisional');
  report.unknown_integrated_bundles_blocked=affected.every(b=>
    b.complete===false&&b.pvIscVerified===false&&
    b.status==='pv_isc_limit_unverified'&&
    b.purchaseGate==='blocked_missing_absolute_pv_isc');
  assert.equal(report.unknown_integrated_bundles_blocked,true);
  const otherBefore=before.bundles.filter(b=>!IDS.includes(b.inverterId));
  const otherAfter=after.bundles.filter(b=>!IDS.includes(b.inverterId));
  report.standalone_unmodified=JSON.stringify(otherBefore)===JSON.stringify(otherAfter);
  assert.equal(report.standalone_unmodified,true);
  if(MODE==='live_no_injection'){
    assert.equal(report.guard_present_before_injection,true);
    assert.equal(report.source_injected,false);
  }
  report.status='browser_verified';
  await context.close();
}catch(e){
  report.status='blocked_not_verified';
  report.failure_stage=String(e?.name||'unknown').slice(0,60);
}finally{
  if(browser)await browser.close();
  mkdirSync('artifacts',{recursive:true});
  writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.log('SOLAR_GROWATT_BUY_GUARD status='+report.status+
    ' mode='+report.mode+' prod_catalog='+report.actual_live_catalog+
    ' protected_bundles='+report.guarded_bundle_states.filter(x=>x.integrated).length+
    ' safe='+report.unknown_integrated_bundles_blocked+
    ' source_injected='+report.source_injected+
    ' no_external_visits=0 wp_writes=0');
}
if(report.status!=='browser_verified'||!report.unknown_integrated_bundles_blocked||
  report.tested_inverter_ids.length!==2||!report.standalone_unmodified||
  report.external_merchant_visits!==0||report.delivered_wordpress_writes!==0||
  report.affiliate_clicks!==0||report.analytics_events_sent!==0)process.exitCode=1;
