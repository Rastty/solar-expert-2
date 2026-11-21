import test from 'node:test';
import assert from 'node:assert/strict';
import {previewOverlay,DEV_PIN} from '../tools/catalog-price-overlay-preflight.mjs';

const quote=(id,merchant,date='2026-10-05')=>({
  merchant,source_url:'https://shop.example/'+id+'/'+merchant,
  price_czk:100,availability:'in_stock',verified_at:date
});
function fixture(){
  const live={schemaVersion:'1.0',products:[],bundle_deals:[]};
  for(let i=0;i<24;i++){
    const id='p'+i;
    const merchant=i>=21?'vselektro-eu':'battery-cz';
    live.products.push({id,sku:'SKU-'+i,merchant,voltage_v:12+i,
      mppt:{max_voc:100+i},
      price_czk:100,verified_at:'2026-10-05',
      offers:[quote(id,merchant),quote(id,'solar-import-cz')]});
  }
  for(let i=0;i<4;i++){
    live.bundle_deals.push({id:'deal-'+i,merchant:'battery-cz',
      price_czk:100,availability:'in_stock',
      offers:[quote('deal-'+i,'battery-cz')]});
  }
  const dev=structuredClone(live);
  for(const p of dev.products) {
    for(const o of p.offers){o.price_czk=110;o.availability='on_request';o.verified_at='2026-11-07';}
  }
  for(const d of dev.bundle_deals)
    for(const o of d.offers){o.price_czk=110;o.availability='on_request';o.verified_at='2026-11-07';}
  return {live,dev};
}
const audit=(live,dev)=>previewOverlay(live,dev,{now:new Date('2026-11-21T12:00:00Z')});

test('52 matched public quotes, only 3 unresolved seller records excluded without fabricated date',()=>{
  const {live,dev}=fixture();
  // Three VSelektro records in this synthetic cohort, all 24 SKUs are stable.
  const res=audit(live,dev);
  assert.equal(res.summary.counts.all_offer_rows,52);
  assert.equal(res.summary.counts.exact_seller_matches,52);
  assert.equal(res.summary.counts.skipped_unresolved_sku,3);
  assert.equal(res.summary.counts.eligible,49);
  assert.equal(res.catalog.products[0].offers[0].verified_at,'2026-11-07');
  assert.equal(res.catalog.products[21].offers[0].verified_at,'2026-10-05');
  assert.equal(res.catalog.products[21].offers[1].verified_at,'2026-11-07');
  assert.equal(res.catalog.products[0].offers[0].availability,'on_request');
  assert.equal(res.catalog.products[0].voltage_v,12);
  assert.equal(res.catalog.products[0].mppt.max_voc,100);
  assert.equal(live.products[0].offers[0].price_czk,100);
  assert.equal(res.summary.release_authorized,false);
  assert.equal(res.summary.wordpress_writes,0);
  assert.equal(res.summary.affiliate_clicks,0);
  assert.equal(res.summary.source_revision,DEV_PIN);
});

test('missing SKU identity and row count cannot silently pass',()=>{
  const {live,dev}=fixture();
  dev.products[0].sku='OTHER';
  assert.throws(()=>audit(live,dev),/manufacturer\/SKU mismatch/);
  dev.products[0].sku=live.products[0].sku;
  dev.products.pop();
  assert.throws(()=>audit(live,dev),/24-product cohort/);
});

test('offer source change never inherits a different merchant quote',()=>{
  const {live,dev}=fixture();
  dev.products[0].offers[0].source_url='https://shop.example/a-different-sku';
  const r=audit(live,dev);
  assert.equal(r.summary.counts.skipped_source_changed,1);
  assert.equal(r.summary.counts.eligible,48);
  assert.equal(r.catalog.products[0].offers[0].verified_at,'2026-10-05');
  assert.equal(r.catalog.products[0].offers[1].verified_at,'2026-11-07');
});

test('expired or future data never passes as fresh and bad quote is quarantined',()=>{
  const {live,dev}=fixture();
  dev.products[0].offers[0].verified_at='2026-10-05';
  dev.products[0].offers[1].verified_at='2026-11-25';
  dev.products[1].offers[0].price_czk=-100;
  const r=audit(live,dev);
  assert.equal(r.summary.counts.skipped_date_expired,2);
  assert.equal(r.summary.counts.skipped_bad_quote,1);
  assert.equal(r.summary.counts.eligible,46);
});

test('unsafe seller links, duplicate offer sources and extra bundles fail closed',()=>{
  const {live,dev}=fixture();
  dev.products[0].offers[0].source_url='javascript:alert(1)';
  assert.throws(()=>audit(live,dev),/Unsafe seller source URL/);
  dev.products[0].offers[0].source_url=dev.products[0].offers[1].source_url;
  assert.throws(()=>audit(live,dev),/Duplicated seller source identity/);
  dev.products[0].offers[0].source_url=live.products[0].offers[0].source_url;
  dev.bundle_deals.pop();
  assert.throws(()=>audit(live,dev),/Bundle identity cohort drift/);
});

test('one discontinued/unpriced item with no date is excluded from 52 priced live quotes',()=>{
  const {live,dev}=fixture();
  const inactive=quote('retired','other-shop','');
  inactive.availability='discontinued';
  live.products[0].offers.push(inactive);
  dev.products[0].offers.push(structuredClone(inactive));
  const result=audit(live,dev);
  assert.equal(result.summary.counts.raw_offer_rows,53);
  assert.equal(result.summary.counts.ignored_discontinued_or_unpriced,1);
  assert.equal(result.summary.counts.all_offer_rows,52);
  assert.equal(result.summary.counts.eligible,49);
  assert.equal(result.catalog.products[0].offers[2].availability,'discontinued');
  assert.equal(result.catalog.products[0].offers[2].verified_at,'');
});
