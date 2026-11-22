'use strict';
/** Real custom appliance -> result without forced optional form.
 * Source-only adversarial regression: no third-party requests or analytics
 * POSTs, no fabricated human attribution, same existing electrical engine.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
global.window={
  SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{},leads:{}}},
  dataLayer:[]
};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
const markup=fs.readFileSync(require('node:path').join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
const css=fs.readFileSync(require('node:path').join(__dirname,'..','style.css'),'utf8');

const events=e=>window.dataLayer.filter(x=>x.event===e);
const b=window.solarExpertBuilder();
b.preset('chata');
assert.equal(b.step,2,'Normal preset still opens editable appliances');
assert.equal(b.scenario,'chata');
const fridge=b.appliances.find(x=>x.id==='fridge');
fridge.hours=8;
fridge.qty=1;
const selection=b.selectedAppliances.map(a=>({id:a.id,watts:a.watts,hours:a.hours,qty:a.qty}));
assert.equal(b.dailyWh,1308,'A personalized appliance edit must determine energy, not the static 1448Wh demo');

// Explicit shortcut is not a preview. Reset only the labeled season/autonomy
// defaults, including a previously stale/incompatible custom peak input.
b.season='year';b.autonomy=2;b.manualPeak=9000;
assert.equal(b.calcFromAppliances(),true);
assert.equal(b.step,4);
assert.equal(b.previewMode,false);
assert.equal(b.season,'three');
assert.equal(b.autonomy,1);
assert.equal(b.manualPeak,null);
assert.equal(b.result.energyWh,1308);
assert.equal(b.result.energyKwh,1.31);
assert.deepEqual(b.selectedAppliances.map(a=>({id:a.id,watts:a.watts,hours:a.hours,qty:a.qty})),selection,
  'Fast path must not silently replace user-edited loads with demo defaults');
assert.equal(events('solar_builder_complete').length,1,'Only a real user-triggered calculation is counted');
assert.equal(events('builder_step').filter(x=>x.status==='result').length,1);
assert.equal(events('builder_step').filter(x=>x.status==='step_3').length,0,
  'Skipping advanced step may not fabricate an intermediate step_3 event');
assert.equal(events('builder_step').filter(x=>x.status==='quick_preview').length,0);
assert.equal(events('lead_click').length,0);
assert.equal(events('affiliate_click').length,0);

// Invalid appliance values keep focus and user input on the editable step 2.
window.dataLayer.length=0;
const bad=window.solarExpertBuilder();
bad.preset('chata');
bad.appliances.find(x=>x.id==='router').hours=25;
assert.equal(bad.calcFromAppliances(),false);
assert.equal(bad.step,2);
assert.match(bad.inputError,/24 hodin/);
assert.equal(events('solar_builder_complete').length,0);
assert.equal(events('builder_step').filter(x=>x.status==='result').length,0);
assert.equal(bad.appliances.find(x=>x.id==='router').hours,25,
  'Validation must preserve invalid entered value for correction');

// Advanced path still allows independent user selection and uses same calc.
window.dataLayer.length=0;
const advanced=window.solarExpertBuilder();
advanced.preset('chata');advanced.advanceToUsage();
assert.equal(advanced.step,3);
advanced.season='year';advanced.autonomy=2;advanced.manualPeak=1200;
advanced.calc();
assert.equal(advanced.step,4);
assert.equal(advanced.season,'year');
assert.equal(advanced.autonomy,2);
assert.equal(advanced.previewMode,false);
assert.equal(events('solar_builder_complete').length,1);
assert.equal(events('builder_step').filter(x=>x.status==='step_3').length,1);

// Buttons are native, non-submit actions and must focus the result only
// after success, not when input validation fails.
assert(markup.includes('data-se-builder-fast-result-actions="v1"'));
assert(markup.includes('data-se-builder-calc-from-appliances="v1"'));
assert(markup.includes('data-se-builder-defaults-disclosed="v1"'));
assert(markup.includes('data-se-builder-advanced-choice="v1"'));
assert(markup.includes('jaro–podzim'));
assert(markup.includes('rezervu baterie <strong>1 den</strong>'));
assert(markup.includes('@click="advanceToUsage()"'), 'Advanced season step must remain available');
assert(css.includes('#builder .se-builder-advanced-link:focus-visible'));

const expression=markup.match(/@click="(calcFromAppliances\(\);[^"]+)"\s*data-se-builder-calc-from-appliances=/)?.[1];
assert(expression,'Fast calculation and focus expression missing');
for(const succeed of [true,false]){
  let callback=null,focused=0;
  const state={
    step:2,
    calcFromAppliances(){if(succeed)state.step=4;},
    $refs:{builderHeading:{focus(options){assert.equal(options.preventScroll,true);focused++;}}},
    $nextTick(fn){callback=fn}
  };
  vm.runInNewContext(expression,state);
  assert.equal(focused,0,'Wait for Alpine rendering before focus');
  assert.equal(typeof callback,'function');
  callback();
  assert.equal(focused,succeed?1:0,'Invalid custom values must keep error-context focus');
}
console.log('PASS: real custom appliance fast result, explicit safe defaults, preserved advanced edit and honest analytics');
