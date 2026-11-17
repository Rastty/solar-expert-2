import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const context={URL,window:{location:{origin:'https://solar-expert.cz'},dataLayer:[]}};
context.window.SolarExpertProductMatcher={
  hasSellerSource:o=>String(o.source_url||'').startsWith('https://www.battery.cz/'),
  verificationState:date=>date==='2026-11-07'?'fresh':'stale'
};
vm.runInNewContext(read('assets/js/affiliate-adapter.js'),context);
const affiliate=context.window.SolarExpertAffiliate;
const offer={merchant:'battery-cz',source_url:'https://www.battery.cz/solarni-panel-400/',
  price_czk:3500,availability:'in_stock',verified_at:'2026-11-07'};
const product={id:'solar-panel-400',type:'panel',merchant:'battery-cz',offers:[offer]};

test('a real outbound panel click carries bounded requested units, never a sale',()=>{
  context.window.dataLayer.length=0;
  const result=affiliate.trackOffer(product,offer,'builder-panel-best',4);
  assert.equal(result.href,offer.source_url);
  const [event]=context.window.dataLayer;
  assert.equal(event.event,'affiliate_click');
  assert.equal(event.productId,product.id);
  assert.equal(event.quantity,4);
  assert.equal(event.priceCzk,3500);
  assert.equal(Object.hasOwn(event,'commission'),false);
  assert.equal(Object.hasOwn(event,'revenue'),false);
});

test('legacy and malformed quantities default to one, and invalid merchant destinations emit nothing',()=>{
  context.window.dataLayer.length=0;
  for(const quantity of [undefined,0,-1,1.5,21,Infinity,NaN,'malicious']){
    affiliate.trackOffer(product,offer,'battery-selector',quantity);
  }
  assert.deepEqual(Array.from(context.window.dataLayer.map(event=>event.quantity)),Array(8).fill(1));
  const unverified={...offer,source_url:'https://invalid.example/panel/',affiliate_url:'#'};
  affiliate.trackOffer({...product,offers:[unverified]},unverified,'builder-panel-best',6);
  assert.equal(context.window.dataLayer.length,8,'No phantom click for non-actionable merchant destination');
});

test('both battery and multi-panel shopping CTAs send the actual required quantity to analytics',()=>{
  const builder=read('template-parts/solar-builder.php');
  const battery=read('template-parts/battery-selector.php');
  assert(builder.includes("'builder-panel-'+b.tier,b.panel?.count)"));
  assert(builder.includes("'builder-battery-'+b.tier+(b.bundleDeal?'-extra':''),purchaseQuantitiesFor(b).battery)"));
  assert(builder.includes("'builder-single-shop-'+row.label.toLowerCase(),row.quantity)"));
  assert(battery.includes("'battery-selector',r.quantity)"));
  assert(read('assets/js/analytics.js').includes("'matchCount','quantity','page'"));
  const backend=read('inc/core.php');
  assert(backend.includes("$event === 'affiliate_click' && isset($payload['quantity'])"));
  assert(backend.includes("'requested_units_clicks' => $total_requested_units"));
  assert(backend.includes('<th>28 dní: požadované kusy</th>'));
  assert(backend.includes('nikoliv objednávka či potvrzená dostupnost'));
});
