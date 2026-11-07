'use strict';
/** Fail-closed purchase gate for Growatt integrated MPPT, separate from working
 * 24V standalone Victron offers. All retailer and WordPress interactions mocked.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-07T12:00:00Z')});
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const a=JSON.parse(read('data/product-seed.json'));
const z=JSON.parse(read('assets/data/product-seed.json'));
assert.deepEqual(a,z,'Keep exact source/runtime JSON mirrors');
global.window={location:{search:''},dataLayer:[],SolarExpertConfig:{affiliateMap:{products:{}},affiliateBases:{}}};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
const B=window.SolarExpertBundleComposer,Builder=window.solarExpertBuilder;
const p=id=>a.products.find(x=>x.id===id);
const grow3500=p('inverter-growatt-48-3500');
const grow6000=p('inverter-growatt-48-6000');
const panel=p('panel-victron-190');
assert(panel.isc_a===9.17);
assert(grow3500&&grow6000);
for(const [inv,n,aOperating,aTrackerWp] of [[grow3500,1,22,4500],[grow6000,2,16,4000]]){
 const pv=inv.integrated_mppt;
 assert.equal(pv.pv_tracker_count,n);
 assert.equal(pv.pv_strings_per_tracker,1,'Exactly one input string per physical tracker');
 assert.equal(pv.pv_input_operating_a_per_tracker,aOperating);
 assert.equal(pv.pv_w_max_per_tracker,aTrackerWp);
 assert.equal(pv.pv_isc_absolute_status,'unverified',
   'Published operating input current must NOT become assumed short-circuit ceiling');
 assert.equal(pv.pv_isc_absolute_limit_a,undefined,'Do not invent a certified Isc value');
 assert(pv.pv_operating_current_source_url.startsWith('https://'));
 assert.equal(pv.pv_operating_current_checked_on,'2026-11-07');
 const limits=B.controllerLimits(inv,{voltage:48},true);
 assert.equal(limits.trackerCount,n);
 assert.equal(limits.operatingA,aOperating);
 assert.equal(limits.pvIscVerified,false);
 assert.equal(limits.maxIsc,null);
}
const bad={...grow3500,integrated_mppt:{...grow3500.integrated_mppt}};
delete bad.integrated_mppt.pv_input_operating_a_per_tracker;
assert.equal(B.controllerLimits(bad,{voltage:48},true),null,
  'Unknown physical PV input must not count as verified electrical screening');

const p3500=B.findPanelPlan([panel],{voltage:48,panelWp:1000},grow3500,true,'best');
assert(p3500&&p3500.topology==='6S1P','Single tracker needs sufficiently high Vmp and one PV string');
assert.deepEqual(p3500.trackerStringCounts,[1]);
assert.equal(p3500.pvIscVerified,false,'Safe operating current alone cannot verify absolute short-circuit ceiling');
assert(p3500.iscPerTracker>0&&p3500.iscPerTracker<22);

const reject3500=B.findPanelPlan([panel],{voltage:48,panelWp:2500},grow3500,true,'best');
assert.equal(reject3500,null,
  'One-tracker Growatt must NOT accept extra 2P/3P strings merely because watts fit 4500W');

const p6000=B.findPanelPlan([panel],{voltage:48,panelWp:2500},grow6000,true,'best');
assert(p6000&&p6000.parallel===2,'Dual MPPT can use one separate string per tracker');
assert.deepEqual(p6000.trackerStringCounts,[1,1],
  'Input string current must be calculated separately, not as combined 32A input');
assert(p6000.series>=6,'PV Vmp must reach high-voltage MPPT window');
assert.equal(p6000.iscPerTracker,9.17);
assert(p6000.series*panel.rated_wp<=4000,'Each independent tracker must respect 4000Wp maximum');
assert.equal(p6000.pvIscVerified,false);

assert.equal(B.findPanelPlan([panel],{voltage:48,panelWp:4500},grow6000,true,'best'),null,
  'Two single-string trackers cannot silently accommodate a third parallel string');
const tooMuchIsc={...panel,id:'synthetic-18A',isc_a:18};
assert.equal(B.findPanelPlan([tooMuchIsc],{voltage:48,panelWp:2500},grow6000,true,'best'),null,
  '18A per tracker must not pass a 16A OPERATING PV input screen');
const missingIsc={...panel};delete missingIsc.isc_a;
assert.equal(B.findPanelPlan([missingIsc],{voltage:48,panelWp:1000},grow3500,true,'best'),null,
  'No PV input compatibility with unknown panel Isc');

const q=Builder();
q.catalog=a.products;
q.bundleDeals=a.bundle_deals;
q.preset('backup');
q.voltage=undefined;
q.result={voltage:48,batteryKwh:2,inverterW:3000,peak:5000,panelWp:1000,mpptA:30};
q.bundles=B.compose(a.products,q.result,a.bundle_deals);
const candidate=q.bundles.find(x=>x.integratedMppt&&x.inverter?.id==='inverter-growatt-48-3500');
assert(candidate&&candidate.status==='pv_isc_limit_unverified');
assert.equal(candidate.complete,true,'Components may be technically sized for internal diagnostic bookkeeping');
assert.equal(candidate.pvIscVerified,false);
assert.equal(q.completeBundles.some(x=>x.inverter?.id===candidate.inverter.id),false,
  'Unverified integrated Growatt must not appear in buyer offer cards');
assert.equal(q.incompleteBundles.some(x=>x.inverter?.id===candidate.inverter.id),true,
  'Visible explanation must recognize this as an incomplete review');
assert.equal(q.purchaseBreakdownFor(candidate),null,
  'No complete-priced shopping list or affiliate component bundle without verified PV Isc');

const markup=read('template-parts/solar-builder.php');
assert(markup.includes('data-se-integrated-pv-isc-blocked="true"'));
assert(markup.includes('x-for="b in completeBundles"'),'Buyer cards must use only approved review evidence');
assert(markup.includes('Nákup hybridní sestavy zatím nedoporučujeme'));
assert(markup.includes('nezobrazujeme nákupní odkazy'));
assert(!q.completeBundles.some(x=>x.integratedMppt&&x.pvIscVerified!==true),
  'No unverified hybrid in primary comparison or merchant links');
console.log('PASS: Growatt 1-vs-2 MPPT tracker rules, operating-vs-short-circuit evidence, fail-closed buyer checkout');
