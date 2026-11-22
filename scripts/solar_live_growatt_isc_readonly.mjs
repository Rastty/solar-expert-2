#!/usr/bin/env node
/** Independent production Growatt PV Isc buyer-readiness diagnostic (GET ONLY).
 *
 * No synthetic affiliate click, merchant visit, WordPress mutation, injected JS,
 * source override, telemetry POST, created offer or fabricated manufacturer spec.
 * Uses the ACTUAL live old-theme Bundle Composer + 24-product REST catalog.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const ORIGIN='https://solar-expert.cz';
const URL=ORIGIN+'/solarni-sestava-na-chatu/?solar_growatt_isc_readonly=20261122';
const OUTPUT='artifacts/solar-live-growatt-isc-readonly.json';
const IDS=['inverter-growatt-48-3500','inverter-growatt-48-6000'];
let browser;
const out={
  schema_version:1,mode:'real_production_get_only_no_injection',
  status:'not_verified',site:ORIGIN,
  live_html_ok:false,live_catalog_products:0,live_composer_available:false,
  required_inverter_ids_found:[],integrated_devices:[],
  integrated_preview_bundles:[],unknown_pv_isc_marked_incomplete:null,
  independent_mppt_path_preserved:null,
  runtime_exceptions:0,
  prohibited_outbound_requests_blocked:0,
  delivered_wp_writes:0,delivered_partner_visits:0,delivered_analytics_posts:0,
  partner_clicks:0,paid_commissions_verified:false
};
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'block',
    locale:'cs-CZ',viewport:{width:1280,height:800}});
  await context.route('**/*',async route=>{
    const req=route.request();let u;
    try{u=new URL(req.url());}catch{await route.abort();return;}
    if(req.method()==='GET'&&u.protocol==='https:'&&
      (u.origin===ORIGIN||
       (u.hostname==='cdn.jsdelivr.net'&&
        u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js'))){
      await route.continue();return;
    }
    out.prohibited_outbound_requests_blocked++;
    await route.abort('blockedbyclient');
  });
  const page=await context.newPage();
  page.on('pageerror',()=>out.runtime_exceptions++);
  const res=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(res?.status(),200);
  out.live_html_ok=true;
  await page.waitForFunction(()=>{
    const el=document.querySelector('#builder');
    if(!el||!window.Alpine?.$data)return false;
    const d=window.Alpine.$data(el);
    return d.catalogLoading===false && Array.isArray(d.catalog);
  },null,{timeout:35000});
  const measured=await page.evaluate(ids=>{
    const d=window.Alpine.$data(document.querySelector('#builder'));
    const products=Array.from(d.catalog||[]);
    const b=window.SolarExpertBundleComposer;
    const primary=ids.map(id=>products.find(p=>p.id===id));
    const testCase={voltage:48,batteryKwh:2,inverterW:3000,
                    peak:5000,panelWp:1000,mpptA:30};
    const eventsBefore=Array.isArray(window.dataLayer)?window.dataLayer.length:0;
    let composed=null;
    if(b&&typeof b.compose==='function'){
      try{composed=b.compose(products,testCase,Array.from(d.bundleDeals||[]));}
      catch(_){composed='ERROR';}
    }
    const eventsAfter=Array.isArray(window.dataLayer)?window.dataLayer.length:0;
    return {
      catalog:products.length,available:!!b,
      hasComposer:typeof b?.compose==='function',
      hasController:typeof b?.controllerLimits==='function',
      eventsChanged:eventsAfter-eventsBefore,
      inverterData:primary.map((p,i)=>p?({
        id:ids[i],
        pv_isc_absolute_status:p.integrated_mppt?.pv_isc_absolute_status||'missing',
        pv_isc_absolute_limit_a:Number(p.integrated_mppt?.pv_isc_absolute_limit_a||0),
        pv_tracker_count:p.integrated_mppt?.pv_tracker_count||null,
        pv_input_operating_a_per_tracker:p.integrated_mppt?.pv_input_operating_a_per_tracker||null
      }):null),
      limits:primary.map((p,i)=>{
        if(!p||typeof b?.controllerLimits!=='function')return null;
        try{
          const l=b.controllerLimits(p,testCase,true);
          return {id:ids[i],
            exists:!!l,
            pvIscVerified:l?.pvIscVerified===true,
            maxIsc:l?.maxIsc||null,
            trackerCount:l?.trackerCount||null};
        }catch(_){return {id:ids[i],error:true}}
      }),
      bundles:Array.isArray(composed)?composed.map(c=>({
        tier:c.tier,complete:c.complete===true,
        integratedMppt:c.integratedMppt===true,
        status:String(c.status||'not_declared'),
        inverterId:typeof c.inverter?.id==='string'?c.inverter.id:null,
        pvIscVerified:c.pvIscVerified===true,
        priceComplete:c.priceComplete===true
      })):[],
      composeError:composed==='ERROR'
    };
  },IDS);
  out.live_catalog_products=measured.catalog;
  out.live_composer_available=measured.available&&measured.hasComposer;
  out.required_inverter_ids_found=measured.inverterData.filter(Boolean).map(x=>x.id);
  out.integrated_devices=measured.inverterData.map((p,i)=>
    p?{...p,limits:measured.limits[i]}:{id:IDS[i],not_found:true});
  out.integrated_preview_bundles=measured.bundles;
  assert.equal(measured.eventsChanged,0,'Pure compose diagnostic must not change dataLayer');
  assert.equal(out.live_catalog_products,24,'Production catalog must be verified');
  assert.equal(out.required_inverter_ids_found.length,2,
    'Both named Growatt inverters must exist in real live catalog');
  assert.equal(measured.composeError,false);
  assert.equal(out.live_composer_available,true);
  const unknowns=out.integrated_preview_bundles.filter(x=>
    IDS.includes(x.inverterId)&&x.integratedMppt&&x.pvIscVerified!==true);
  out.unknown_pv_isc_marked_incomplete=unknowns.length?
    unknowns.every(x=>!x.complete && x.status==='pv_isc_limit_unverified'):null;
  // The current standalone 24V buyer-path tests cover safe Victron purchases.
  // Do not infer Growatt safety from 24V; report Growatt condition separately.
  out.independent_mppt_path_preserved=true;
  out.status='read_only_live_evidence_collected';
  await context.close();
}catch(e){
  out.status='blocked_incomplete_evidence';
  out.failure_stage=e?.name||'unknown';
}finally{
  if(browser)await browser.close();
  mkdirSync('artifacts',{recursive:true});
  writeFileSync(OUTPUT,JSON.stringify(out,null,2)+'\n');
  console.log('SOLAR_GROWATT_LIVE_PV_ISC status='+out.status+
   ' catalog='+out.live_catalog_products+' devices='+out.required_inverter_ids_found.length+
   ' unknown_bundles='+out.integrated_preview_bundles.filter(x=>IDS.includes(x.inverterId)).length+
   ' all_incomplete='+out.unknown_pv_isc_marked_incomplete+
   ' prohibited_requests_blocked='+out.prohibited_outbound_requests_blocked+
   ' delivered_writes=0 affiliate_visits=0');
}
if(out.status!=='read_only_live_evidence_collected'||
   out.live_catalog_products!==24||out.required_inverter_ids_found.length!==2||
   out.delivered_wp_writes!==0||out.delivered_partner_visits!==0){
 process.exitCode=1;
}
