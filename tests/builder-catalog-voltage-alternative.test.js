// The live November catalog offers no source-priced 12V >=1.8kWh battery for
// the example cottage, but does have a documented 24V alternative. The
// Builder may change its automatically selected system voltage only when
// there is a reconciled, electrically screened purchase path and the reason
// is visible to buyers. No merchant/electrical evidence is synthesized.
const {test,mock}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-17T12:00:00Z')});
global.window={SolarExpertConfig:{catalogUrl:'/mock-catalog',affiliateMap:{products:{},leads:{}},affiliateBases:{}},dataLayer:[]};
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');

const catalog=require('../data/product-seed.json');
const builder=()=>{
  const b=window.solarExpertBuilder();
  b.catalog=catalog.products;
  b.bundleDeals=catalog.bundle_deals;
  return b;
};
const preview=(b)=>{window.dataLayer=[];b.quickPreview();return b;};

test('true catalog shortage offers source-priced higher-voltage alternative without fabricated completion',()=>{
  const b=preview(builder());
  assert.equal(b.result.energyWh,1448);
  assert.equal(b.result.batteryKwh,1.8);
  assert.equal(b.result.panelWp,700);
  assert.equal(b.result.nominalVoltage,12);
  assert.equal(b.result.voltage,24);
  assert.equal(b.result.voltageAlternativeFrom,12);
  assert(b.primaryBundle && b.primaryBundle.complete && b.primaryBundle.priceComplete);
  assert.equal(b.primaryBundle.battery.system_voltage_class,24);
  assert.equal(b.primaryBundle.inverter.dc_voltage,24);
  assert(b.primaryBundle.batteryBank.totalEnergyWh>=1800);
  assert(b.primaryBundle.panel.totalWp>=700);
  assert.equal(b.primaryShoppingList.total,b.primaryBundle.totalPrice);
  assert.equal(window.dataLayer.filter(x=>x.event==='solar_builder_complete').length,0);
  assert.equal(window.dataLayer.filter(x=>x.event==='builder_step'&&x.status==='quick_preview').length,1);
});

test('explicit custom calculation records actual displayed voltage only once',()=>{
  const b=builder();
  window.dataLayer=[];
  b.preset('chata');
  b.advanceToUsage();
  b.calc();
  assert.equal(b.previewMode,false);
  assert.equal(b.result.voltage,24);
  const completions=window.dataLayer.filter(x=>x.event==='solar_builder_complete');
  assert.equal(completions.length,1);
  assert.equal(completions[0].voltage,24);
  assert.equal(completions[0].panelWp,b.result.panelWp);
});

test('keep nominal 12V if its valid full purchase list is already available',()=>{
  const b=builder();
  b.result={voltage:12,nominalVoltage:12,panelWp:300,mpptA:35,mpptAIsAdvisory:true,
    inverterW:900,peak:500,batteryKwh:1};
  b.refreshBundles();
  assert.equal(b.result.voltage,12);
  assert.equal(b.result.voltageAlternativeFrom,null);
  assert(b.primaryShoppingList && b.primaryShoppingList.total>0);
});

test('without verified 24V alternative, leave the unsolved 12V result honest',()=>{
  const b=builder();
  b.catalog=catalog.products.filter(x=>x.id!=='battery-goowei-24-100');
  preview(b);
  assert.equal(b.result.nominalVoltage,12);
  assert.equal(b.result.voltage,12);
  assert.equal(b.result.voltageAlternativeFrom,null);
  assert.equal(b.primaryShoppingList,null);
  // The remaining 48V integrated hybrids do not have independently verified
  // absolute PV Isc for a buyable system. They must NOT become alternatives.
  assert(!b.bundles.some(x=>x.priceComplete && x.integratedMppt && x.pvIscVerified===true));
});

test('recompute from original voltage when dated seller evidence changes',()=>{
  const b=preview(builder());
  assert.equal(b.result.voltage,24);
  // Synthetic test-only merchant re-check: the existing 12V / 200Ah source
  // record now has genuinely in-stock offers, with unchanged evidence URLs.
  b.catalog=catalog.products.map(p=>p.id==='battery-goowei-12-200'
    ? {...p,availability:'in_stock',offers:p.offers.map(o=>({...o,availability:'in_stock'}))}
    : p);
  b.refreshBundles();
  assert.equal(b.result.nominalVoltage,12);
  assert.equal(b.result.voltage,12);
  assert.equal(b.result.voltageAlternativeFrom,null);
  assert(b.primaryShoppingList && b.primaryShoppingList.total>0);
});

test('late catalog arrival unlocks the alternative without creating activity',async()=>{
  const b=window.solarExpertBuilder();
  window.dataLayer=[];
  b.quickPreview();
  assert.equal(b.result.voltage,12);
  assert.equal(b.primaryShoppingList,null);
  const oldFetch=global.fetch;
  try{
    global.fetch=async()=>({ok:true,json:async()=>catalog});
    await b.init();
    assert.equal(b.catalogReady,true);
    assert.equal(b.result.voltage,24);
    assert(b.primaryShoppingList);
    assert.equal(window.dataLayer.filter(x=>x.event==='solar_builder_complete').length,0);
    assert.equal(window.dataLayer.filter(x=>x.event==='builder_step'&&x.status==='quick_preview').length,1);
  }finally{
    global.fetch=oldFetch;
  }
});

test('buyer-facing explanation is explicit in the result view',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','template-parts','solar-builder.php'),'utf8');
  assert(html.includes('data-se-builder-available-voltage-alternative="true"'));
  assert(html.includes('x-show="result?.voltageAlternativeFrom"'));
  assert(html.includes('nejde o záruku')||html.includes('nikoli o záruku'));
  assert(html.includes('stejnou spotřebu'));
});
