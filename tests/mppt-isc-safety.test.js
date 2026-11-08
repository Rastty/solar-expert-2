'use strict';
/**
 * Exact-source PV Isc verification prevents unsafe MPPT suggestions.
 * Offline and deterministic: no WordPress, retailer calls or affiliate clicks.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-07T12:00:00Z')});
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const seed=JSON.parse(read('data/product-seed.json'));
const runtime=JSON.parse(read('assets/data/product-seed.json'));
assert.deepEqual(seed,runtime,'Source and published catalog mirrors must remain equal');
const catalog=seed.products;
global.window={
  location:{search:'?scenario=mppt400&panelWp=999999&panelIsc=0.01&parallelCount=0&merchant=evil'},
  SolarExpertConfig:{catalogUrl:'/offline/catalog.json'},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');
global.fetch=async()=>({ok:true,json:async()=>({products:catalog})});
const M=window.SolarExpertProductMatcher;
const B=window.SolarExpertBundleComposer;
const events=()=>window.dataLayer.filter(x=>['selector_engaged','affiliate_click','tool_start','tool_activation'].includes(x.event));
const expected=new Map([
  ['mppt-victron-100-20',20],
  ['mppt-victron-100-30',35],
  ['mppt-victron-100-50',60],
  ['mppt-victron-150-35',35],
  ['mppt-victron-150-70',50],
  ['mppt-victron-250-100',70],
]);
const mppt=id=>catalog.find(p=>p.id===id);
const panel=catalog.find(p=>p.id==='panel-victron-190');

async function main(){
  for(const [id,isc] of expected){
    const p=mppt(id);
    assert(p&&p.type==='mppt',id+' must remain in the audited catalog');
    assert.equal(p.max_pv_isc_a,isc,id+' must use manufacturer maximum PV short-circuit current');
    assert.equal(p.max_pv_isc_verified_on,'2026-11-07');
    assert(p.max_pv_isc_source_url?.startsWith('https://www.victronenergy.com/media/pg/'),
      'Manufacturer spec is required: '+id);
  }
  assert.equal(panel.isc_a,9.17,'Current Victron 190Wp Isc must be genuine STC 9.17A');
  assert.equal(panel.imp_a,8.71,'Do not confuse Isc with Imp 8.71A');
  assert.equal(panel.isc_verified_on,'2026-11-07');
  assert(panel.isc_source_url?.includes('solar-import.cz'),
    '190Wp SKU has an independently checked first-party seller specification');

  const guide=read('content/rewrites/jak-vybrat-mppt-regulator-pro-400w-panel.html');
  const ui=read('template-parts/mppt-selector.php');
  const js=read('assets/js/selectors.js');
  assert(guide.includes('href="/mppt-kalkulacka/?scenario=mppt400"'),
    'Buyer guide must offer the explicit and crawlable input-model CTA');
  assert(guide.includes('Isc 11 A')&&guide.includes('ilustrační'),
    'Never pass arbitrary panel data as a verified model');
  for(const id of ['se-mppt-panel-isc','se-mppt-parallel-count']){
    assert(ui.includes('for="'+id+'"')&&ui.includes('id="'+id+'"'),
      'PV Isc and parallel count require labelled editable controls: '+id);
  }
  assert(ui.includes('data-se-article-example="mppt400"'),
    'Editorial model must be openly disclosed');
  assert(js.includes('maxIsc*.98')&&js.includes('this.arrayIsc<='),
    'Controller Isc must be a hard electrical fit gate, not explanatory copy');

  const editorial=window.solarExpertMpptSelector();
  await editorial.init();
  assert.equal(editorial.articleExample,true);
  assert.equal(editorial.voltage,24);
  assert.equal(editorial.panelWp,400);
  assert.equal(editorial.panelVoc,49);
  assert.equal(editorial.panelVmp,40);
  assert.equal(editorial.panelIsc,11);
  assert.equal(editorial.seriesCount,1);
  assert.equal(editorial.parallelCount,1);
  assert.equal(editorial.arrayIsc,11);
  assert.equal(editorial.inputValid,true);
  assert(editorial.matches.length>0,'Genuine model must retain technically valid catalog matches');
  assert.equal(events().length,0,'Opening source-target model must not fake engagement or affiliate clicks');

  editorial.applyExample('single400');
  assert.equal(editorial.articleExample,false,'Explicit preset switch must clear inbound editorial context');
  assert.equal(events().length,1,'One real selection should count as engagement');
  assert.equal(events()[0].selector,'mppt');

  window.dataLayer.length=0;
  window.location.search='';
  const selection=window.solarExpertMpptSelector();
  selection.catalog=catalog;
  selection.catalogLoading=false;
  selection.voltage=24;
  selection.panelWp=200;
  selection.panelVoc=49;
  selection.panelVmp=40;
  selection.panelIsc=9;
  selection.seriesCount=1;
  selection.parallelCount=2;
  selection.run(false);
  assert(selection.matches.some(row=>row.product.id==='mppt-victron-100-20'),
    '2P at 9A each = 18A must fit certified 20A max (with 2% guard) if voltage/power fit');
  selection.panelIsc=11;
  selection.run(false);
  assert.equal(selection.arrayIsc,22);
  assert(!selection.matches.some(row=>row.product.id==='mppt-victron-100-20'),
    '2P at 11A each = 22A must EXCLUDE Victron 100/20 regardless of price');
  assert(selection.matches.some(row=>row.product.id==='mppt-victron-100-30'),
    'Victron 100/30 35A must still be a feasible alternative for 22A');

  selection.panelIsc=80;
  selection.parallelCount=1;
  selection.run(false);
  assert.equal(selection.matches.length,0,'All audited controllers must reject Isc above certified max 70A');

  selection.panelIsc=11;
  selection.parallelCount=1;
  selection.panelWp=400;
  selection.seriesCount=2;
  selection.run(false);
  assert(!selection.matches.some(row=>row.product.max_pv_voc_v===100),
    '2S×49Voc cold-adjusted exceeds 100V and must still be excluded by old voltage guard');

  selection.panelWp=200;
  selection.seriesCount=1;
  for(const invalid of [0,-1,NaN,Infinity,'nonsense']){
    selection.panelIsc=invalid;
    selection.run(false);
    assert.equal(selection.inputValid,false,'Isc '+String(invalid)+' must fail validation');
    assert.equal(selection.matches.length,0,'No matching on invalid Isc '+String(invalid));
  }
  selection.panelIsc=9;
  for(const invalid of [0,-1,1.5,Infinity,NaN]){
    selection.parallelCount=invalid;
    selection.run(false);
    assert.equal(selection.inputValid,false,'Parallel branch count must be positive integer');
    assert.equal(selection.matches.length,0);
  }
  selection.parallelCount=1;
  selection.run(false);
  const missingLimit={...mppt('mppt-victron-100-30')};
  delete missingLimit.max_pv_isc_a;
  selection.catalog=[missingLimit];
  selection.run(false);
  assert.equal(selection.matches.length,0,'Unknown manufacturer controller Isc must fail CLOSED');
  assert.equal(events().length,0,'Synthetic bad-input probes must not create conversion events');

  const validPanelPlan=B.findPanelPlan([panel],{voltage:24,panelWp:760},
    mppt('mppt-victron-100-30'),false,'best');
  assert(validPanelPlan&&validPanelPlan.topology==='2S2P',
    'Complete Builder should retain a valid 4×190Wp plan with 18.34A input current');
  assert.equal(validPanelPlan.parallel*panel.isc_a,18.34);
  const unknownPanel={...panel};delete unknownPanel.isc_a;
  assert.equal(B.findPanelPlan([unknownPanel],{voltage:24,panelWp:760},
    mppt('mppt-victron-100-30'),false,'best'),null,
  'Builder must not call a standalone MPPT arrangement safe with unknown panel Isc');

  const synthetic={...panel,id:'synthetic-100w',rated_wp:100,isc_a:11};
  const s={voltage:24,panelWp:400};
  assert.equal(B.findPanelPlan([synthetic],s,mppt('mppt-victron-100-20'),false,'best'),
    null,'4 panels 2S2P with Isc 11A each must not pass 100/20 (22A vs 20A)');
  synthetic.isc_a=9;
  const accepted=B.findPanelPlan([synthetic],s,mppt('mppt-victron-100-20'),false,'best');
  assert(accepted&&accepted.topology==='2S2P','18A must fit 100/20 Isc guard');
  console.log('PASS: manufacturer-sourced six MPPT Isc limits, real 190Wp Isc, 2S2P builder gate, editorial link, no phantom activity');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
