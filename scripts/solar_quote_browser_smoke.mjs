#!/usr/bin/env node
/**
 * Browser-executed LIVE buyer path (Chromium + Alpine) with ZERO server-side
 * analytics POST, affiliate network navigation or synthetic paid traffic.
 * A previous independent GET-only verification already proved HTML and REST
 * bytes; this proves the old frontend ACTUALLY fetches that REST URL and
 * renders compatible/dated offers rather than showing loading/error fallbacks.
 *
 * Navigation is restricted to exact own domain + Alpine CDN; all POST and
 * non-first-party traffic is aborted. Click only a first-party internal sample
 * CTA while outbound/analytics traffic stays blocked. Never click an offer.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const ORIGIN='https://solar-expert.cz';
const CATALOG=ORIGIN+'/wp-json/solar-quote-overlay/v2/catalog';
const LIMIT_MS=35000;
const OUTPUT='artifacts/solar-browser-buyer-runtime.json';
const pageDefinitions=[
  {name:'battery',path:'/vyber-baterii/?scenario=panel400&solar_browser_audit=20261121',
   root:'[x-data="solarExpertBatterySelector()"]'},
  {name:'cottage_battery',path:'/vyber-baterii/?scenario=builder-chata&solar_browser_audit=20261121',
   root:'[x-data="solarExpertBatterySelector()"]'},
  {name:'builder',path:'/solarni-sestava-na-chatu/?solar_browser_audit=20261121',
   root:'[x-data="solarExpertBuilder()"]'},
  {name:'home',path:'/?solar_browser_audit=20261121',
   root:'[x-data="solarExpertBuilder()"]'}
];
let deniedMethods=0,deniedExternal=0;
const onlyAllowed=(url,method)=>{
  if(method!=='GET'&&method!=='HEAD'){deniedMethods++;return false;}
  let parsed;
  try{parsed=new URL(url);}catch{return false;}
  if(parsed.protocol!=='https:'){deniedExternal++;return false;}
  if(parsed.origin===ORIGIN)return true;
  if(parsed.hostname==='cdn.jsdelivr.net'&&
     parsed.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')return true;
  deniedExternal++;return false;
};
const safeNote=(value)=>String(value).replace(/https?:\/\/[^\s]+/g,'[url]').slice(0,180);

const results=[];
const browser=await chromium.launch({
  headless:true,
  args:['--disable-background-networking','--no-default-browser-check']
});
const context=await browser.newContext({
  serviceWorkers:'block',acceptDownloads:false,
  viewport:{width:1360,height:850},locale:'cs-CZ',
  extraHTTPHeaders:{'X-Solar-Expert-QA':'no-events-no-affiliate'}
});
await context.route('**/*',async route=>{
  const req=route.request();
  if(!onlyAllowed(req.url(),req.method())){
    await route.abort('blockedbyclient');
    return;
  }
  await route.continue();
});

