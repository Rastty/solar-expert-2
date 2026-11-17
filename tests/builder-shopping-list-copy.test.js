'use strict';
// Copying a Buyer bill is a convenience for a real multi-shop purchase, never
// a simulated cart, click, stock refresh, or underpriced incomplete order.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-17T12:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},dataLayer:[],
  SolarExpertConfig:{affiliateBases:{
    'battery-cz':'https://ehub.cz/system/scripts/click.php?a_aid=test&a_bid=battery',
    'solar-import-cz':'https://ehub.cz/system/scripts/click.php?a_aid=test&a_bid=solar'
  },affiliateMap:{products:{},leads:{}}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
require('../assets/js/affiliate-adapter.js');
const seed=require('../data/product-seed.json');
const make=()=>{
  const builder=window.solarExpertBuilder();
  builder.catalog=seed.products;
  builder.bundleDeals=seed.bundle_deals;
  builder.preset('chata');builder.calc();
  return builder;
};

(async()=>{
  const builder=make();
  assert(builder.primaryShoppingList);
  assert(builder.canCopyPrimaryPurchaseList);
  const rows=builder.primaryPurchaseRows;
  const text=builder.primaryPurchaseText;
  assert.equal(rows.length,4,'One line per distinct purchase item');
  assert(text.includes('4× '+rows.find(row=>row.label==='Solární panely').name),
    'Show all four panels, not a misleading single-panel order');
  assert(text.includes(builder.primaryShoppingList.total.toLocaleString('cs-CZ')+' Kč'));
  assert(text.includes('Každou položku objednejte zvlášť'));
  assert(text.includes('Cenu, sklad i dostupný počet znovu ověřte'));
  assert(text.includes('kabely, jištění, konstrukci, montáž ani revizi'));
  assert(text.includes('partnerské (affiliate)'));
  for(const row of rows){
    assert(text.includes(row.offer.href),'Use exact actionable seller destination for each row');
    assert(text.includes(row.offer.merchant.label));
    assert(text.includes(row.unitPrice.toLocaleString('cs-CZ')+' Kč/ks'));
    assert.equal(row.offer.raw.merchant,row.offer.merchantId);
  }
  assert(rows.some(row=>row.offer.monetized),
    'At least one shared link keeps the configured real affiliate base');
  const clicksBefore=window.dataLayer.filter(event=>event.event==='affiliate_click').length;
  const copied=[];
  Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{writeText:async content=>copied.push(content)}}});
  assert.equal(await builder.copyPrimaryPurchaseList(),true);
  assert.deepEqual(copied,[text]);
  assert.equal(builder.showCopyFallback,false);
  assert(builder.copyStatus.includes('zkopírován'));
  assert.equal(window.dataLayer.filter(event=>event.event==='affiliate_click').length,clicksBefore,
    'Copying must not fabricate affiliate clicks or commissions');

  Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw new Error('denied');}}}});
  assert.equal(await builder.copyPrimaryPurchaseList(),false);
  assert(builder.showCopyFallback,'Clipboard rejection must permit manual copy');
  assert(builder.copyStatus.includes('Označte a zkopírujte'));
  builder.calc();
  assert.equal(builder.showCopyFallback,false,'Recalculation clears a previous copy prompt');

  const originalOffers=window.SolarExpertAffiliate.offers;
  const missingProduct=builder.primaryPurchaseRows[0].product;
  window.SolarExpertAffiliate.offers=function(p){
    return p&&p.id===missingProduct.id?[]:originalOffers.call(this,p);
  };
  assert.equal(builder.canCopyPrimaryPurchaseList,false,'Do not copy partial multi-merchant list');
  assert.equal(builder.primaryPurchaseText,'');
  assert.equal(await builder.copyPrimaryPurchaseList(),false);
  assert.equal(copied.length,1,'Blocked copy must not reuse stale merchant links');
  window.SolarExpertAffiliate.offers=originalOffers;
  assert.equal(builder.canCopyPrimaryPurchaseList,true);

  builder.reset();
  assert.equal(builder.canCopyPrimaryPurchaseList,false,'Reset must clear stale purchase links');
  assert.equal(builder.primaryPurchaseText,'');
  assert.equal(builder.copyStatus,'');
  mock.timers.setTime(new Date('2026-12-20T12:00:00Z').getTime());
  const expired=make();
  assert.equal(expired.canCopyPrimaryPurchaseList,false,
    'No copyable purchase list once source-verified offer prices expire');
  assert.equal(expired.primaryPurchaseText,'');

  const html=fs.readFileSync(path.join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');
  assert(html.includes('x-show="canCopyPrimaryPurchaseList"'));
  assert(html.includes('@click="copyPrimaryPurchaseList()"'));
  assert(html.includes('x-show="showCopyFallback && canCopyPrimaryPurchaseList"'));
  assert(html.includes('role="status" aria-live="polite"'));
  assert(css.includes('.se-shopping-copy-fallback'));
  console.log('PASS: complete quoted multi-shop bill copy, actual merchant URLs, fail-closed guards and manual fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
