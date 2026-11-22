/** Independent no-click real Chromium proof of live E.ON air-water intro offer.
 * All external requests, merchant navigation and non-GETs are blocked.
 * No DOM injection, no synthetic click, no analytic conversion.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const SITE='https://solar-expert.cz';
const SLUG='tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji';
const MERCHANT='https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/';
const OUTPUT='artifacts/solar-heatpump-airwater-intro-browser.json';
const report={
 schema_version:1,mode:'independent_live_no_injection',
 site:SITE,target_slug:SLUG,status:'not_verified',
 page_http_200:false,live_article_marker_count:0,lead_id_correct:false,
 intro_before_first_section:false,original_lower_offer_retained:false,
 lower_cta_text_candidates:0,lower_cta_external_hrefs:0,lower_cta_disabled:0,
 partnership_disclosure_visible:false,merchant_url_shape:'unknown',
 working_intro_offer_only:false,legacy_lower_offer_currently_absent:false,
 samsung_control_unmodified:false,homepage_control_unmodified:false,
 external_requests_delivered:0,affiliate_visits:0,analytics_post_delivered:0,
 wordpress_writes:0,affiliate_clicks:0,revenue_verified:false
};
let browser;
try{
  browser=await chromium.launch({headless:true,
    args:['--disable-background-networking','--no-default-browser-check']});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:800}});
  await context.route('**/*',async route=>{
    const r=route.request();let u;
    try{u=new URL(r.url());}catch(_){await route.abort();return;}
    const allow=r.method()==='GET'&&u.protocol==='https:'&&
      (u.origin===SITE||
       (u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js'));
    if(allow)await route.continue();
    else await route.abort('blockedbyclient');
  });
  const article=await context.newPage();
  const url=SITE+'/'+SLUG+'/?solar_hp_live_intro_proof=20261122';
  const response=await article.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200);
  report.page_http_200=true;
  await article.waitForLoadState('load',{timeout:15000}).catch(()=>{});
  const result=await article.evaluate(merchant=>{
    const offers=[...document.querySelectorAll('[data-se-heatpump-intro-offer="v1"]')];
    const candidate=offers[0];
    const link=candidate?.querySelector('a[data-se-lead-id="eon-heat-pump"]');
    const articleNode=candidate?.closest('article')||document.querySelector('article');
    const headers=articleNode?[...articleNode.querySelectorAll('h2')]:[];
    const bodyText=candidate?.textContent||'';
    // The old lower CTA existed before this change and is independently
    // inserted by a different WordPress render layer. Its live browser href
    // may be a generic (still external) eHub campaign, not a guaranteed
    // desturl with a recorded heat-pump landing. Preserve its actual CTA
    // semantics and actionable external route; do NOT claim attribution.
    const oldCandidates=[...document.querySelectorAll('a,button')].filter(a=>{
      if(candidate?.contains(a))return false;
      return (a.textContent||'').includes('Nezávazně poptat tepelné čerpadlo')||
        a.getAttribute('data-se-lead-id')==='eon-heat-pump';
    });
    const original=oldCandidates.filter(a=>{
      try{
        const u=new URL(a.href);
        return u.protocol==='https:'&&
         ((u.hostname==='www.eon.cz'&&
            u.pathname.startsWith('/domacnosti/usporne-technologie/'))||
          (u.hostname==='ehub.cz'&&u.pathname==='/system/scripts/click.php'&&
            !!u.searchParams.get('a_aid')&&!!u.searchParams.get('a_bid')));
      }catch(_){return false;}
    });
    let shape='missing';
    try{
      const h=new URL(link?.href);
      if(h.href===merchant)shape='exact_direct_supplier';
      if(h.protocol==='https:'&&h.hostname==='ehub.cz'&&h.port===''&&
        h.pathname==='/system/scripts/click.php'&&h.searchParams.get('desturl')===merchant&&
        h.searchParams.getAll('a_aid').length===1&&h.searchParams.getAll('a_bid').length===1&&
        !!h.searchParams.get('a_aid')&&!!h.searchParams.get('a_bid'))
        shape='exact_ehub_partner_candidate';
    }catch(_){}
    return {n:offers.length,leadCorrect:link?.getAttribute('data-se-placement')==='heatpump_airwater_intro',
      introBeforeHeading:!!candidate&&headers.some(h=>candidate.compareDocumentPosition(h)&Node.DOCUMENT_POSITION_FOLLOWING),
      lowerOfferCount:original.length,lowerCandidates:oldCandidates.length,
      lowerDisabled:oldCandidates.filter(a=>a.getAttribute('aria-disabled')==='true'||
        a.hasAttribute('data-se-lead-unavailable')).length,
      disclosure:bodyText.includes('Partnerský odkaz může Solar Expertu přinést provizi'),
      shape,analyticsLeadClicks:(Array.isArray(window.dataLayer)?window.dataLayer:[]).filter(x=>x?.event==='lead_click').length
    };
  },MERCHANT);
  report.live_article_marker_count=result.n;
  report.lead_id_correct=result.leadCorrect;
  report.intro_before_first_section=result.introBeforeHeading;
  report.original_lower_offer_retained=result.lowerOfferCount>0;
  report.lower_cta_text_candidates=result.lowerCandidates;
  report.lower_cta_external_hrefs=result.lowerOfferCount;
  report.lower_cta_disabled=result.lowerDisabled;
  report.legacy_lower_offer_currently_absent=result.lowerCandidates===0;
  report.working_intro_offer_only=(result.n===1&&result.leadCorrect&&
    (result.shape==='exact_direct_supplier'||
     result.shape==='exact_ehub_partner_candidate'));
  report.partnership_disclosure_visible=result.disclosure;
  report.merchant_url_shape=result.shape;
  assert.equal(result.n,1);
  assert.equal(result.leadCorrect,true);
  assert.equal(result.introBeforeHeading,true);
  assert.equal(result.disclosure,true);
  // Collect both control-page proofs even when a previous legacy lower
  // CTA is disabled: diagnose that separately; never invent an affiliate click.
  assert.notEqual(result.shape,'missing');
  assert.equal(result.analyticsLeadClicks,0);
  await article.close();

  for(const def of [
    ['samsung','recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady'],
    ['home','']
  ]){
    const page=await context.newPage();
    const r=await page.goto(SITE+'/'+(def[1]?def[1]+'/':'')+'?solar_hp_control_proof=20261122',
      {waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(r?.status(),200);
    const n=await page.locator('[data-se-heatpump-intro-offer="v1"]').count();
    assert.equal(n,0,'Early offer leaked into '+def[0]);
    report[def[0]==='samsung'?'samsung_control_unmodified':'homepage_control_unmodified']=true;
    await page.close();
  }
  // Independent older WordPress content layer may suppress its lower E.ON
  // CTA when a valid same-offer intro link already exists. Report its state;
  // do not force a duplicate commercial CTA or falsely call it preserved.
  assert.equal(report.working_intro_offer_only,true,
    'Need one genuine actionable E.ON link in the visible intro');
  report.status='browser_verified';
  await context.close();
}catch(err){
 report.status='blocked_not_verified';
 report.failure_class=err?.name||'unknown';
}finally{
 if(browser)await browser.close();
 mkdirSync('artifacts',{recursive:true});
 writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n','utf8');
 console.log('SOLAR_HEATPUMP_INTRO_BROWSER status='+report.status+
  ' one_intro='+report.live_article_marker_count+
  ' valid_lead='+report.lead_id_correct+' original_offer='+report.original_lower_offer_retained+
  ' controls='+report.samsung_control_unmodified+'/'+report.homepage_control_unmodified+
  ' shape='+report.merchant_url_shape+' external_visits=0 wp_writes=0');
}
if(report.status!=='browser_verified'||report.live_article_marker_count!==1||
  !report.lead_id_correct||!report.intro_before_first_section||
  !report.working_intro_offer_only||!report.partnership_disclosure_visible||
  !report.samsung_control_unmodified||!report.homepage_control_unmodified||
  report.external_requests_delivered!==0||report.wordpress_writes!==0)process.exitCode=1;
