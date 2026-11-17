'use strict';
// The first visible buyer bill must provide real product destinations without
// inventing a cart, different seller price, recent stock check or a purchase.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-17T12:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},dataLayer:[],
  SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
require('../assets/js/affiliate-adapter.js');
const seed=require('../data/product-seed.json');
const A=window.SolarExpertAffiliate;
const M=window.SolarExpertProductMatcher;
const make=()=>{
  const builder=window.solarExpertBuilder();
  builder.catalog=seed.products;
  builder.bundleDeals=seed.bundle_deals;
  builder.preset('chata');builder.calc();
  return builder;
};

const builder=make();
const original=builder.primaryShoppingList;
const rows=builder.primaryPurchaseRows;
assert(original && rows.length===original.rows.length,'Every original buyer-bill line must remain visible');
assert.equal(rows.reduce((sum,row)=>sum+row.subtotal,0),original.total,
  'Direct links must not change item counts, price or total');
assert.equal(rows.filter(row=>row.offer).length,rows.length,
  'The current quoted cottage has real same-price merchant destinations for each component');
assert.equal(rows.find(row=>row.label==='Solární panely').quantity,4,
  'The buyer must still order four panels, not one');
assert.equal(rows.find(row=>row.label==='Solární panely').placement,'builder-primary-panel');
for(const row of rows){
  assert.equal(Number(row.offer.price_czk),row.unitPrice,'Never switch to a different price');
  assert.equal(row.offer.availability,'in_stock');
  assert(M.hasSellerSource(row.offer.raw),'Never link a quote to an unrelated seller source');
  assert(A.isActionableMerchantHref(row.offer.href),'No placeholder/unsafe product links');
  assert.equal(row.offer.merchantId,row.offer.raw.merchant);
}
assert.equal(window.dataLayer.filter(e=>e.event==='affiliate_click').length,0,
  'Rendering buyer links never fabricates a merchant click');
const panel=rows.find(row=>row.label==='Solární panely');
A.trackOffer(panel.product,panel.offer.raw,panel.placement,panel.quantity);
const clicks=window.dataLayer.filter(e=>e.event==='affiliate_click');
assert.equal(clicks.length,1);
assert.equal(clicks[0].quantity,4);
assert.equal(clicks[0].placement,'builder-primary-panel');

const offers=A.offers;
A.offers=()=>[{price_czk:1,availability:'in_stock',href:'https://www.battery.cz/panel',
  merchantId:'battery-cz',raw:{source_url:'https://www.battery.cz/panel',merchant:'battery-cz'}}];
assert(builder.primaryPurchaseRows.every(row=>row.offer===null),
  'Never label a different merchant quote with the itemized historical price');
A.offers=()=>[{price_czk:rows[0].unitPrice,availability:'in_stock',
  href:'https://invalid.example/panel',merchantId:'battery-cz',raw:{source_url:'https://invalid.example/panel',merchant:'battery-cz'}}];
assert(builder.primaryPurchaseRows.every(row=>row.offer===null),
  'Never provide links without a source belonging to the stated seller');
A.offers=offers;

const restored=make();
assert.equal(restored.primaryPurchaseRows.filter(row=>row.offer).length,4,
  'A failed link guard must not break later legitimate recommendations');
const old=window.SolarExpertAffiliate;
window.SolarExpertAffiliate=null;
assert.equal(restored.primaryPurchaseRows.every(row=>row.offer===null),true,
  'Missing affiliate adapter must fail closed without hiding priced line items');
window.SolarExpertAffiliate=old;

const html=fs.readFileSync(path.join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');
assert(html.includes('x-for="item in primaryPurchaseRows"'),
  'First buyer bill must show direct merchant links without scrolling through tier cards');
assert(html.includes('<template x-if="item.offer">'));
assert(html.includes('item.offer.monetized ? \'sponsored nofollow noopener\' : \'nofollow noopener\''));
assert(html.includes('SolarExpertAffiliate.trackOffer(item.product,item.offer.raw,item.placement,item.quantity)'));
assert(html.includes('SolarExpertAffiliate.trackBundleDealOffer(item.deal,item.offer.raw,item.placement)'));
assert(css.includes('.se-shopping-link:focus-visible'),
  'Buyer links must have visible keyboard focus');
console.log('PASS: first-view source-verified exact-price purchase CTAs, 4-panel intent and fail-closed guards');
