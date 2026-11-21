#!/usr/bin/env node
/**
 * Zero-write Builder gap study: run exact legacy live-version JS and pinned
 * dev-version JS over the SAME live source-pinned public REST catalog.
 *
 * No Playwright/browser CTA, WordPress account, merchant source request,
 * affiliate click, analytics POST, runtime injection or theme release.
 * Decision model output is diagnostically useful, NOT an authorization to
 * ship new electrical/safety policy onto the old theme.
 */
import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';

const SITE='https://solar-expert.cz';
const URL=SITE+'/wp-json/solar-quote-overlay/v2/catalog';
const LEGACY='867d0c1aadbfd79dd1fdd57ac424cff491f5a813';
const DEV='535698742864442c839261613c6583110223204f';
const MAX=650000;

function readScript(commit,path){
  return execFileSync('git',['show',commit+':'+path],{
    maxBuffer:500000,stdio:['ignore','pipe','ignore']
  }).toString('utf8');
}
async function catalog(){
  const r=await fetch(URL,{method:'GET',redirect:'manual',headers:{
    'Accept':'application/json','Cache-Control':'no-cache',
    'User-Agent':'SolarBuilderGap-Readonly/1.0'
  },signal:AbortSignal.timeout(25000)});
  if(!r.ok||r.redirected||r.url!==URL||
     !(r.headers.get('content-type')||'').includes('application/json'))
    throw new Error('Live first-party REST catalog unavailable or redirected');
  const text=await r.text();
  if(text.length>MAX)throw new Error('Catalog over size cap');
  const data=JSON.parse(text);
  if(!Array.isArray(data.products)||data.products.length!==24||
     !Array.isArray(data.bundle_deals))throw new Error('Catalog identity/count drift');
  return data;
}
function sandboxVersion(rev,products,bundleDeals){
  const window={
    SolarExpertConfig:{catalogUrl:URL,affiliateMap:{},affiliateBases:{}},
    location:{origin:SITE,pathname:'/solarni-sestava-na-chatu/'},
    dataLayer:[]
  };
  const sandbox={
    window,console,URL,URLSearchParams,Date,Math,Number,Array,Set,Map,
    CustomEvent:class{},
    fetch(){throw new Error('No runtime or merchant fetch permitted in offline diagnostic')},
    setTimeout(){throw new Error('No timers in static model diagnostic')}
  };
  vm.createContext(sandbox);
  for(const path of [
    'assets/js/product-matcher.js',
    'assets/js/bundle-composer.js',
    'assets/js/builder.js'
  ])vm.runInContext(readScript(rev,path),sandbox,{filename:path,timeout:2500});
  const b=window.solarExpertBuilder();
  b.catalog=products;
  b.bundleDeals=bundleDeals;
  b.catalogReady=true;
  b.catalogLoading=false;
  b.quickPreview();
  if(!b.result||b.step!==4||!Array.isArray(b.bundles)||
      b.bundles.length!==3)throw new Error('Builder sample failed to compute');
  const tierStatus=b.bundles.map(row=>({
    tier:row.tier,
    complete:Boolean(row.complete),
    priceComplete:Boolean(row.priceComplete),
    status:row.status||'unknown',
    pvIscVerified:row.pvIscVerified??null,
    missing:Array.isArray(row.missing)?row.missing:[],
    battery:row.battery?.id||null,
    inverter:row.inverter?.id||null,
    mppt:row.mppt?.id||null,
    panel:row.panel?.product?.id||null
  }));
  const completed=b.completeBundles||[];
  const priced=completed.filter(x=>x.priceComplete&&Number.isFinite(x.totalPrice));
  return {
    revision:rev,
    sample:{system_v:b.result.voltage,panel_wp:b.result.panelWp,
      battery_kwh:b.result.batteryKwh,inverter_w:b.result.inverterW,
      mppt_a:b.result.mpptA,energy_wh:b.result.energyWh,
      peak_w:b.result.peak},
    valid_bundles:completed.length,
    purchase_priced_bundles:priced.length,
    tier_status:tierStatus,
    analytic_events_created_only_in_memory:window.dataLayer.length
  };
}
const data=await catalog();
const old=sandboxVersion(LEGACY,data.products,data.bundle_deals);
const next=sandboxVersion(DEV,data.products,data.bundle_deals);
const report={
  schema_version:1,
  method:'exact_old_and_pinned_dev_javascript_on_identical_current_public_rest_catalog',
  live_rest_catalog_items:data.products.length,
  live_rest_bundle_deals:data.bundle_deals.length,
  legacy:old,
  pinned_dev:next,
  production_theme_deployed:false,
  wordpress_writes:0,affiliate_clicks:0,
  analytics_post_attempts:0,
  conclusion:'Diagnostic only; never relax electrical proof or claim deployed dev code'
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/solar-builder-live-vs-dev-gap.json',
  JSON.stringify(report,null,2)+'\n','utf8');
for(const x of [old,next]){
  console.log('SOLAR_BUILDER_GAP version='+(
    x.revision===LEGACY?'legacy_live_code':'pinned_dev')+
    ' voltage='+x.sample.system_v+
    ' panel_wp='+x.sample.panel_wp+' mppt_a='+x.sample.mppt_a+
    ' complete='+x.valid_bundles+
    ' purchase_priced='+x.purchase_priced_bundles+
    ' tiers='+x.tier_status.map(t=>
      t.tier+':'+(t.complete?'complete':'missing_'+t.missing.join('_'))+
      ':'+(t.priceComplete?'priced':'notpriced')).join(','));
}
console.log('SOLAR_BUILDER_GAP_DIAGNOSTIC status=read_only code_versions=2'+
  ' wordpress_writes=0 affiliate_clicks=0 theme_deployed=false');
