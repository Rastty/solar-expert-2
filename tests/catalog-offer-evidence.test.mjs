import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditOfferEvidence,availabilityFromLabel,expectedSources,extractOfferEvidence,
  inspectOfferEvidence,summaryMarkdown} from '../tools/catalog-offer-evidence.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../data/product-seed.json',import.meta.url),'utf8'));
const item={merchant:'battery-cz',source_url:'https://www.battery.cz/real-product/',
  products:['battery-pylontech-us5000'],bundles:[],expected:[{id:'battery-pylontech-us5000',sku:'E8221',
    price_czk:22900,availability:'on_request',verified_at:'2026-11-20'}]};

function productHtml({sku='E8221',price='22900.00',schema='OutOfStock',label='Na dotaz',currency='CZK'}={}) {
  return `<html><title>Pylontech US5000 - Battery.cz</title>
    <meta itemprop="sku" content="${sku}" />
    <span itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <link itemprop="availability" href="https://schema.org/${schema}" />
    <meta itemprop="price" content="${price}" />
    <meta itemprop="priceCurrency" content="${currency}" /></span>
    <span class="availability-label" data-testid="labelAvailability">${label}</span></html>`;
}
const reply=(status,html='',location='')=>({status,
  headers:{get(name){return name==='location'?location:name==='content-type'?'text/html; charset=utf-8':null;}},
  text:async()=>html,body:{cancel:async()=>{}}});

function transport(routes) {
  const calls=[];
  const get=async(url,options)=>{
    calls.push({url,method:options.method,redirect:options.redirect});
    if(!routes.has(url))throw new Error('Fixture URL was not registered: '+url);
    return routes.get(url);
  };
  return {calls,get};
}

