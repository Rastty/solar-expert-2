global.window = {};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const catalog = require('../assets/data/product-seed.json');
const M = global.window.SolarExpertProductMatcher;
const B = global.window.SolarExpertBundleComposer;

const battery24Sizing = { voltage:24, batteryKwh:1.5, inverterW:1000 };
const batteries = M.rank(catalog.products.filter(p=>p.type==='battery'), battery24Sizing);
assert(batteries.length > 0, '24V battery scenario should find at least one battery');
assert(batteries.every(x=>x.product.system_voltage_class===24), 'Battery selector must never cross voltage classes');

const inverter48Sizing = { voltage:48, inverterW:3000, peak:5000 };
const inverters = M.rank(catalog.products.filter(p=>p.type==='inverter'||p.type==='inverter_hybrid'), inverter48Sizing);
assert(inverters.some(x=>x.product.id==='inverter-growatt-48-3500'), '48V high-power scenario should find Growatt 3500ES');

const mppt24Sizing = { voltage:24, panelWp:700, mpptA:40 };
const mppts = M.rank(catalog.products.filter(p=>p.type==='mppt'), mppt24Sizing);
assert(mppts.some(x=>x.product.id==='mppt-victron-100-50'), '24V / 700Wp / 40A should find SmartSolar 100/50');

const bundle24Sizing = {
  voltage:24,
  batteryKwh:1.5,
  inverterW:1000,
  peak:1800,
  panelWp:700,
  mpptA:40
};
const bundles24 = B.compose(catalog.products, bundle24Sizing);
const best24 = bundles24.find(b=>b.tier==='best');
assert(best24 && best24.complete, '24V Best Value bundle should be complete');
assert(best24.mppt.id==='mppt-victron-100-50', '24V bundle should use an MPPT that passes 40A requirement');
assert(best24.panel.series>=2, '24V Victron panel string must meet MPPT start voltage');
assert(best24.panel.coldStringVoc < best24.mppt.max_pv_voc_v * 0.98, '24V panel string must keep cold Voc below safety margin');
assert(best24.panel.totalWp >= bundle24Sizing.panelWp, '24V panel plan must meet requested Wp');

const bundle48Sizing = {
  voltage:48,
  batteryKwh:2,
  inverterW:3000,
  peak:5000,
  panelWp:1000,
  mpptA:30
};
const bundles48 = B.compose(catalog.products, bundle48Sizing);
const best48 = bundles48.find(b=>b.tier==='best');
assert(best48 && best48.complete, '48V Growatt Best Value bundle should be complete');
assert(best48.inverter.id==='inverter-growatt-48-3500', '48V Best Value should use Growatt 3500ES');
assert(best48.integratedMppt, 'Growatt bundle should use integrated MPPT');
assert(best48.panel.stringVmp >= best48.inverter.integrated_mppt.mppt_v_min, 'Growatt string Vmp must reach MPPT minimum');
assert(best48.panel.coldStringVoc < best48.inverter.integrated_mppt.pv_voc_max * 0.98, 'Growatt cold Voc must stay below safe maximum');
assert(best48.panel.topology.includes('S') && best48.panel.topology.includes('P'), 'Bundle must expose series/parallel topology');

const impossibleController = {
  max_pv_w_by_voltage: {'24': 2000},
  max_pv_voc_v: 80,
  min_pv_start_v_by_voltage: {'24': 120}
};
const impossiblePlan = B.findPanelPlan(
  catalog.products.filter(p=>p.type==='panel'),
  {voltage:24,panelWp:500},
  impossibleController,
  false,
  'best'
);
assert(impossiblePlan===null, 'Impossible MPPT voltage window must not produce a panel plan');

const kosunSizing = {
  voltage:12,
  batteryKwh:1,
  inverterW:800,
  peak:1500,
  panelWp:250,
  mpptA:25
};
const kosunBundles = B.compose(catalog.products, kosunSizing);
const budget12 = kosunBundles.find(b=>b.tier==='budget');
assert(!budget12.complete, '12V KOSUN bundle must stay incomplete until explicit PV power evidence is available');

const builder = global.window.solarExpertBuilder();
builder.catalog = catalog.products;
builder.preset('chata');
builder.calc();
assert(builder.result.voltage===24, 'Default cottage preset should use 24V, not jump to 48V only because of short pump surge');
assert(builder.result.inverterW>=builder.result.runningWatts, 'Continuous inverter target must cover running load');
assert(builder.result.peak>builder.result.inverterW, 'Cottage pump scenario should keep surge separate from continuous inverter sizing');
const cottageBest = builder.bundles.find(b=>b.tier==='best');
assert(cottageBest && cottageBest.complete, 'Default cottage scenario should produce a complete Best Value bundle');
assert(cottageBest.inverter.id==='inverter-rogerele-rep1500-24', 'Default cottage should select the verified 24V 1500W inverter');
assert(cottageBest.inverter.peak_w>=builder.result.peak, 'Selected inverter must cover estimated surge');

console.log('Solar Expert engine tests passed');
