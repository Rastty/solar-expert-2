import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCatalogHealth,fetchLiveHealth} from '../tools/live-catalog-gap.mjs';

const source={total_offers:52,counts:{fresh:47,expiring_soon:5,stale:0}};
const health={status:'ok',theme_version:'0.12.27',catalog_price_snapshots:52,
  catalog_price_fresh:0,catalog_price_stale:52,catalog_price_verification_unknown:0};
const response=(value,status=200)=>({
  status,redirected:false,headers:new Headers(),
  body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify(value)));controller.close();}})
});

test('flags substantial live freshness lag without claiming a deployment remedy',()=>{
  const report=compareCatalogHealth(source,health,'2026-11-17T18:30:00Z');
  assert.equal(report.status,'live_freshness_lag');
  assert.equal(report.source_date_fresh,52);
  assert.equal(report.live_price_fresh,0);
  assert.equal(report.fresh_count_gap,52);
  assert.equal(report.release_authorized,false);
  assert.equal(report.checked_at_utc,'2026-11-17T18:30:00.000Z');
});

test('does not confuse a different catalog population with precise lost offers',()=>{
  const report=compareCatalogHealth(source,{...health,catalog_price_snapshots:53,catalog_price_stale:53});
  assert.equal(report.status,'catalog_population_mismatch');
  assert.equal(report.fresh_count_gap,52);
  assert.equal(report.release_authorized,false);
});

test('incomplete, inconsistent or non-ok live health cannot create a healthy claim',()=>{
  for(const bad of [null,{}, {...health,status:'not-ok'},
    {...health,catalog_price_fresh:-1},
    {...health,catalog_price_fresh:50},
    {...health,catalog_price_verification_unknown:'0'}]){
    assert.equal(compareCatalogHealth(source,bad).status,'health_unavailable');
  }
  const same=compareCatalogHealth(source,{...health,catalog_price_fresh:52,catalog_price_stale:0});
  assert.equal(same.status,'no_positive_freshness_gap');
});

test('health probe is one fixed GET, does not follow redirects or make affiliate requests',async()=>{
  const calls=[];
  const data=await fetchLiveHealth(async(url,options)=>{
    calls.push(url);
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'manual');
    assert.equal(options.headers.Authorization,undefined);
    return response(health);
  });
  assert.deepEqual(data,health);
  assert.deepEqual(calls,['https://solar-expert.cz/wp-json/solar-expert/v1/health']);
  await assert.rejects(fetchLiveHealth(async()=>response(health,302)),/not 200/);
});

test('oversized live health fails closed',async()=>{
  const oversize={...response(health),headers:new Headers({'content-length':'900000'})};
  await assert.rejects(fetchLiveHealth(async()=>oversize),/oversize/);
});
