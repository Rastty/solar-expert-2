import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {offerFreshness,reviewCatalogFreshness,freshnessSummaryMarkdown,PRICE_FRESHNESS_DAYS} from '../tools/catalog-freshness.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../data/product-seed.json',import.meta.url),'utf8'));
const runtime=JSON.parse(fs.readFileSync(new URL('../assets/data/product-seed.json',import.meta.url),'utf8'));

test('monitor has exactly the same 30-day ageing as public product matcher',()=>{
  assert.equal(PRICE_FRESHNESS_DAYS,30);
  const oct13='2026-10-13';
  assert.deepEqual(
    {state:offerFreshness(oct13,'2026-11-07T12:00:00Z').state,until:offerFreshness(oct13,'2026-11-07T12:00:00Z').days_until_stale},
    {state:'expiring_soon',until:6});
  assert.equal(offerFreshness(oct13,'2026-11-12T23:59:59Z').state,'expiring_soon');
  assert.equal(offerFreshness(oct13,'2026-11-13T00:00:00Z').state,'stale');
  assert.equal(offerFreshness(oct13,'2026-11-13T00:00:00Z').first_stale_utc,'2026-11-13');
  assert.equal(offerFreshness('2026-11-07','2026-11-07T12:00:00Z').state,'fresh');
  assert.equal(offerFreshness('2026-11-07','2026-12-08T00:00:00Z').state,'stale');
  assert.equal(offerFreshness('2026-11-07','2026-12-07T23:59:59Z').state,'expiring_soon');
});
test('future, missing and malformed merchant dates are unsafe not fresh',()=>{
  assert.equal(offerFreshness('2030-01-01','2026-11-07T00:00:00Z').state,'future_dated');
  for(const d of [null,undefined,'','2026-11-32','not a date','2026-11-07T10:00:00Z']){
    assert.equal(offerFreshness(d,'2026-11-07T00:00:00Z').state,'unknown');
  }
  assert.throws(()=>offerFreshness('2026-11-07','garbage'),/Invalid/);
  assert.throws(()=>offerFreshness('2026-11-07','2026-11-07',-1),/Invalid/);
});
test('full catalog source and public-runtime mirror are equal and status totals consistent',()=>{
  assert.deepEqual(catalog,runtime);
  const result=reviewCatalogFreshness(catalog,'2026-11-07T12:00:00Z');
  assert.equal(result.total_offers,result.by_kind.product+result.by_kind.bundle);
  assert.equal(result.total_offers,Object.values(result.counts).reduce((a,b)=>a+b,0));
  assert.equal(result.by_kind.product,48);
  assert.equal(result.by_kind.bundle,4);
  assert.equal(result.total_offers,52);
  assert.equal(result.counts.expiring_soon,3,'The existing October 13 VSelektro source receipts need imminent recheck');
  assert.ok(result.attention.every(x=>x.state!=='fresh'));
  assert.ok(result.attention.every(x=>x.kind==='bundle'||x.kind==='product'));
  assert.ok(freshnessSummaryMarkdown(result).includes('catalog price evidence watch'));
});
test('monitor handles zero, duplicate or future records without inventing new offers',()=>{
  const sample={
    verifiedAt:'2026-11-07',
    products:[
      {id:'old',offers:[{merchant:'retailer-one',verified_at:'2000-01-01'}]},
      {id:'new',offers:[{merchant:'retailer-two',verified_at:'2026-11-07'}]},
      {id:'unknown',offers:[{merchant:'retailer-three'}]},
      {id:'discontinued',availability:'discontinued'},
      {id:'future',offers:[{merchant:'retailer-four',verified_at:'2030-01-01'}]}
    ],
    bundle_deals:[{id:'deal',offers:[{merchant:'retailer-one',verified_at:'2026-11-02'}]}]
  };
  const report=reviewCatalogFreshness(sample,'2026-11-07T12:00:00Z');
  assert.deepEqual(report.counts,{fresh:2,expiring_soon:0,stale:1,unknown:1,future_dated:1});
  assert.equal(report.by_kind.product,4);
  assert.equal(report.by_kind.bundle,1);
  assert.equal(report.attention.length,3);
  assert.throws(()=>reviewCatalogFreshness({products:[],bundle_deals:[{id:'dupe',offers:[{merchant:'x'},{merchant:'x'}]}]},'2026-11-07'),/Duplicate/);
  assert.throws(()=>reviewCatalogFreshness({products:[]},'2026-11-07'),/Expected/);
});
