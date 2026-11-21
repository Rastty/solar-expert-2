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
    // URL above is this script's first-party catalog URL STRING, not the
    // WHATWG URL constructor! In a VM this would silently reject EVERY
    // legitimate seller source and fabricate a zero-priced 24V bundle.
    window,console,URL:globalThis.URL,URLSearchParams,Date,Math,Number,Array,Set,Map,
    CustomEvent:class{},
    fetch(){throw new Error('No runtime or merchant fetch permitted in offline diagnostic')},
    setTimeout(){throw new Error('No timers in static model diagnostic')}
  };
  vm.createContext(sandbox);
  // Dev Builder requires the real offer adapter for complete-purchase-link
  // evidence and voltage fallback. Omitting it would falsely report a
  // zero-bundle gap even with valid source-backed merchant destinations.
  for(const path of [
    'assets/js/affiliate-adapter.js',
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
  const voltageProbes=[12,24,48].map(voltage=>{
    const size={...b.result,voltage,
      mpptA:Math.max(10,Math.ceil(((b.result.panelWp/voltage)*1.25)/5)*5)};
    const batteryProducts=products.filter(p=>p.type==='battery');
    const batteryBanks=window.SolarExpertBundleComposer.batteryBankCandidatesAll(
      batteryProducts,size);
    const rows=window.SolarExpertBundleComposer.compose(products,size,bundleDeals);
    return{
      voltage,available_battery_banks:batteryBanks.length,
      complete_tiers:rows.filter(x=>x.complete).length,
      price_complete_tiers:rows.filter(x=>x.complete&&x.priceComplete).length,
      rows:rows.map(row=>({
        tier:row.tier,complete:!!row.complete,
        priced:!!row.priceComplete,missing:row.missing||[],
        battery:row.battery?.id||null,inverter:row.inverter?.id||null,
        mppt:row.mppt?.id||null,pvIscVerified:row.pvIscVerified??null,
        // Source-backed quote readiness per real selected component.
        // Exposes only publicly visible effective price or null, no
        // merchant tracking URL, token or fabricated checkout route.
        parts:[
          ['battery',row.battery],['inverter',row.inverter],
          ['mppt',row.mppt],['panel',row.panel?.product]
        ].filter(([,p])=>p).map(([kind,p])=>{
          const n=window.SolarExpertProductMatcher.effectivePrice(p);
          const valid=Number.isFinite(n)&&n>0&&n<Number.MAX_SAFE_INTEGER;
          const offers=Array.isArray(p.offers)?p.offers:[];
          return {kind,id:p.id,price_czk:valid?n:null,
            public_quote_rows:offers.map(o=>({
              merchant:o.merchant||null,availability:o.availability||null,
              verified_at:o.verified_at||null,price_czk:Number(o.price_czk)||null,
              host:(()=>{try{return new URL(o.source_url).hostname}catch{return 'invalid'}})(),
              seller_source_accepted:typeof window.SolarExpertProductMatcher.hasSellerSource==='function'
                ?window.SolarExpertProductMatcher.hasSellerSource(o):null,
              freshness:typeof window.SolarExpertProductMatcher.verificationState==='function'
                ?window.SolarExpertProductMatcher.verificationState(o.verified_at):'legacy'
            })),
            dated_in_stock_source_offers:offers.filter(o=>
              typeof window.SolarExpertProductMatcher.hasSellerSource==='function' &&
              window.SolarExpertProductMatcher.hasSellerSource(o)&&
              o.availability==='in_stock'&&
              typeof window.SolarExpertProductMatcher.verificationState==='function' &&
              window.SolarExpertProductMatcher.verificationState(o.verified_at)==='fresh'
            ).length};
        })
      }))
    };
  });
  return {
    revision:rev,
    sample:{system_v:b.result.voltage,panel_wp:b.result.panelWp,
      battery_kwh:b.result.batteryKwh,inverter_w:b.result.inverterW,
      mppt_a:b.result.mpptA,energy_wh:b.result.energyWh,
      peak_w:b.result.peak},
    voltage_probes:voltageProbes,
    valid_bundles:completed.length,
    purchase_priced_bundles:priced.length,
    tier_status:tierStatus,
    analytic_events_created_only_in_memory:window.dataLayer.length
  };
}
const data=await catalog();
// This is the FIRST re-run after the new REST source has manufacturer PV
// short-circuit current evidence. Prove identity/values so this does not
// accidentally repeat the 2026-11-21 10:44 old-payload experiment.
const byId=new Map(data.products.map(p=>[p.id,p]));
const sourceValues=new Map([
  ['panel-victron-190',['isc_a',9.17]],
  ['mppt-victron-100-20',['max_pv_isc_a',20]],
  ['mppt-victron-100-30',['max_pv_isc_a',35]],
  ['mppt-victron-100-50',['max_pv_isc_a',60]],
  ['mppt-victron-150-35',['max_pv_isc_a',35]],
  ['mppt-victron-150-70',['max_pv_isc_a',50]],
  ['mppt-victron-250-100',['max_pv_isc_a',70]]
]);
for(const [id,[field,exactValue]] of sourceValues){
  const row=byId.get(id);
  if(!row||Number(row[field])!==exactValue)
    throw new Error('The new 7-product production PV evidence is absent: '+id);
  const sourceField=field==='isc_a'?'isc_source_url':'max_pv_isc_source_url';
  if(typeof row[sourceField]!=='string'||!row[sourceField].startsWith('https://'))
    throw new Error('Missing reviewed source URL for '+id);
}
const old=sandboxVersion(LEGACY,data.products,data.bundle_deals);
const next=sandboxVersion(DEV,data.products,data.bundle_deals);
const report={
  schema_version:1,
  method:'exact_old_and_pinned_dev_javascript_on_identical_current_public_rest_catalog',
  live_rest_catalog_items:data.products.length,
  verified_pv_isc_source_rows:sourceValues.size,
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
  for(const probe of x.voltage_probes){
    console.log('SOLAR_BUILDER_VOLTAGE version='+(x.revision===LEGACY?'old':'dev')+
      ' voltage='+probe.voltage+' battery_banks='+probe.available_battery_banks+
      ' complete='+probe.complete_tiers+' priced='+probe.price_complete_tiers+
      ' missing='+probe.rows.map(q=>q.tier+':'+(q.missing||[]).join('_')).join(','));
  }
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
const dev24=next.voltage_probes.find(p=>p.voltage===24);
const legacy24=old.voltage_probes.find(p=>p.voltage===24);
console.log('SOLAR_PV_EVIDENCE_BUYER_24V manufacturer_pv_rows='+sourceValues.size+
  ' dev_technical_complete='+dev24.complete_tiers+
  ' dev_priced='+dev24.price_complete_tiers+
  ' dev_best_quote_parts='+JSON.stringify(dev24.rows.find(r=>r.tier==='best')?.parts||[])+
  ' legacy_technical_complete='+legacy24.complete_tiers+
  ' verified_complete_system_purchase=false'+
  ' theme_deployed=false synthetic_affiliate_clicks=0');
console.log('SOLAR_BUILDER_GAP_DIAGNOSTIC status=read_only code_versions=2'+
  ' wordpress_writes=0 affiliate_clicks=0 theme_deployed=false');
