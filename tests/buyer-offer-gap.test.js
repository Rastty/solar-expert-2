'use strict';
/** Buyer-initiated product-intelligence gaps, never phantom conversions. */
const assert=require('node:assert/strict');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-18T12:00:00Z')});
const catalog=require('../assets/data/product-seed.json');
global.window={
  location:{origin:'https://solar-expert.cz',search:''},
  SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');
require('../assets/js/builder.js');

const gaps=()=>window.dataLayer.filter(item=>item.event==='buyer_offer_gap');
const affiliate={
  offers:()=>[{href:'https://battery.cz/priklad/'}],
  isActionableMerchantHref:href=>href==='https://battery.cz/priklad/',
  bundleDealOffers:()=>[]
};
const battery=window.solarExpertBatterySelector();
battery.catalog=catalog.products;
battery.run(false);
assert.equal(gaps().length,0,'Initial automatic result must not count as buyer demand');
battery.run(true);
assert.equal(gaps().length,0,'Missing offer adapter is unknown, not missing merchant');
window.SolarExpertAffiliate=affiliate;
battery.run(true);
assert.equal(gaps().length,0,'Compatible shoppable result is not a gap');
affiliate.offers=()=>[];
battery.run(true);
assert.deepEqual(gaps().map(({tool,status})=>[tool,status]),
  [['battery','no_actionable_shortlist_offer']],
  'Buyer sees compatible batteries, but none of their shown shortlist links work');
battery.run(true);
assert.equal(gaps().length,1,'Repeated re-render cannot duplicate the same gap');
battery.dailyKwh=100;
battery.inverterW=50000;
battery.run(true);
assert.equal(battery.matches.length,0);
assert.equal(gaps()[1].status,'no_compatible_products');
assert.equal(gaps()[1].matchCount,0,'Report shortlist size, not a fabricated sale');

const mppt=window.solarExpertMpptSelector();
mppt.catalog=catalog.products;
mppt.panelUnitWp=10000;
mppt.seriesCount=1;
mppt.parallelCount=1;
mppt.run(true);
assert.equal(mppt.matches.length,0);
assert.equal(gaps()[2].tool,'mppt');
assert.equal(gaps()[2].status,'no_compatible_products');

const inverter=window.solarExpertInverterSelector();
inverter.catalog=catalog.products;
inverter.continuousW=50000;
inverter.peakW=60000;
inverter.run(true);
assert.equal(inverter.matches.length,0);
assert.equal(gaps()[3].tool,'inverter');

const builder=window.solarExpertBuilder();
builder.catalog=catalog.products;
builder.bundleDeals=catalog.bundle_deals;
builder.catalogReady=true;
builder.quickPreview();
assert.equal(gaps().length,4,'Sample preview never counts as a missing buyer offer');
builder.preset('chata');
builder.toggle('pump');
builder.calc();
assert.equal(builder.completeBundles.length,0,'Fixture genuinely has no complete high-demand bundle');
assert.equal(gaps()[4].status,'no_complete_bundle');
assert.equal(gaps()[4].tool,'builder');
builder.calc();
assert.equal(gaps().length,5,'Repeated builder calculations share one reason per page');
builder.preset('chata');
builder.calc();
assert(builder.completeBundles.length>0,'Fixture has a technically complete ordinary system');
assert.equal(gaps()[5].status,'no_complete_shopping_list',
  'A complete model without every source-backed seller link cannot be claimed fully buyable');

assert(gaps().every(({tool,status,matchCount,...rest})=>
  ['builder','battery','mppt','inverter'].includes(tool) &&
  /^[a-z_]+$/.test(status) && Number.isSafeInteger(matchCount) &&
  rest.event==='buyer_offer_gap' && Object.keys(rest).length===1),
  'Only privacy-safe bounded gap dimensions; never consumption, location, money, or visitor IDs');
console.log('PASS: buyer-action-only offer gaps, missing-adapter safety, dedup and real shortlist evidence');
