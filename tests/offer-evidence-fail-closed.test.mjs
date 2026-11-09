import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
globalThis.window={
  location:{origin:'https://solar-expert.cz'},
  SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}},
};
require('../assets/js/product-matcher.js');
require('../assets/js/affiliate-adapter.js');
require('../assets/js/bundle-composer.js');

const M=window.SolarExpertProductMatcher;
const A=window.SolarExpertAffiliate;
const B=window.SolarExpertBundleComposer;
const todayUtc=()=>new Date().toISOString().slice(0,10);
function offer(date,price=2499){
  return {
    merchant:'battery-cz',price_czk:price,availability:'in_stock',
    source_url:'https://www.battery.cz/real-model/',verified_at:date,
  };
}
function product(date,price=2499){
  const o=offer(date,price);
  return {
    id:'test-victron-model',type:'mppt',merchant:'battery-cz',tier:'best',
    availability:'in_stock',price_czk:price,verified_at:date,offers:[o],
  };
}
test('only real calendar dates not in the future can ever be fresh evidence',()=>{
  assert.equal(M.verificationState('2026-11-07','2026-11-07T12:00:00Z'),'fresh');
  assert.equal(M.verificationState('2026-11-07','2026-12-08T00:00:00Z'),'stale');
  assert.equal(M.verificationState('2026-11-07','2026-11-06T23:59:59Z'),'unknown');
  for(const invalid of [null,undefined,'','not a date','2026-02-31','2026-11-32','2026-13-01','2026-11-07T00:00:00Z']){
    assert.equal(M.verificationState(invalid,'2026-11-07T12:00:00Z'),'unknown',
      'Invalid or unverified date must not become fresh: '+String(invalid));
  }
  assert.equal(M.verificationState('9999-01-01','2026-11-07T12:00:00Z'),'unknown',
    'Far-future evidence is not a verified current quote');
});

test('unknown and future-dated offers cannot drive price ranking or a public stock claim',()=>{
  for(const invalid of [null,'2026-02-31','2999-01-01']){
    const p=product(invalid,1);
    assert.equal(M.effectivePrice(p),Number.MAX_SAFE_INTEGER,'Unknown timestamp cannot be cheapest price');
    assert.equal(M.availabilityRank(p),1,'Unproven stock may remain only as a downgraded technical candidate');
    const o=A.resolveOffer(p,p.offers[0]);
    assert.equal(o.price_czk,null,'Do not publish unverified price');
    assert.equal(o.availability,'unverified','Do not claim Skladem based on unverified stock');
    assert.equal(o.price_freshness,'unknown');
    assert.equal(o.href,p.offers[0].source_url,'Buyer can still check retailer directly');
    assert.equal(o.monetized,false,'Do not invent a tracking base');
  }
  const fallback={id:'without-offers',type:'battery',price_czk:10,availability:'in_stock'};
  assert.equal(M.effectivePrice(fallback),Number.MAX_SAFE_INTEGER,
    'Legacy offer lacking verifiedAt may not supply a best-price comparison');
 assert.equal(M.availabilityRank(fallback),1,
    'Legacy stock without a source date may only be a downgraded technical candidate');
});
test('expired prices/stock are not current while real fresh prices still rank normally',()=>{
  const stale=offer('2000-01-01',100);
  const fresh=offer(todayUtc(),2599);
  const p={id:'mixed-validity',type:'mppt',merchant:'battery-cz',
    offers:[stale,{...fresh,merchant:'solar-import-cz',source_url:'https://www.solar-import.cz/current/'}]};
  assert.equal(M.effectivePrice(p),2599,'Stale bargain must not win current best price');
  assert.equal(M.availabilityRank(p),2,'Current second-store stock can still earn verified rank');
  const oldResolved=A.resolveOffer(p,stale);
  assert.equal(oldResolved.price_czk,null);
  assert.equal(oldResolved.availability,'unverified');
  assert.equal(oldResolved.price_freshness,'stale');
  const freshResolved=A.resolveOffer(p,p.offers[1]);
  assert.equal(freshResolved.price_czk,2599);
  assert.equal(freshResolved.availability,'in_stock');
  assert.equal(freshResolved.price_freshness,'fresh');
 assert.equal(A.resolve(p).merchantId,'solar-import-cz',
   'A cheaper stale seller must not be first recommended merchant');
 assert.equal(A.offers(p)[0].price_czk,2599,
   'First buyer link must have a verified-current price if one exists');
});
test('a different merchant or enclosing product cannot lend verification dates',()=>{
 const freshParent=product(todayUtc(),1200);
 freshParent.offers[0].verified_at=null;
 assert.equal(M.effectivePrice(freshParent),Number.MAX_SAFE_INTEGER);
 const productQuote=A.resolveOffer(freshParent,freshParent.offers[0]);
 assert.equal(productQuote.verified_at,null);
 assert.equal(productQuote.price_czk,null);
 assert.equal(productQuote.availability,'unverified');
 const deal={id:'deal-with-unaudited-seller',verified_at:todayUtc(),
   price_czk:10000,availability:'in_stock',savings_czk:500,bankSavingsCzk:500};
 const missingDate=offer(null,10000);
 const bundleQuote=A.resolveBundleDealOffer(deal,missingDate);
 assert.equal(bundleQuote.verified_at,null);
 assert.equal(bundleQuote.price_czk,null);
 assert.equal(bundleQuote.availability,'unverified');
 assert.equal(bundleQuote.savings_czk,null,'Undated merchant offer cannot claim set savings');
 assert.equal(bundleQuote.bank_savings_czk,null);
});
test('bundle offers use identical fail-closed evidence rules without losing merchant links',()=>{
  const item={id:'deal',merchant:'battery-cz',availability:'in_stock',price_czk:9999};
  for(const date of [null,'2000-01-01','2026-02-31','2999-01-01']){
    const o=offer(date,9999);
    const resolved=A.resolveBundleDealOffer(item,o);
    assert.equal(resolved.price_czk,null);
    assert.equal(resolved.availability,'unverified');
    assert.equal(resolved.href,o.source_url);
  }
  const o=offer(todayUtc(),9999);
  const fresh=A.resolveBundleDealOffer(item,o);
  assert.equal(fresh.price_czk,9999);
  assert.equal(fresh.availability,'in_stock');
});

