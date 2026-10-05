global.window = {SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}}};
require('../assets/js/affiliate-adapter.js');
require('../assets/js/product-matcher.js');
require('../assets/js/bundle-composer.js');
require('../assets/js/builder.js');
require('../assets/js/quote-checker.js');
require('../assets/js/selectors.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const catalog = require('../assets/data/product-seed.json');
const M = global.window.SolarExpertProductMatcher;
const B = global.window.SolarExpertBundleComposer;
const A = global.window.SolarExpertAffiliate;

const multiProduct=catalog.products.find(p=>p.id==='mppt-victron-100-50');
const multiOffers=A.offers(multiProduct);
assert(multiOffers.length===2,'MPPT 100/50 should expose two merchant offers');
assert(multiOffers[0].merchantId==='solar-import-cz','Cheapest in-stock offer should be first');
assert(multiOffers[0].price_czk===3899,'Primary offer price should match verified snapshot');
window.SolarExpertConfig.affiliateMap.products['mppt-victron-100-50@battery-cz']='https://example.com/battery-affiliate';
const batteryOffer=A.offers(multiProduct).find(o=>o.merchantId==='battery-cz');
const solarOffer=A.offers(multiProduct).find(o=>o.merchantId==='solar-import-cz');
assert(batteryOffer.monetized&&batteryOffer.href==='https://example.com/battery-affiliate','Merchant-specific affiliate URL must resolve for matching merchant');
assert(!solarOffer.monetized,'Merchant-specific affiliate URL must not leak to another merchant');

window.SolarExpertConfig.affiliateBases={
  'solar-import-cz':'https://ehub.cz/system/scripts/click.php?a_aid=testpub&a_bid=testsolar'
};
const victronPanel=catalog.products.find(p=>p.id==='panel-victron-190');
const generatedPanelOffer=A.resolve(victronPanel);
assert(generatedPanelOffer.monetized,'Merchant base should auto-generate deeplink');
assert(generatedPanelOffer.href.startsWith('https://ehub.cz/system/scripts/click.php?'),'Generated deeplink should preserve eHub base URL');
const generatedUrl=new URL(generatedPanelOffer.href);
assert(generatedUrl.searchParams.get('a_aid')==='testpub','Generated deeplink should preserve publisher id');
assert(generatedUrl.searchParams.get('a_bid')==='testsolar','Generated deeplink should preserve advertiser creative id');
assert(generatedUrl.searchParams.get('desturl')===victronPanel.source_url,'Generated deeplink should target exact product source URL');
window.SolarExpertConfig.affiliateBases={
  'eon-cz':'https://ehub.cz/system/scripts/click.php?a_aid=testpub&a_bid=testeon'
};
const eonHeat=A.resolveLead('eon-heat-pump','https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/');
assert(eonHeat.monetized,'One E.ON base should monetize the heat-pump lead');
assert(new URL(eonHeat.href).searchParams.get('desturl')==='https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/','Heat-pump lead should deep-link to heat-pump landing page');
const eonSolar=A.resolveLead('eon-solar','https://www.eon.cz/domacnosti/usporne-technologie/solar/');
assert(eonSolar.monetized,'One E.ON base should monetize the solar lead');
assert(new URL(eonSolar.href).searchParams.get('desturl')==='https://www.eon.cz/domacnosti/usporne-technologie/solar/','Solar lead should deep-link to solar landing page');
window.SolarExpertConfig.affiliateMap.leads['eon-solar']='https://example.com/eon-solar-override';
const eonOverride=A.resolveLead('eon-solar','https://www.eon.cz/domacnosti/usporne-technologie/solar/');
assert(eonOverride.href==='https://example.com/eon-solar-override','Explicit lead mapping must override generated E.ON deeplink');
delete window.SolarExpertConfig.affiliateMap.leads['eon-solar'];
window.SolarExpertConfig.affiliateBases={};
assert(M.effectivePrice(multiProduct)===3899,'Matcher should use cheapest in-stock merchant offer');
const temporarilyExpensive={...multiProduct,price_czk:99999};
assert(M.effectivePrice(temporarilyExpensive)===3899,'Offer price should override stale product-level price for ranking');


window.dataLayer=[];
const selectorAnalytics=global.window.solarExpertBatterySelector();
selectorAnalytics.catalog=catalog.products;
selectorAnalytics.run(true);
selectorAnalytics.dailyKwh=2;
selectorAnalytics.run(true);
const selectorEvents=window.dataLayer.filter(e=>e.event==='selector_engaged'&&e.selector==='battery');
assert(selectorEvents.length===1,'Selector engagement should emit exactly once per tool instance');
assert(selectorEvents[0].matchCount>=0,'Selector engagement should include match count');
window.dataLayer=[];

const batterySelectorReserve=global.window.solarExpertBatterySelector();
batterySelectorReserve.catalog=catalog.products;
batterySelectorReserve.voltage=24;
batterySelectorReserve.dailyKwh=1.5;
batterySelectorReserve.autonomy=1;
batterySelectorReserve.inverterW=1000;
batterySelectorReserve.run();
assert(batterySelectorReserve.matches.some(x=>x.product.id==='battery-goowei-24-100'),'24V 2.56kWh battery should cover 1.5kWh/day with reserve');
assert(!batterySelectorReserve.matches.some(x=>x.product.id==='battery-goowei-24-50'),'24V 1.28kWh battery must not pass a larger nominal sizing target');

const batterySelectorBank=global.window.solarExpertBatterySelector();
batterySelectorBank.catalog=catalog.products;
batterySelectorBank.voltage=48;
batterySelectorBank.dailyKwh=8;
batterySelectorBank.autonomy=1;
batterySelectorBank.inverterW=5000;
batterySelectorBank.run();
const pusungBank=batterySelectorBank.matches.find(x=>x.product.id==='battery-seplos-pusung-48');
assert(pusungBank,'High-capacity Battery Selector should find a verified parallel bank');
assert(pusungBank.quantity===2,'48V high-capacity selector should use the minimum two PUSUNG-S modules');
assert(pusungBank.totalEnergyWh===10240,'Battery Selector should expose 10.24kWh for two PUSUNG-S modules');
assert(pusungBank.totalDischargeA===Number(pusungBank.product.max_discharge_a)*2,'Battery Selector should sum verified parallel BMS discharge current');
assert(batterySelectorBank.matches.every(x=>x.totalEnergyWh>=9500),'Battery Selector must not return an undersized bank');


const mpptSelectorStart=global.window.solarExpertMpptSelector();
mpptSelectorStart.catalog=catalog.products;
mpptSelectorStart.voltage=24;
mpptSelectorStart.panelWp=500;
mpptSelectorStart.panelVoc=25.5;
mpptSelectorStart.panelVmp=21.8;
mpptSelectorStart.seriesCount=1;
mpptSelectorStart.run();
assert(mpptSelectorStart.matches.length===0,'One-panel 24V string must fail Victron MPPT start-voltage window');

mpptSelectorStart.seriesCount=2;
mpptSelectorStart.run();
assert(mpptSelectorStart.matches.length>0,'Two-panel 24V string should reach the verified MPPT start-voltage window');

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

const mppt250100=catalog.products.find(p=>p.id==='mppt-victron-250-100');
assert(mppt250100,'Verified Victron SmartSolar MPPT 250/100 must exist in catalog');
assert(mppt250100.rated_charge_a===100,'MPPT 250/100 must expose verified 100A charge current');
assert(mppt250100.max_pv_voc_v===250,'MPPT 250/100 must expose verified 250V PV maximum');
assert(mppt250100.max_pv_w_by_voltage['24']===2900,'MPPT 250/100 must expose verified 2900Wp 24V PV limit');

const yearRound24Sizing={
  voltage:24,
  batteryKwh:2.5,
  inverterW:1300,
  peak:2477,
  panelWp:1750,
  mpptA:95
};
const yearRound24=B.compose(catalog.products,yearRound24Sizing,catalog.bundle_deals).find(b=>b.tier==='best');
assert(yearRound24&&yearRound24.complete,'Year-round 24V Best Value bundle should become complete with MPPT 250/100');
assert(yearRound24.mppt&&yearRound24.mppt.id==='mppt-victron-250-100','Year-round 24V bundle should use verified MPPT 250/100');
assert(yearRound24.panel.totalWp>=yearRound24Sizing.panelWp,'Year-round 24V panel plan must meet requested PV power');
assert(yearRound24.panel.coldStringVoc<yearRound24.mppt.max_pv_voc_v*0.98,'Year-round 24V string must remain below MPPT cold-Voc safety margin');

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
assert(best48.panel.product.id!=='panel-dah-555','Discontinued DAH panel must never be selected');
const bundleDealSizing={voltage:48,batteryKwh:4.5,inverterW:4000,peak:7000,panelWp:1000,mpptA:30};
const withoutDeal=B.compose(catalog.products,bundleDealSizing,[]).find(b=>b.tier==='best');
const withDeal=B.compose(catalog.products,bundleDealSizing,catalog.bundle_deals).find(b=>b.tier==='best');
assert(withoutDeal&&withDeal&&withoutDeal.complete&&withDeal.complete,'48V deal scenario should stay technically complete');
assert(withoutDeal.battery.id===withDeal.battery.id&&withoutDeal.inverter.id===withDeal.inverter.id,'Bundle deal must not change technical component selection');
assert(withDeal.battery.id==='battery-seplos-pusung-48','Deal scenario should use verified PUSUNG battery');
assert(withDeal.inverter.id==='inverter-growatt-48-6000','Deal scenario should use verified Growatt 6000 inverter');
assert(withDeal.bundleDeal&&withDeal.bundleDeal.id==='deal-battery-pusung-growatt6000','Verified PUSUNG + Growatt deal must attach');
assert(withDeal.bundleDeal.savings_czk===1490,'Verified bundle deal should save 1490 CZK versus separate battery + inverter prices');
assert(withDeal.totalPrice===Number(withDeal.bundleDeal.price_czk)+M.effectivePrice(withDeal.panel.product)*withDeal.panel.count,'Bundle total should use deal price plus panel cost');
assert(withDeal.totalPrice===withoutDeal.totalPrice-withDeal.bundleDeal.savings_czk,'Bundle deal must lower total only by verified savings');
assert(B.findBundleDeal([{id:'too-expensive',availability:'in_stock',components:['battery-seplos-pusung-48','inverter-growatt-48-6000'],price_czk:99999}],['battery-seplos-pusung-48','inverter-growatt-48-6000'],34480)===null,'A bundle deal must be ignored when it is not cheaper');

window.SolarExpertConfig.affiliateBases={'battery-cz':'https://ehub.cz/system/scripts/click.php?a_aid=testpub&a_bid=testbattery'};
const resolvedDeal=A.resolveBundleDeal(withDeal.bundleDeal);
assert(resolvedDeal.monetized,'Verified bundle deal should use merchant affiliate base when available');
assert(new URL(resolvedDeal.href).searchParams.get('desturl')===withDeal.bundleDeal.source_url,'Bundle affiliate deeplink must target exact set URL');
window.dataLayer=[];
A.trackBundleDeal(withDeal.bundleDeal,'builder-best');
assert(window.dataLayer.some(e=>e.event==='bundle_deal_click'&&e.dealId===withDeal.bundleDeal.id),'Bundle deal click must emit dedicated analytics event');
window.SolarExpertConfig.affiliateBases={};
window.dataLayer=[];

const high48Sizing={voltage:48,batteryKwh:5,inverterW:5000,peak:9000,panelWp:2500,mpptA:70};
const high48Bundles=B.compose(catalog.products,high48Sizing,catalog.bundle_deals);
const high48Best=high48Bundles.find(b=>b.tier==='best');
assert(high48Best&&high48Best.complete,'High-power 48V scenario should become complete with a verified parallel battery bank');
assert(high48Best.battery.id==='battery-seplos-pusung-48','High-power Best Value bank should use verified PUSUNG-S modules');
assert(high48Best.batteryQuantity===2,'High-power Best Value bank should use the minimum verified quantity of two PUSUNG-S modules');
assert(high48Best.batteryBank.totalEnergyWh===10240,'Two PUSUNG-S modules should expose 10.24kWh nominal energy');
assert(high48Best.batteryBank.dischargePowerW>=high48Sizing.inverterW,'Parallel battery bank must cover requested continuous inverter power');
assert(high48Best.bundleDeal&&high48Best.bundleDeal.id==='deal-battery-pusung-growatt6000','Two-battery PUSUNG bank should use the verified one-battery + inverter set once');
assert(high48Best.bundleDeal.extraBatteryUnits===1,'Two-battery bank should require exactly one extra PUSUNG module outside the set');
assert(high48Best.bundleDeal.bankSavingsCzk===1490,'Set + extra battery should preserve the verified 1490 CZK saving');
const high48WithoutDeal=B.compose(catalog.products,high48Sizing,[]).find(b=>b.tier==='best');
assert(high48Best.totalPrice===high48WithoutDeal.totalPrice-1490,'Multi-battery set optimization must lower total only by the verified set saving');

const high48Premium=high48Bundles.find(b=>b.tier==='premium');
assert(high48Premium&&high48Premium.complete,'Premium high-power 48V scenario should also be complete');
assert(high48Premium.battery.id==='battery-pylontech-us5000','Premium high-power bank should use verified Pylontech US5000 modules');
assert(high48Premium.batteryQuantity===2,'Premium high-power bank should use two Pylontech modules');
assert(high48Premium.batteryBank.totalEnergyWh===9600,'Two Pylontech US5000 modules should expose 9.6kWh nominal energy');
assert(high48Premium.bundleDeal===null,'Bundle deal must not apply when battery quantity is greater than one');

const pusungParallel=catalog.products.find(p=>p.id==='battery-seplos-pusung-48');
const pylonParallel=catalog.products.find(p=>p.id==='battery-pylontech-us5000');
assert(pusungParallel.parallel_max_units===16,'PUSUNG-S parallel limit should match verified evidence');
assert(pylonParallel.parallel_max_units===16,'Pylontech US5000 parallel limit should match verified evidence');

const onRequestPremium={
  id:'battery-test-premium-24',
  name:'Test premium 24V',
  type:'battery',
  tier:'premium',
  system_voltage_class:24,
  energy_wh:2560,
  max_discharge_a:100,
  availability:'on_request',
  price_czk:28000
};
const onRequestCandidates=B.batteryBankCandidatesAll([...catalog.products,onRequestPremium],{voltage:24,batteryKwh:2,inverterW:1500});
assert(!onRequestCandidates.some(x=>x.product.id===onRequestPremium.id),'On-request battery must not unlock a complete premium bank');


const discontinuedOnly=B.findPanelPlan(
  catalog.products.filter(p=>p.id==='panel-dah-555'),
  {voltage:48,panelWp:1000},
  catalog.products.find(p=>p.id==='inverter-growatt-48-6000'),
  true,
  'premium'
);
assert(discontinuedOnly===null,'A discontinued panel cannot form a bundle even when technically compatible');
const victron190=catalog.products.find(p=>p.id==='panel-victron-190');
assert(M.effectivePrice(victron190)===2251,'Victron 190W current verified snapshot should be 2251 CZK');

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

const bundle12Sizing = {
  voltage:12,
  batteryKwh:1,
  inverterW:800,
  peak:1800,
  panelWp:180,
  mpptA:20
};
const bundles12 = B.compose(catalog.products, bundle12Sizing);
const budget12Verified = bundles12.find(b=>b.tier==='budget');
assert(budget12Verified && budget12Verified.complete, 'Small 12V Budget bundle should be complete with verified standalone inverter');
assert(budget12Verified.inverter.id==='inverter-rogerele-rep1000-12', '12V Budget bundle should use ROGERELE REP1000-12');
assert(budget12Verified.inverter.peak_w>=bundle12Sizing.peak, '12V Budget inverter must cover requested surge');
assert(budget12Verified.mppt.id==='mppt-victron-100-20', 'Small 12V Budget bundle should use verified SmartSolar 100/20');

const battery12LargerSizing={voltage:12,batteryKwh:2,inverterW:800};
const larger12Batteries=M.rank(catalog.products.filter(p=>p.type==='battery'),battery12LargerSizing);
assert(larger12Batteries.some(x=>x.product.id==='battery-goowei-12-200'),'12V 2kWh scenario should find verified GOOWEI 200Ah battery');
assert(!larger12Batteries.some(x=>x.product.id==='battery-goowei-12-100'),'12V 100Ah battery must not pass a 2kWh nominal target');

const kosun48Sizing={voltage:48,inverterW:2500,peak:5000};
const kosun48Matches=M.rank(catalog.products.filter(p=>p.type==='inverter'||p.type==='inverter_hybrid'),kosun48Sizing);
assert(kosun48Matches.some(x=>x.product.id==='inverter-kosun-48-3000'),'48V selector should include verified KOSUN 3000W budget inverter');

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
const cottageComparison=builder.comparisonFor(cottageBest);
assert(cottageComparison&&cottageComparison.batteryKwh>=builder.result.batteryKwh,'Comparison must expose battery capacity that meets sizing target');
assert(cottageComparison.inverterW>=builder.result.inverterW,'Comparison must expose continuous inverter reserve');
assert(cottageComparison.surgeW>=builder.result.peak,'Comparison must expose surge reserve');
assert(cottageComparison.panelWp>=builder.result.panelWp,'Comparison must expose PV reserve');
assert(cottageComparison.reasons.length>=5,'Comparison should explain why the variant fits');

const cottageChecklist=builder.checklistFor(cottageBest);
assert(cottageChecklist.some(x=>x.group==='included'&&x.label==='Baterie'),'Completion checklist must show battery as included');
assert(cottageChecklist.some(x=>x.group==='included'&&x.label==='MPPT regulátor'),'Completion checklist must show MPPT coverage');
assert(cottageChecklist.some(x=>x.group==='extra'&&x.label.includes('DC jištění')),'Completion checklist must surface battery DC protection');
assert(cottageChecklist.some(x=>x.group==='extra'&&x.label.includes('Kabely')),'Completion checklist must surface cabling');
assert(builder.primaryBundle===cottageBest,'Best Value should be the primary completeness checklist when available');

const quoteGood = global.window.solarExpertQuoteChecker();
quoteGood.dailyKwh=2;
quoteGood.season='three';
quoteGood.autonomy=1;
quoteGood.loadW=900;
quoteGood.surgeNeedW=1800;
quoteGood.panelWp=1000;
quoteGood.batteryKwh=2.5;
quoteGood.inverterW=1200;
quoteGood.inverterPeakW=2200;
quoteGood.systemVoltage=24;
quoteGood.evaluate();
assert(quoteGood.result.status==='pass', 'Balanced quote should pass base sizing checks');

const quoteBad = global.window.solarExpertQuoteChecker();
quoteBad.dailyKwh=4;
quoteBad.season='year';
quoteBad.autonomy=2;
quoteBad.loadW=2500;
quoteBad.surgeNeedW=4500;
quoteBad.panelWp=900;
quoteBad.batteryKwh=3;
quoteBad.inverterW=1800;
quoteBad.inverterPeakW=3000;
quoteBad.systemVoltage=12;
quoteBad.evaluate();
assert(quoteBad.result.status==='fail', 'Undersized quote must fail');
assert(quoteBad.checks.some(c=>c.key==='pv'&&c.status==='fail'), 'Undersized quote should fail PV sizing');
assert(quoteBad.checks.some(c=>c.key==='battery'&&c.status==='fail'), 'Undersized quote should fail battery sizing');
assert(quoteBad.checks.some(c=>c.key==='inverter'&&c.status==='fail'), 'Undersized quote should fail inverter sizing');

console.log('Solar Expert engine tests passed');


assert(M.verificationState(null,'2026-10-05T00:00:00Z')==='unknown','Missing verification date must stay explicit as unknown');
assert(M.verificationState('2026-09-20','2026-10-05T00:00:00Z')==='fresh','15-day verification snapshot should be fresh');
assert(M.verificationState('2026-08-01','2026-10-05T00:00:00Z')==='stale','Old verification snapshot should be stale');

const staleOfferProduct={
  id:'stale-offer-test',
  type:'battery',
  system_voltage_class:48,
  energy_wh:5000,
  max_discharge_a:100,
  availability:'in_stock',
  price_czk:1000,
  offers:[{
    merchant:'battery-cz',
    price_czk:999,
    availability:'in_stock',
    source_url:'https://www.battery.cz/',
    verified_at:'2000-01-01'
  }]
};
assert(M.effectivePrice(staleOfferProduct)===Number.MAX_SAFE_INTEGER,'Known stale verified offer must not drive effective price');
assert(M.availabilityRank(staleOfferProduct)===1,'Known stale stock evidence may stay technically recommendable but must be downgraded from fresh in-stock rank');
const staleResolved=A.resolveOffer(staleOfferProduct,staleOfferProduct.offers[0]);
assert(staleResolved.price_czk===null,'Known stale offer price must be hidden in UI resolver');
assert(staleResolved.price_freshness==='stale','UI resolver must expose stale price state');

const staleDeal=B.findBundleDeal([{
  id:'stale-deal',
  merchant:'battery-cz',
  availability:'in_stock',
  components:['battery-seplos-pusung-48','inverter-growatt-48-6000'],
  price_czk:1,
  verified_at:'2000-01-01'
}],['battery-seplos-pusung-48','inverter-growatt-48-6000'],99999);
assert(staleDeal===null,'Known stale verified bundle deal must not lower bundle price');