let succeeded=false;
try{
  for(const def of pageDefinitions){
    const page=await context.newPage();
    const observedCatalog=[];
    const jsErrors=[];
    page.on('response',response=>{
      if(response.url()===CATALOG){
        observedCatalog.push({status:response.status(),
          method:response.request().method()});
      }
    });
    page.on('pageerror',error=>jsErrors.push(safeNote(error.message)));

    const response=await page.goto(ORIGIN+def.path,{
      waitUntil:'domcontentloaded',timeout:LIMIT_MS
    });
    assert.equal(response?.status(),200,def.name+' returned non-200 HTML');
    await page.waitForFunction(root=>{
      const el=document.querySelector(root);
      if(!el||!window.Alpine||!window.Alpine.$data)return false;
      const data=window.Alpine.$data(el);
      return data.catalogLoading===false;
    },def.root,{timeout:LIMIT_MS});

    const model=await page.evaluate(root=>{
      const el=document.querySelector(root);
      const d=window.Alpine.$data(el);
      const catalog=Array.from(d.catalog||[]);
      const offers=catalog.flatMap(p=>Array.isArray(p.offers)&&p.offers.length?p.offers:[p]);
      const matcher=window.SolarExpertProductMatcher;
      const freshOffers=offers.filter(o=>o.availability==='in_stock'&&
        Number(o.price_czk)>0&&
        matcher.verificationState(o.verified_at)==='fresh');
      const staleOffers=offers.filter(o=>o.availability!=='discontinued'&&
        Number(o.price_czk)>0&&matcher.verificationState(o.verified_at)==='stale');
      const common={
        catalogUrl:window.SolarExpertConfig?.catalogUrl,
        alpine:!!window.Alpine,
        catalogLength:catalog.length,
        catalogLoading:!!d.catalogLoading,
        catalogError:!!d.catalogError,
        freshInStockOffers:freshOffers.length,
        stalePricedOffers:staleOffers.length
      };
      return root.includes('BatterySelector')
        ? {...common,matches:Array.from(d.matches||[]).length,
           engagementTracked:!!d.engagementTracked}
        : {...common,catalogReady:!!d.catalogReady,
           bundleDealCount:Array.from(d.bundleDeals||[]).length};
    },def.root);

    assert.equal(model.catalogUrl,CATALOG,def.name+': runtime URL did not override static catalog');
    assert.equal(model.catalogLength,24,def.name+': browser did not hydrate 24 products');
    assert.equal(model.catalogError,false,def.name+': catalog error state in live browser');
    assert.ok(model.freshInStockOffers>0,def.name+': no fresh purchasable offer');
    // Actual legacy template has both Alpine init() and x-init="init()",
    // causing two GETs. Report this as a real performance debt without
    // misclassifying a working buyer catalog as broken.
    assert.ok(observedCatalog.length>=1&&observedCatalog.length<=2,
      def.name+': expected one or two actual frontend catalog GETs');
    for(const received of observedCatalog){
      assert.deepEqual(received,{status:200,method:'GET'},
        def.name+': catalog GET was not HTTP 200');
    }
    assert.deepEqual(jsErrors,[],def.name+': browser JavaScript exception(s)');

    const result={
      tool:def.name,catalog_gets:observedCatalog.length,
      catalog_status:200,catalog_products:model.catalogLength,
      duplicate_catalog_fetches:Math.max(0,observedCatalog.length-1),
      fresh_in_stock_offer_rows:model.freshInStockOffers,
      stale_offer_rows:model.stalePricedOffers,
      runtime_url_exact:true,js_exceptions:jsErrors.length
    };
    if(def.name==='battery'||def.name==='cottage_battery'){
      // Zero clicks: scenario=panel400 is a pre-reviewed editorial deep link.
      // An empty match list or hidden CTA is an actual business-flow failure.
      const visibleCards=await page.locator(def.root+' .se-bundle:visible').count();
      const visibleOffers=await page.locator(def.root+' a.se-offer:visible').count();
      const sponsored=await page.locator(
        def.root+' a.se-offer:visible[rel*="sponsored"]').count();
      assert.ok(model.matches>0,'Battery selector has no compatible recommendation');
      assert.ok(visibleCards>0,'Battery selector model has no visible recommendation card');
      assert.ok(visibleOffers>0,'Battery selector has no visible merchant offer');
      const invalidHref=await page.locator(def.root+' a.se-offer:visible').evaluateAll(
        links=>links.filter(l=>!l.href||l.getAttribute('href')==='#').length);
      assert.equal(invalidHref,0,'Buyer product CTA link is a dead placeholder');
      result.match_count=model.matches;
      result.visible_cards=visibleCards;
      result.visible_merchant_offers=visibleOffers;
      result.sponsored_affiliate_links=sponsored;
      result.dead_cta_links=invalidHref;
      result.synthetic_offer_clicks=0;
      if(def.name==='cottage_battery'){
        const banner=page.locator('[data-se-builder-cottage-model="v2"]');
        await banner.waitFor({state:'visible',timeout:10000});
        const fields=await page.evaluate(root=>{
          const d=window.Alpine.$data(document.querySelector(root));
          return {voltage:Number(d.voltage),dailyKwh:Number(d.dailyKwh),
            autonomy:Number(d.autonomy),inverterW:Number(d.inverterW),
            requiredBatteryKwh:Number(d.requiredBatteryKwh),
            requiredDischargeA:Number(d.requiredDischargeA),
            productIds:Array.from(d.matches||[]).map(r=>r.product?.id),
            engagementTracked:!!d.engagementTracked};
        },def.root);
        assert.equal(fields.voltage,24,'Cottage handoff voltage must match source');
        assert.ok(Math.abs(fields.dailyKwh-1.448)<0.000001,
          'Cottage handoff must preserve the 1448Wh/day Builder model');
        assert.equal(fields.autonomy,1);
        assert.equal(fields.inverterW,900,'BMS startup screening must be conservative');
        assert.equal(fields.requiredBatteryKwh,2.1,
          'Correct one-day 80%-usable 90%-AC-efficiency minimum is 2.1kWh');
        assert.equal(fields.requiredDischargeA,42,
          'Required DC discharge is ceil(900W/0.9/24V) = 42A');
        assert.ok(fields.productIds.includes('battery-goowei-24-100'),
          'Actual source-verified 24V 2.56kWh battery must be recommended');
        assert.ok(!fields.productIds.includes('battery-goowei-24-50'),
          'Undersized 24V 1.28kWh battery must never appear');
        assert.equal(fields.engagementTracked,false,
          'Opening an editorial deep link must not fake user engagement');
        const message=await banner.innerText();
        assert.ok(message.includes('nikoli schválenou solární sestavu'),
          'Handoff must disclose that a battery is not a complete system');
        result.cottage_model_exact=true;
        result.under_capacity_battery_excluded=true;
        result.synthetic_engagement=false;
        result.model_minimum_kwh=fields.requiredBatteryKwh;
        result.model_bms_minimum_a=fields.requiredDischargeA;
      }
    }else{
      assert.equal(model.catalogReady,true,'Builder failed catalog initialization');
      // The new reversible WordPress overlay must be invisible until a
      // genuinely calculated (step 4) result is missing all safe bundles.
      // A static HTML/REST proof alone cannot establish Alpine visibility.
      const modelCard=page.locator('#builder [data-se-reviewed-24v-example="v1"]');
      await modelCard.waitFor({state:'attached',timeout:LIMIT_MS});
      assert.equal(await modelCard.isVisible(),false,
        'One 24V model card must stay hidden until genuine fixed sample');
      const recovery=page.locator('#builder [data-se-builder-recovery="v1"]');
      await recovery.waitFor({state:'attached',timeout:LIMIT_MS});
      assert.equal(await recovery.isVisible(),false,
        'Recovery warning should stay hidden before Builder calculation');
      const button=def.name==='home'
        ? page.locator('[data-se-home-demo="builder-preview"]')
        : page.getByRole('button',{name:/Ukázat vzorovou sestavu/});
      assert.equal(await button.count(),1,
        def.name+': first-use example CTA not unique');
      // On homepage, exercise the real primary hero CTA, not an
      // internal test-only shortcut. All analytics POSTs are blocked.
      await button.click({timeout:10000});
      await page.waitForFunction(root=>{
        const d=window.Alpine.$data(document.querySelector(root));
        return d.step===4&&!!d.result;
      },def.root,{timeout:15000});
      const after=await page.evaluate(root=>{
        const d=window.Alpine.$data(document.querySelector(root));
        return{
          step:d.step,
          completeBundles:Array.from(d.completeBundles||[]).length,
          incompleteBundles:Array.from(d.incompleteBundles||[]).length,
          catalogReady:!!d.catalogReady,
          resultValid:Number.isFinite(Number(d.result?.energyKwh))&&
            Number(d.result?.energyKwh)>0
        };
      },def.root);
      assert.ok(after.resultValid,'Builder sample result is absent after click');
      assert.equal(after.catalogReady,true,'Builder catalog not ready after sample');
      assert.equal(after.completeBundles,0,'Unexpected complete technical bundle: reassess recovery branch');
      await recovery.waitFor({state:'visible',timeout:10000});
      assert.equal(await page.locator('#builder [data-se-builder-recovery="v1"]').count(),1,
        'Recovery note is duplicated within Builder');
      assert.equal(await recovery.locator('[data-se-recovery-12v]').isVisible(),true,
        'Source-evidenced 12V stock limitation is not presented');
      assert.equal(await recovery.locator('[data-se-recovery-general]').isVisible(),false,
        'Generic fallback should not obscure specific 12V explanation');
      const handoff=recovery.locator('a[data-se-recovery-destination]');
      assert.equal(await handoff.count(),1,'Safe same-site battery handoff is missing');
      assert.equal(await handoff.getAttribute('href'),'/vyber-baterii/?scenario=builder-chata',
        'Buyer recovery must never take the user to a merchant or arbitrary page');
      assert.equal(await handoff.isVisible(),true,
        'Safe alternative model link is not visible or actionable');
      const copy=await recovery.innerText();
      assert.ok(copy.includes('ne náhradní hotovou sestavu'),
        'Recovery must disclose that a partial battery example is not a complete system');
      // The 24V variant is a source-reviewed illustrative set of separate
      // purchases, never a custom installation sign-off or a shared cart.
      await modelCard.waitFor({state:'visible',timeout:10000});
      assert.equal(await page.locator('#builder [data-se-reviewed-24v-example="v1"]').count(),1,
        'Do not duplicate preview 24V example');
      const productAnchors=modelCard.locator('a[data-se-placement="builder-24v-reviewed-model"]');
      assert.equal(await productAnchors.count(),4,
        'Source-backed priced kit must have all four purchase destinations, not partial links');
      const quotes=await productAnchors.evaluateAll(nodes=>nodes.map(a=>{
        const url=new URL(a.href);
        return {id:a.dataset.seProductId||'',
          merchant:a.dataset.seMerchant||'',protocol:url.protocol,
          host:url.hostname,external:url.origin!==window.location.origin,
          rel:a.rel,
          placeholder:a.getAttribute('href')==='#'};
      }));
      assert.deepEqual(new Set(quotes.map(q=>q.id)),new Set([
        'battery-goowei-24-100','inverter-victron-24-1200',
        'mppt-victron-100-30','panel-victron-190'
      ]),'A priced 24V model must show exact source-reviewed component IDs');
      assert.ok(quotes.every(q=>q.external&&q.protocol==='https:'&&
        !q.placeholder&&q.merchant&&q.rel.includes('nofollow')&&
        q.rel.includes('noopener')),
        'No dead, internal, unsafe or unlabelled merchant offer links');
      const modelTotal=await modelCard.locator('[data-se-model-total="true"]').innerText();
      assert.equal(modelTotal.replace(/[^0-9]/g,''),'34109',
        'Current source-locked 24V 2S2P four-component subtotal must reconcile');
      const buyerCopy=await modelCard.innerText();
      assert.ok(buyerCopy.includes('2S2P')&&
        buyerCopy.includes('Toto není jeden společný košík')&&
        buyerCopy.includes('nejde o instalační projekt')&&
        buyerCopy.includes('Battery.cz a Solar-Import.cz'),
        'Source-priced 24V model must keep seller-independence and incomplete-install disclaimers');
      result.reviewed_24v_model_visible=true;
      result.reviewed_24v_model_seller_links=quotes.length;
      result.reviewed_24v_model_exact_price_czk=34109;
      result.reviewed_model_installation_claim=false;
      result.reviewed_model_synthetic_merchant_clicks=0;
      result.empty_result_recovery_visible=true;
      result.homepage_primary_cta_exercised=def.name==='home';
      result.safe_handoff_link='/vyber-baterii/?scenario=builder-chata';
      result.recovery_warning_discloses_incomplete_system=true;
      result.example_step=after.step;
      result.complete_technical_bundles=after.completeBundles;
      result.incomplete_bundles=after.incompleteBundles;
      result.sample_result_rendered=true;
      result.synthetic_outbound_clicks=0;
    }
    results.push(result);
    await page.close();
  }
  succeeded=true;
}finally{
  await context.close();
  await browser.close();
  mkdirSync('artifacts',{recursive:true});
  const report={
    schema_version:1,
    site:ORIGIN,mode:'live_chromium_runtime_read_only',
    status:succeeded?'browser_verified':'browser_not_verified',
    expected_catalog_path:'/wp-json/solar-quote-overlay/v2/catalog',
    tools:results,non_get_requests_blocked:deniedMethods,
    external_requests_blocked:deniedExternal,
    affiliate_navigation_attempts:0,
    merchant_requests:0,word_press_writes:0,
    analytics_events_sent:0,theme_deployed:false,
    browser_execution_verified:succeeded,
    commission_verified:false
  };
  writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.log('SOLAR_BROWSER_RUNTIME status='+report.status+
    ' tools='+results.length+' analytics_posts_blocked='+deniedMethods+
    ' external_blocked='+deniedExternal+' WP_writes=0 affiliate_clicks=0');
  for(const x of results){
    console.log('SOLAR_BROWSER_TOOL tool='+x.tool+
      ' catalog_gets='+x.catalog_gets+
      ' fresh_in_stock='+x.fresh_in_stock_offer_rows+
      ' visible_offers='+(x.visible_merchant_offers??'not_applicable')+
      ' compatible_bundles='+(x.complete_technical_bundles??'not_applicable')+
      ' safe_recovery_visible='+(x.empty_result_recovery_visible??'not_applicable')+
      ' reviewed_24v_links='+(x.reviewed_24v_model_seller_links??'not_applicable')+
      ' model_price='+(x.reviewed_24v_model_exact_price_czk??'not_applicable'));
  }
}