test('bundle discount is not permitted by a parent timestamp when merchant offer is unverified',()=>{
 const components=['battery-example','inverter-example'];
 const root={
   id:'undated-discount',components,merchant:'battery-cz',
   price_czk:10000,availability:'in_stock',verified_at:todayUtc(),
   offers:[{merchant:'battery-cz',price_czk:10000,availability:'in_stock',verified_at:null}],
 };
 assert.equal(B.findBundleDeal([root],components,20000),null,'Fresh deal parent is not an offer-level verification');
 for(const badDate of ['2000-01-01','2999-01-01','2026-02-31']){
   const deal={...root,offers:[{...root.offers[0],verified_at:badDate}]};
   assert.equal(B.findBundleDeal([deal],components,20000),null,'Invalid dated deal must never create a false discount');
 }
 const real={...root,offers:[{...root.offers[0],verified_at:todayUtc()}]};
 const selected=B.findBundleDeal([real],components,20000);
 assert.ok(selected);
 assert.equal(selected.price_czk,10000);
 assert.equal(selected.savings_czk,10000);
});

test('independently fresh bundle retailer outranks an older apparently cheaper merchant',()=>{
 const deal={
   id:'price-order',merchant:'battery-cz',price_czk:1000,availability:'in_stock',
   offers:[
     {merchant:'battery-cz',price_czk:1000,availability:'in_stock',
       verified_at:'2000-01-01',source_url:'https://www.battery.cz/stale/'},
     {merchant:'solar-import-cz',price_czk:2500,availability:'in_stock',
       verified_at:todayUtc(),source_url:'https://www.solar-import.cz/current/'},
   ]
 };
 const quotes=A.bundleDealOffers(deal);
 assert.equal(quotes.length,2);
 assert.equal(quotes[0].merchantId,'solar-import-cz');
 assert.equal(quotes[0].price_czk,2500);
 assert.equal(quotes[0].availability,'in_stock');
 assert.equal(quotes[1].merchantId,'battery-cz');
 assert.equal(quotes[1].price_czk,null);
 assert.equal(quotes[1].availability,'unverified');
});


