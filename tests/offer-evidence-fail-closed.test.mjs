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

const M=window.SolarExpertProductMatcher;
const A=window.SolarExpertAffiliate;
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
