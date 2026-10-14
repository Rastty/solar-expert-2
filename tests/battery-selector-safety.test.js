'use strict';
/** Battery Selector must not recommend unsafe BMS-limited configurations.
 * Exercise the REAL UI controller + REAL production ranking modules; do not
 * mock the math or count smoke checks as visitor tool engagement.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(read('assets/data/product-seed.json')).products;

global.window={SolarExpertConfig:{},dataLayer:[]};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/selectors.js');

const sample=catalog.find(p=>p.id==='battery-goowei-24-50');
assert(sample&&Number(sample.system_voltage_class)===24&&Number(sample.max_discharge_a)===40,
  'Use the verified real 24V 50Ah battery with a 40A BMS limit');
const singleModule={...sample,parallel_max_units:1};

function setup(continuousW,composer=true) {
  const controller=window.solarExpertBatterySelector();
  controller.catalog=[singleModule];
  controller.catalogLoading=false;
  controller.voltage=24;
  controller.dailyKwh=.7;
  controller.autonomy=1;
  controller.inverterW=continuousW;
  if(!composer)window.SolarExpertBundleComposer=null;
  controller.run(false);
  return controller;
}
const preview=setup(900);
assert.equal(preview.requiredBatteryKwh,1.0,
  '700 Wh of AC loads require >=972 Wh nominal with 80% usable and 90% inverter efficiency');
assert.equal(preview.requiredBatteryDcW,1000,
  '900W AC must consume >=1000W DC at the modeled 90% efficiency');
assert.equal(preview.requiredDischargeA,42,
  'BMS current must be computed from DC input power, not AC output W');
assert.equal(preview.matches.length,0,
  '24V BMS limited to 40A MUST NOT pass a 900W AC continuous inverter load');
const lower=setup(800);
assert(lower.matches.some(r=>r.product.id===sample.id),
  '24V 40A BMS can pass 800W AC (DC 889W) when energy capacity is sufficient');
assert.equal(lower.requiredDischargeA,38);
const noComposer=setup(900,false);
assert.equal(noComposer.matches.length,0,
  'Single-product fallback must retain exactly the same safety envelope');
window.SolarExpertBundleComposer=require.cache[require.resolve('../assets/js/bundle-composer.js')] &&
  (delete require.cache[require.resolve('../assets/js/bundle-composer.js')],
   require('../assets/js/bundle-composer.js'),window.SolarExpertBundleComposer);
const track=window.solarExpertBatterySelector();
track.catalog=catalog;track.catalogLoading=false;track.voltage=24;track.dailyKwh=.7;track.inverterW=1000;track.run(true);
let events=window.dataLayer.filter(e=>e.event==='selector_engaged'&&e.selector==='battery');
assert.equal(events.length,1);
assert.equal(events[0].inverterW,1000,'Visitor analytics must keep user-entered AC watts');
track.run(true);
assert.equal(window.dataLayer.filter(e=>e.event==='selector_engaged'&&e.selector==='battery').length,1,
  'No synthetic repeated engagements from automatic recalculation');

const ui=read('template-parts/battery-selector.php');
assert(ui.includes('80 % využitelné kapacity')&&ui.includes('90 % účinností měniče'));
assert(ui.includes('spotřebu samotného měniče naprázdno'));
assert(read('content/pages/vyber-baterii.html').includes('/ (0,80 × 0,90)'),
  'Public buying-guide explanation must match real electrical math');
console.log('PASS: AC consumption, usable-energy reserve, BMS fit and fallback safety boundary; one genuine engagement only');