test('bundle savings use the selected individual seller price, not cheapest-retailer saving copied to all',()=>{
  const today=todayUtc();
  const deal={
    id:'independent-merchants',price_czk:10000,savings_czk:5000,bankSavingsCzk:5000,
    effective_offer:{merchant:'battery-cz',price_czk:10000,availability:'in_stock',verified_at:today},
    offers:[
      {merchant:'battery-cz',price_czk:10000,availability:'in_stock',verified_at:today,source_url:'https://www.battery.cz/deal/'},
      {merchant:'solar-import-cz',price_czk:14000,availability:'in_stock',verified_at:today,source_url:'https://www.solar-import.cz/deal/'}
    ]
  };
  const quotes=A.bundleDealOffers(deal);
  assert.deepEqual(quotes.map(x=>x.savings_czk),[5000,1000]);
  assert.deepEqual(quotes.map(x=>x.bank_savings_czk),[5000,1000]);
  const dear={...deal.offers[1],price_czk:16000};
  assert.equal(A.resolveBundleDealOffer(deal,dear).savings_czk,null,
    'A price above the comparable 15000 CZK separate-parts baseline is not a saving');
  assert.equal(A.resolveBundleDealOffer(deal,dear).bank_savings_czk,null);
  for(const date of [null,'2000-01-01','2999-01-01']){
    const stale={...deal.offers[1],verified_at:date};
    const r=A.resolveBundleDealOffer(deal,stale);
    assert.equal(r.savings_czk,null);
    assert.equal(r.bank_savings_czk,null);
    assert.equal(r.price_czk,null);
  }
  const incomplete={...deal,effective_offer:null};
  assert.equal(A.resolveBundleDealOffer(incomplete,deal.offers[0]).savings_czk,null,
    'Without a verified composer-selected baseline no deal saving is demonstrated');
  window.dataLayer=[];
  A.trackBundleDealOffer(deal,deal.offers[1],'builder-best');
  assert.equal(window.dataLayer.at(-1).bankSavingsCzk,1000,
    'Conversion analytics must attribute the clicked retailer actual 1000 CZK saving');
  assert.equal(window.dataLayer.at(-1).savingsCzk,1000);
  const {readFileSync}=require('node:fs');
  const ui=readFileSync(new URL('../template-parts/solar-builder.php',import.meta.url),'utf8');
  assert(ui.includes('o.bank_savings_czk && o.price_czk'),
    'Seller-specific badge is shown only when dated evidence supports it');
  assert(ui.includes('Nejnižší ověřená cena setu z uvedených obchodů'),
    'Banner must describe the least expensive listed verified offer only');
});


test('explicit merchant offers cannot borrow a parent quote, store URL or stock evidence',()=>{
 const today=todayUtc();
 const parent=product(today,8650);
 const primary=parent.offers[0];
 assert.equal(M.effectivePrice(parent),8650,'Existing valid merchant quote is preserved');
 parent.offers=[{...primary,price_czk:null,verified_at:today}];
 assert.equal(M.effectivePrice(parent),Number.MAX_SAFE_INTEGER,
   'A parent price+timestamp must not resurrect a missing explicit offer price');
 parent.offers=[{...primary,price_czk:0,verified_at:today}];
 assert.equal(M.effectivePrice(parent),Number.MAX_SAFE_INTEGER,
   'Explicit zero merchant quotes cannot inherit product price');
 const missingStock={...primary,availability:null};
 assert.equal(A.resolveOffer(parent,missingStock).availability,'unverified',
   'Merchant stock is not inferred from product availability');
 const other={merchant:'solar-import-cz',verified_at:today,price_czk:8990,
   availability:null,source_url:null};
 const resolved=A.resolveOffer(parent,other);
 assert.equal(resolved.availability,'unverified',
   'Another retailer must not inherit parent merchant in-stock claim');
 assert.equal(resolved.href,'#',
   'A secondary retailer must never borrow a primary shop destination');
 assert.equal(resolved.monetized,false);
 const selected={...other,source_url:'https://www.solar-import.cz/exact-model/',availability:'in_stock'};
 assert.equal(A.resolveOffer(parent,selected).href,selected.source_url,
   'The same alternate seller remains fully reachable with its own real URL');
 assert.equal(A.resolveOffer(parent,selected).availability,'in_stock');
 const deal={id:'deal',merchant:'battery-cz',source_url:'https://www.battery.cz/set/',
    availability:'in_stock',verified_at:today,price_czk:10000,
    savings_czk:1000,bankSavingsCzk:1000,
    effective_offer:{merchant:'battery-cz',availability:'in_stock',price_czk:10000,verified_at:today}};
 const otherDeal={merchant:'solar-import-cz',verified_at:today,price_czk:10500,
    source_url:null,availability:null};
 const result=A.resolveBundleDealOffer(deal,otherDeal);
 assert.equal(result.href,'#','Alternate set shop must not inherit another merchant URL');
 assert.equal(result.monetized,false);
 assert.equal(result.availability,'unverified','No seller stock inference for multi-store set');
 assert.equal(result.savings_czk,null,'Missing seller availability cannot assert a bundle saving');
});
