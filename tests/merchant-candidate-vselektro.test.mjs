import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const candidate=read('data/merchant-candidates/vselektro-eu.json');
const registry=read('data/merchant-registry.json');
const catalog=read('data/product-seed.json');
const deployed=read('assets/data/product-seed.json');

test('unapproved independent retailer stays entirely outside published product offers',()=>{
  assert.deepEqual(deployed,catalog,'Seed and deployed catalog must not drift');
  assert.equal(candidate.decision,'research_only_pending_affiliate_approval');
  assert.equal(candidate.affiliate_program.approval_status,'pending_approval');
  assert.equal(candidate.affiliate_program.approved_base_url_configured,false);
  assert.equal(candidate.affiliate_program.deeplink_validation_status,'not_verified');
  const merchant=registry.merchants.find(x=>x.id===candidate.merchant_id);
  assert(merchant && merchant.status==='pending_approval','Must never silently switch registry to approved');
  const liveOffers=[...catalog.products,...(catalog.bundle_deals||[])].flatMap(p=>p.offers||[]);
  assert.equal(liveOffers.filter(o=>o.merchant==='vselektro-eu').length,0,
    'No customer-visible merchant offers before owner verifies approval and tracking');
  assert.equal(liveOffers.filter(o=>new URL(o.source_url).hostname.endsWith('vselektro.eu')).length,0,
    'No unapproved merchant destination in live catalog');
});

test('research contains three exact catalog MPPT identities and safe seller domain URLs',()=>{
  assert.equal(candidate.seller.ico,'09719458');
  assert.notEqual(candidate.seller.ico,candidate.seller.different_from_efteria_ico);
  assert.equal(candidate.product_candidates.length,3);
  assert.equal(new Set(candidate.product_candidates.map(x=>x.catalog_product_id)).size,3);
  const ids=['mppt-victron-100-20','mppt-victron-100-30','mppt-victron-100-50'];
  assert.deepEqual(candidate.product_candidates.map(x=>x.catalog_product_id).sort(),ids.sort());
  for (const sku of candidate.product_candidates){
    const original=catalog.products.find(p=>p.id===sku.catalog_product_id);
    assert(original && original.type==='mppt','Research may only join existing audited MPPT SKU');
    const model=sku.catalog_product_id.match(/(100)-(20|30|50)$/);
    assert(model,'Only same-version manufacturer part number allowed');
    assert.equal(Number(original.max_pv_voc_v),Number(model[1]));
    assert.equal(Number(original.rated_charge_a),Number(model[2]));
    const url=new URL(sku.public_page);
    assert.equal(url.protocol,'https:');
    assert.equal(url.hostname,'www.vselektro.eu');
    assert(!url.search && !url.hash && !url.username && !url.password);
    assert(/^[0-9]{13}$/.test(sku.ean));
    assert(Number(sku.public_displayed_price_czk_at_research)>0);
    assert.equal(sku.current_price_verified,false);
    assert.equal(sku.current_stock_verified,false);
    assert(!Object.hasOwn(sku,'verified_at'),
      'A search-result research date must never become a production price snapshot date');
    assert(!Object.hasOwn(sku,'affiliate_url'),
      'No affiliate secrets or unverified link may enter public research');
  }
});