test('inventory reconciles the 52 exact seller URLs, including unavailable deals, with SKU and approval',()=>{
  const rows=expectedSources(catalog);
  assert.equal(rows.length,52);
  assert.equal(rows.reduce((n,row)=>n+row.expected.length,0),52);
  assert(rows.some(row=>row.bundles.includes('deal-battery-polo-w-growatt6000')&&
    row.expected[0].availability==='on_request'));
  assert(rows.every(row=>/^https:\/\/www\.(battery\.cz|solar-import\.cz|vselektro\.eu)\//.test(row.source_url)));
  assert(rows.every(row=>row.expected.every(e=>e.sku&&Number.isFinite(e.price_czk)&&e.verified_at)));
});

test('exact public SKU, CZK price and seller-visible stock agree without an affiliate click',async()=>{
  const network=transport(new Map([[item.source_url,reply(200,productHtml())]]));
  const result=await inspectOfferEvidence(item,network.get);
  assert.equal(result.state,'matched');
  assert.equal(result.evidence.price_czk,22900);
  assert.equal(result.evidence.availability,'on_request');
  assert.equal(result.evidence.schema_availability,'OutOfStock');
  assert.equal(network.calls.length,1);
  assert.equal(network.calls[0].method,'GET');
  assert.equal(network.calls[0].redirect,'manual');
});

test('source price drift is flagged for human review, never automatically written into catalog',async()=>{
  const result=await inspectOfferEvidence(item,async()=>reply(200,productHtml({price:'23500.00'})));
  assert.equal(result.state,'drift');
  assert.deepEqual(result.changes,[{id:'battery-pylontech-us5000',field:'price_czk',recorded:22900,observed:23500}]);
  assert.equal(item.expected[0].price_czk,22900);
});

test('visible usually-in-stock remains nuanced even with broad InStock structured data',async()=>{
  const nuanced={...item,expected:[{...item.expected[0],availability:'usually_in_stock'}]};
  const result=await inspectOfferEvidence(nuanced,async()=>reply(200,
    productHtml({schema:'InStock',label:'obvykle skladem, expedice do 7 dnů'})));
  assert.equal(result.state,'matched');
  assert.equal(result.evidence.availability,'usually_in_stock');
  assert.equal(availabilityFromLabel('Skladem'),'in_stock');
  assert.equal(availabilityFromLabel('Skladem u dodavatele'),'usually_in_stock');
  assert.equal(availabilityFromLabel('Skladem – expedice do 7 dnů'),null);
});

test('a previously in-stock offer becoming Na dotaz is explicit availability drift',async()=>{
  const previously={...item,expected:[{...item.expected[0],availability:'in_stock'}]};
  const result=await inspectOfferEvidence(previously,async()=>reply(200,productHtml()));
  assert.equal(result.state,'drift');
  assert.equal(result.changes[0].field,'availability');
  assert.equal(result.changes[0].observed,'on_request');
});

test('SKU mismatch, missing markup, non-CZK price, CAPTCHA and contradictory schema fail closed',async()=>{
  const examples=[
    [productHtml({sku:'DIFFERENT'}),'sku_identity_mismatch'],
    ['<html><title>Security challenge</title>Captcha</html>','sku_identity_unverified'],
    [productHtml({currency:'EUR'}),'price_or_visible_stock_missing'],
    [productHtml({label:'Dodací termín neznámý'}),'price_or_visible_stock_missing'],
    [productHtml({schema:'InStock',label:'Na dotaz'}),'visible_stock_schema_conflict'],
  ];
  for(const [html,expectedReason] of examples){
    const result=await inspectOfferEvidence(item,async()=>reply(200,html));
    assert.equal(result.state,'inconclusive');
    assert.equal(result.reason,expectedReason);
  }
  assert.equal(extractOfferEvidence(productHtml({price:'not-a-number'})).price_czk,null);
});

test('HTTP blocks, errors and non-HTML are unknown, not proof of product stockout',async()=>{
  for(const status of [403,404,429,503]){
    const result=await inspectOfferEvidence(item,async()=>reply(status));
    assert.equal(result.state,'inconclusive');
    assert.equal(result.reason,'http_'+status);
  }
  const error=await inspectOfferEvidence(item,async()=>{throw new Error('temporary network failure');});
  assert.equal(error.reason,'network_error');
});

test('never follow an affiliate or another seller domain via redirect',async()=>{
  for(const destination of ['https://ehub.cz/click.php','https://attacker.test/item',
    'https://www.solar-import.cz/other/']){
    const network=transport(new Map([[item.source_url,reply(302,'',destination)]]));
    const result=await inspectOfferEvidence(item,network.get);
    assert.equal(result.state,'inconclusive');
    assert.equal(result.reason,'redirect_to_unapproved_target');
    assert.equal(network.calls.length,1);
  }
  const moved='https://www.battery.cz/moved/';
  const same=transport(new Map([[item.source_url,reply(301,'',moved)],
    [moved,reply(200,productHtml())]]));
  assert.equal((await inspectOfferEvidence(item,same.get)).state,'matched');
  assert.equal(same.calls.length,2);
});

test('audit preserves matched, drift and inconclusive as distinct, with no fabricated conversion',async()=>{
  const tiny={products:[{id:'one',sku:'E8221',offers:[{merchant:item.merchant,
    source_url:item.source_url,price_czk:22900,availability:'on_request',verified_at:'2026-11-20'}]},
  {id:'two',sku:'E8221',offers:[{merchant:item.merchant,
    source_url:'https://www.battery.cz/drift/',price_czk:22000,availability:'in_stock',verified_at:'2026-11-07'}]}],bundle_deals:[]};
  const network=transport(new Map([[item.source_url,reply(200,productHtml())],
    ['https://www.battery.cz/drift/',reply(200,productHtml())]]));
  const report=await auditOfferEvidence(tiny,network.get,2);
  assert.equal(report.source_count,2);
  assert.deepEqual(report.counts,{matched:1,drift:1,inconclusive:0});
  assert.match(summaryMarkdown(report),/Manual re-verification queue/);
  assert.match(summaryMarkdown(report),/no affiliate redirects/);
  assert(!JSON.stringify(report).includes('commission_czk'));
});
