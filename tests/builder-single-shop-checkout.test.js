'use strict';
/** Buyer convenience must not synthesize one-click carts, affiliate traffic,
 * stock proof, single-seller bundle prices or false price savings.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-20T12:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},dataLayer:[],
  SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
require('../assets/js/affiliate-adapter.js');
const catalog=require('../data/product-seed.json');
const A=window.SolarExpertAffiliate;

const example=(scenario,products=catalog.products)=>{
  const b=window.solarExpertBuilder();
  b.catalog=products;b.bundleDeals=catalog.bundle_deals;
  b.preset(scenario);b.calc();
  return b;
};

const cottage=example('chata');
const bill=cottage.primaryShoppingList;
const one=cottage.primarySingleShop;
assert.equal(bill.total,34109,'Lowest mixed-shop catalog quote is unchanged');
assert(one,'Real catalog cottage has a complete one-shop alternative');
assert.equal(one.merchantId,'solar-import-cz');
assert.equal(one.merchantLabel,'Solar-Import.cz');
assert.equal(one.total,34120);
assert.equal(one.delta,11,'Convenience surcharge must be visible, not called a saving');
assert.equal(one.rows.length,4);
assert.equal(one.rows.reduce((sum,row)=>sum+row.subtotal,0),one.total);
assert.equal(one.rows.find(r=>r.label==='Solární panely').quantity,4);
assert.equal(one.rows.find(r=>r.label==='Baterie').quantity,1);
for(const row of one.rows){
  assert.equal(row.offer.merchantId,one.merchantId);
  assert.equal(row.offer.availability,'in_stock');
  assert(row.offer.price_czk>0);
  assert(A.isActionableMerchantHref(row.offer.href));
  assert(window.SolarExpertProductMatcher.hasSellerSource(row.offer.raw),
    'Source must be retailer-owned for the declared merchant');
  assert.equal(row.subtotal,row.quantity*row.offer.price_czk);
}
assert.equal(window.dataLayer.some(e=>e.event==='affiliate_click'),false,
  'Rendering or calculating a quote must never count fabricated visits');

const battery=one.rows.find(r=>r.label==='Baterie');
const clicked=A.trackOffer(battery.product,battery.offer.raw,'builder-single-shop-baterie');
assert.equal(clicked.merchantId,'solar-import-cz');
const clickEvents=window.dataLayer.filter(e=>e.event==='affiliate_click');
assert.equal(clickEvents.length,1);
assert.equal(clickEvents[0].placement,'builder-single-shop-baterie');

assert.equal(example('backup').primarySingleShop?.delta,11);
assert.equal(example('offgrid').primarySingleShop,null,
  'Already optimal at one merchant: do not show duplicate convenience CTA');
assert.equal(example('pond').primarySingleShop,null);

const updated=(merchant,productId,patch)=>catalog.products.map(p=>p.id===productId
  ?{...p,offers:p.offers.map(o=>o.merchant===merchant?{...o,...patch}:o)}:p);
const noSingleStore=updated('solar-import-cz','battery-goowei-24-100',{availability:'out_of_stock'})
  .map(p=>p.id==='panel-victron-190'
    ?{...p,offers:p.offers.map(o=>o.merchant==='battery-cz'?{...o,availability:'out_of_stock'}:o)}:p);
const split=example('chata',noSingleStore);
assert(split.primaryShoppingList,
  'Independent currently valid source-priced purchases may remain possible');
assert.equal(split.primarySingleShop,null,
  'Without all components at ANY one shop, do not synthesize a one-shop order');

const stale=example('chata',updated('solar-import-cz','battery-goowei-24-100',
  {verified_at:'2026-10-05'}));
assert(stale.primaryShoppingList,'Even without a convenient single seller, keep the real mixed-shop alternatives');
assert.equal(stale.primarySingleShop,null,
  'With the newly higher Battery.cz panel quote, an expired Solar-Import battery offer must not produce an unattractive or fake single-shop checkout');

const changed=updated('solar-import-cz','mppt-victron-100-30',
  {price_czk:2984});
// When a hypothetical newly quoted same-store MPPT price ties the
// lowest mixed-store total, the second card is redundant.
assert.equal(example('chata',changed).primarySingleShop,null);

const withDeal=example('chata');
withDeal.bundles=[{...withDeal.primaryBundle,bundleDeal:{id:'fictional-set',price_czk:100}}];
assert.equal(withDeal.primarySingleShop,null,
  'Do not replace a discounted set with a phantom full-price separate-parts order');

const withoutAffiliate=window.SolarExpertAffiliate;
window.SolarExpertAffiliate=null;
assert.equal(example('chata').primarySingleShop,null,'No link adapter means no checkout promotion');
window.SolarExpertAffiliate=withoutAffiliate;

const html=fs.readFileSync(path.join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
assert(html.includes('data-se-builder-single-shop="true"'));
assert(html.includes('primarySingleShop?.delta'));
assert(html.includes('nejde o společný košík'));
assert(html.includes('SolarExpertAffiliate.trackOffer(row.product,row.offer.raw'));
assert(html.includes("row.offer.monetized?'sponsored nofollow noopener':'nofollow noopener'"));
console.log('PASS: source-backed one-shop quote, 11 CZK surcharge, honest fallback and click-only tracking');
