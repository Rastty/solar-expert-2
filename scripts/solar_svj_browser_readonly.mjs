/**
 * Non-mutating real-Chromium proof of E.ON SVJ lead routing readiness.
 * Loads ONLY reviewed Solar Expert site GETs; aborts ALL external requests,
 * POSTs, beacons, partner clicks and analytics writes. Never clicks a CTA.
 * Real JavaScript executes; pure resolveLead() reads configuration but emits
 * no lead event and does not navigate to E.ON/eHub.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const SITE='https://solar-expert.cz';
const PAGE=SITE+'/navratnost-fotovoltaicke-elektrarny-v-bytovem-dome/';
const MERCHANT='https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/';
const OUTPUT='artifacts/solar-svj-browser-readonly.json';

const report={
  schema_version:1,site:SITE,page_slug:'navratnost-fotovoltaicke-elektrarny-v-bytovem-dome',
  observed_at_utc:new Date().toISOString(),method:'browser_get_only',
  purpose:'prove_exact_eon_svj_runtime_lead_destination_without_outbound_visit',
  browser_execution_verified:false,public_page_http_200:false,svj_article_heading_present:false,
  affiliate_adapter_loaded:false,lead_initializer_script_present:false,
  rendered_svj_cta_count:0,route_status:'unknown',
  merchant_or_affiliate_requests_blocked:0,other_third_party_requests_blocked:0,
  non_get_requests_blocked:0,external_requests_delivered:0,
  affiliate_navigation_attempts:0,lead_click_events:0,wordpress_writes:0,
  revenue_or_svj_campaign_approval:'unknown',proven_conversion:false,
};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.route('**/*',async route=>{
    const req=route.request();
    let url;
    try{url=new URL(req.url());}catch(_){await route.abort();return;}
    if(req.method()==='GET'&&url.origin===SITE){
      await route.continue();
      return;
    }
    if(req.method()!=='GET')report.non_get_requests_blocked++;
    else if(url.hostname==='ehub.cz'||url.hostname.endsWith('.ehub.cz')||
      url.hostname==='eon.cz'||url.hostname.endsWith('.eon.cz')){
      report.merchant_or_affiliate_requests_blocked++;
    }else{
      report.other_third_party_requests_blocked++;
    }
    await route.abort();
  });
  const res=await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:45000});
  report.public_page_http_200=Boolean(res?.status()===200&&page.url()===PAGE);
  await page.waitForLoadState('load',{timeout:18000}).catch(()=>{});
  await page.waitForTimeout(450);
  const check=await page.evaluate(merchant=>{
    const hasHeading=Boolean(document.querySelector('article h1,h1')?.textContent?.includes('Návratnost fotovoltaiky'));
    const scripts=[...document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src')||'');
    const initializer=scripts.some(src=>src.includes('/lead-cta.js'));
    const adapter=window.SolarExpertAffiliate;
    const canResolve=Boolean(adapter&&typeof adapter.resolveLead==='function');
    const tagged=document.querySelectorAll('a[data-se-lead-id="eon-svj"]').length;
    const events=(Array.isArray(window.dataLayer)?window.dataLayer:[])
      .filter(e=>e&&e.event==='lead_click').length;
    let routeStatus='runtime_adapter_missing';
    if(canResolve){
      let response;
      try{response=adapter.resolveLead('eon-svj',merchant);}catch(_){response=null;}
      const href=typeof response==='string'?response:response?.href;
      const monetized=Boolean(response&&typeof response==='object'&&response.monetized===true);
      if(typeof href==='string'){
        try{
          const u=new URL(href);
          const exact=(u.protocol==='https:'&&u.hostname==='ehub.cz'&&!u.username&&!u.password&&
            u.port===''&&u.pathname==='/system/scripts/click.php'&&u.hash===''&&
            u.searchParams.getAll('a_aid').length===1&&Boolean(u.searchParams.get('a_aid')?.trim())&&
            u.searchParams.getAll('a_bid').length===1&&Boolean(u.searchParams.get('a_bid')?.trim())&&
            u.searchParams.getAll('desturl').length===1&&u.searchParams.get('desturl')===merchant);
          if(monetized&&exact)routeStatus='exact_ehub_svj_destination_candidate';
          else if(!monetized&&href===merchant)routeStatus='direct_svj_supplier_fallback';
          else routeStatus='unsafe_or_wrong_destination';
        }catch(_){routeStatus='unsafe_or_wrong_destination';}
      }else routeStatus='lead_resolver_unavailable';
    }
    return {hasHeading,initializer,canResolve,tagged,events,routeStatus};
  },MERCHANT);
  Object.assign(report,{
    browser_execution_verified:true,
    svj_article_heading_present:check.hasHeading,
    affiliate_adapter_loaded:check.canResolve,
    lead_initializer_script_present:check.initializer,
    rendered_svj_cta_count:check.tagged,
    route_status:check.routeStatus,
    lead_click_events:check.events,
  });
}catch(_){
  report.route_status='browser_read_failed';
}finally{
  if(browser)await browser.close();
}
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
console.log('SOLAR_SVJ_REAL_BROWSER'
  +' page_200='+report.public_page_http_200
  +' adapter='+report.affiliate_adapter_loaded
  +' initializer='+report.lead_initializer_script_present
  +' tagged_cta='+report.rendered_svj_cta_count
  +' route_status='+report.route_status
  +' lead_events='+report.lead_click_events
  +' external_visits=0 writes=0');
if(!report.browser_execution_verified||!report.public_page_http_200||
   !report.svj_article_heading_present||report.lead_click_events!==0||
   report.external_requests_delivered!==0||report.wordpress_writes!==0){
  process.exitCode=1;
}
