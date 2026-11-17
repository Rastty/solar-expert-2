import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sandbox={window:{location:{origin:'https://solar-expert.cz'}},URL};
vm.runInNewContext(read('assets/js/affiliate-adapter.js'),sandbox);
const affiliate=sandbox.window.SolarExpertAffiliate;

test('buyer sees merchant-specific total for multiple physically needed units',()=>{
  const verified={merchantId:'battery-cz',availability:'in_stock',price_czk:8650};
  assert.equal(affiliate.quantityQuoteLabel(verified,2),
    '2 ks · orientačně 17 300 Kč celkem (ověřte počet skladem)');
  assert.equal(affiliate.quantityQuoteLabel({...verified,price_czk:2999.90},4),
    '4 ks · orientačně 11 999,6 Kč celkem (ověřte počet skladem)');
  assert.equal(affiliate.quantityQuoteLabel(verified,1),'');
});

test('unverified, unavailable and invalid quantities cannot become quoted checkout totals',()=>{
  const offer={availability:'in_stock',price_czk:3000};
  for(const invalid of [{...offer,availability:'on_request'},{...offer,availability:'unverified'},
    {...offer,price_czk:null},{...offer,price_czk:0},{...offer,price_czk:NaN},
    {...offer,price_czk:Number.MAX_SAFE_INTEGER}]){
    assert.equal(affiliate.quantityQuoteLabel(invalid,3),'3 ks · cenu a sklad ověřte u prodejce');
  }
  for(const bad of [-1,0,1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
    assert.equal(affiliate.quantityQuoteLabel(offer,bad),'');
  }
});

test('buyer quantity quote is on the same tracked merchant CTA for batteries and panels',()=>{
  const builder=read('template-parts/solar-builder.php');
  const battery=read('template-parts/battery-selector.php');
  const builderLinks=[...builder.matchAll(/<a class="se-offer"[\s\S]*?<\/a>/g)].map(x=>x[0]);
  assert(builderLinks.some(link=>link.includes('builder-battery-') &&
    link.includes('quantityQuoteLabel(o,purchaseQuantitiesFor(b).battery)')));
  assert(builderLinks.some(link=>link.includes('builder-panel-') &&
    link.includes('quantityQuoteLabel(o,b.panel?.count)') && link.includes("?' / ks'")));
  assert.match(battery,/<a class="se-offer"[\s\S]*quantityQuoteLabel\(o,r\.quantity\)[\s\S]*<\/a>/);
  assert.match(builder, /'Panely · '\+\(b\.panel\?\.count\|\|1\)\+' ks · kde koupit'/);
  assert(read('style.css').includes('.se-offer-quantity{flex-basis:100%'));
});
