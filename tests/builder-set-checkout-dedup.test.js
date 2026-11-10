'use strict';
/**
 * Buyer purchase path: a verified battery + inverter set already contains one
 * of each. Standalone merchant CTAs must show only the extra needed units.
 * Synthetic CZK fixtures only; no network, WordPress, or affiliate requests.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T12:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/builder.js');
const builder=window.solarExpertBuilder();
const offer=(price,slug)=>({
  merchant:'battery-cz',verified_at:'2026-11-10',availability:'in_stock',
  price_czk:price,source_url:'https://www.battery.cz/'+slug+'/'
});
const product=(id,name,price)=>({id,name,offers:[offer(price,id)]});
const battery=product('test-battery','synthetic battery',3000);
const inverter=product('test-inverter','synthetic inverter',5000);
const panel=product('test-panel','synthetic panel',1000);
const mppt=product('test-mppt','synthetic mppt',1500);
const make=(batteryQuantity,usesSet)=>{
  const bundleDeal=usesSet
    ?{id:'test-discounted-set',label:'synthetic battery + inverter set',price_czk:7000,
      extraBatteryUnits:batteryQuantity-1}
    :null;
  const totalPrice=(usesSet?7000+3000*(batteryQuantity-1):3000*batteryQuantity+5000)+3500;
  return {complete:true,priceComplete:true,integratedMppt:false,pvIscVerified:true,
    batteryQuantity,battery,inverter,mppt,panel:{product:panel,count:2},bundleDeal,totalPrice};
};
for(const [label,scenario,expected] of [
  ['separate 1 battery',make(1,false),{set:0,battery:1,inverter:1}],
  ['separate 2 batteries',make(2,false),{set:0,battery:2,inverter:1}],
  ['discounted set with 1 battery',make(1,true),{set:1,battery:0,inverter:0}],
  ['discounted set plus 1 extra battery',make(2,true),{set:1,battery:1,inverter:0}],
  ['discounted set plus 2 extra batteries',make(3,true),{set:1,battery:2,inverter:0}]
]){
  assert.deepEqual(builder.purchaseQuantitiesFor(scenario),expected,label);
  const breakdown=builder.purchaseBreakdownFor(scenario);
  assert(breakdown,label+' must retain an honest itemized checkout summary');
  assert.equal(breakdown.total,scenario.totalPrice,label+' must reconcile to original quote');
  const count=key=>breakdown.rows
    .filter(x=>x.label===key).reduce((sum,x)=>sum+x.quantity,0);
  assert.equal(count('Set baterie + měnič'),expected.set,label+' set count');
  assert.equal(count('Baterie')+count('Baterie navíc'),expected.battery,label+' standalone battery count');
  assert.equal(count('Měnič'),expected.inverter,label+' standalone inverter count');
  assert.equal(count('Solární panely'),2,'Panel count remains unchanged');
  assert.equal(count('MPPT regulátor'),1,'Standalone MPPT count remains unchanged');
}
assert.deepEqual(builder.purchaseQuantitiesFor(null),{set:0,battery:0,inverter:0});
assert.deepEqual(builder.purchaseQuantitiesFor({complete:false,batteryQuantity:2}),{set:0,battery:0,inverter:0});
assert.deepEqual(builder.purchaseQuantitiesFor({complete:true,batteryQuantity:-1}),{set:0,battery:0,inverter:0});

const html=fs.readFileSync(path.join(__dirname,'../template-parts/solar-builder.php'),'utf8');
assert(html.includes('class="se-offer-group" x-show="purchaseQuantitiesFor(b).battery>0"'),
  'Standalone battery merchant links must not appear when a set contains the only required battery');
assert(html.includes('class="se-offer-group" x-show="purchaseQuantitiesFor(b).inverter>0"'),
  'Never show separate inverter checkout CTA alongside the selected discounted set');
assert(html.includes("b.bundleDeal ? 'Baterie navíc · '"),
  'Show exact extra battery quantity rather than total bank quantity');
assert(html.includes("'builder-battery-'+b.tier+(b.bundleDeal?'-extra':'')"),
  'Distinguish extra-battery outbound attribution from ordinary standalone battery clicks');
assert(html.includes('data-se-bundle-avoid-duplicates="true"'));
assert(html.includes('x-for="o in SolarExpertAffiliate.bundleDealOffers(b.bundleDeal).slice(0,2)"'),
  'Keep the existing legitimate discounted set merchant link');
assert(html.includes('x-for="o in SolarExpertAffiliate.offers(b.panel?.product).slice(0,2)"'),
  'Preserve independent panel merchant selection');
assert(html.includes('x-for="o in SolarExpertAffiliate.offers(b.mppt).slice(0,3)"'),
  'Preserve independent MPPT merchant selection');
console.log('PASS: set checkout never duplicates battery or inverter; extra-quantity CTA and attribution preserved');
