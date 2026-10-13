import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const candidate=read('data/merchant-candidates/vselektro-eu.json');
const registry=read('data/merchant-registry.json');
const catalog=read('data/product-seed.json');
const deployed=read('assets/data/product-seed.json');
const allowedIds=['mppt-victron-100-20','mppt-victron-100-30','mppt-victron-100-50'];
const snapshotPrices=[2404,3444,4946];

test('only three evidence-bound approved product offers are in both published catalogs',()=>{
  assert.deepEqual(deployed,catalog,'Seed and public catalog must be byte-equivalent data');
  const merchant=registry.merchants.find(m=>m.id==='vselektro-eu');
  assert.equal(merchant?.status,'approved');
  assert.equal(merchant.independent_legal_operator,'vs-elektro-plus-cz');
  assert.notEqual(candidate.seller.ico,candidate.seller.different_from_efteria_ico);
  assert.equal(candidate.affiliate_program.approved_base_url_configured,true);
  assert.equal(candidate.affiliate_program.approval_status,'owner_supplied_merchant_specific_ehub_base_and_deep_link');
  assert.match(candidate.affiliate_program.deeplink_validation_status,/live_redirect_unverified/);
  assert.equal(candidate.product_candidates.length,3);
  const live=[...catalog.products,...(catalog.bundle_deals||[])].flatMap(p=>(p.offers||[]).filter(o=>o.merchant==='vselektro-eu').map(o=>({id:p.id,type:p.type,offer:o})));
  assert.equal(live.length,3,'No unvetted additional offers or bundle set links');
  assert.deepEqual(live.map(o=>o.id).sort(),allowedIds.slice().sort());
  live.forEach(row=>{
    assert.equal(row.type,'mppt','No cross-category merchant inflation');
    const evidence=candidate.product_candidates.find(p=>p.catalog_product_id===row.id);
    assert(evidence,'No unresearched merchant SKU');
    assert.equal(row.offer.source_url,evidence.public_page);
    assert.equal(row.offer.price_czk,snapshotPrices[allowedIds.indexOf(row.id)]);
    assert.equal(row.offer.verified_at,'2026-10-13');
    assert.equal(row.offer.availability,'in_stock');
    assert.equal(evidence.seller_page_observed_on,row.offer.verified_at);
    assert.equal(evidence.current_price_verified,true);
    assert.equal(evidence.current_stock_verified,true);
    const url=new URL(row.offer.source_url);
    assert.equal(url.protocol,'https:');
    assert.equal(url.hostname,'www.vselektro.eu');
    assert(!url.search && !url.hash && !url.username && !url.password);
    assert(!Object.hasOwn(row.offer,'affiliate_url'),'Never commit merchant affiliate tracking URL');
    assert(/^[0-9]{13}$/.test(evidence.ean));
    const model=row.id.match(/(100)-(20|30|50)$/);
    const product=catalog.products.find(p=>p.id===row.id);
    assert.equal(Number(product.max_pv_voc_v),Number(model[1]));
    assert.equal(Number(product.rated_charge_a),Number(model[2]));
    assert(product.battery_voltages?.length);
    assert(product.offers.filter(o=>o.merchant==='vselektro-eu').length===1);
  });
});

test('affiliate eHUB base never enters the public repository',()=>{
  const paths=['data/product-seed.json','assets/data/product-seed.json',
    'data/merchant-registry.json','data/merchant-candidates/vselektro-eu.json'];
  for(const path of paths){
    const content=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert(!content.includes('system/scripts/click.php'),'The affiliate base remains in the WordPress option only');
    assert(!content.includes('f897865f'),'Do not hardcode advertiser tracking credentials');
    assert(!content.includes('f34c86c8'),'Do not hardcode publisher attribution values');
  }
});
