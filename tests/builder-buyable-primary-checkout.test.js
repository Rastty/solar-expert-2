'use strict';
/**
 * A valid priced variant must not lose the default checkout merely because
 * Best Value has a technical-only quote fallback. Synthetic components only:
 * no network, affiliate redirects, or WordPress side effects.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {mock}=require('node:test');
mock.timers.enable({apis:['Date'],now:new Date('2026-11-10T18:00:00Z')});
global.window={location:{origin:'https://solar-expert.cz'},SolarExpertConfig:{affiliateBases:{},affiliateMap:{products:{}}}};
require('../assets/js/product-matcher.js');
require('../assets/js/builder.js');
const b=window.solarExpertBuilder();
const part=(id,cost)=>({
  id,name:'synthetic '+id,verified_at:'2026-11-10',availability:'in_stock',price_czk:cost
});
const battery=part('battery',3000),inverter=part('inverter',5000);
const mppt=part('mppt',1500),panel=part('panel',1000);
const make=(tier,{price=true,total=11500,integrated=false,pvSafe=true,complete=true}={})=>({
  tier,label:({budget:'Budget',best:'Best Value',premium:'Premium'})[tier],
  complete,priceComplete:price,totalPrice:price?total:null,
  integratedMppt:integrated,pvIscVerified:pvSafe,batteryQuantity:1,battery,inverter,mppt,
  panel:{product:panel,count:2},bundleDeal:null
});
const budget=make('budget');
const bestPriced=make('best');
const bestUnpriced=make('best',{price:false});
const premium=make('premium');
b.bundles=[budget,bestPriced,premium];
assert.equal(b.primaryBundle,bestPriced,'Keep Best Value as default if its component bill reconciles');
assert.equal(b.primaryShoppingList.total,11500);
b.bundles=[budget,bestUnpriced,premium];
assert.equal(b.primaryBundle,budget,'Source-priced budget should provide checkout when Best Value has no valid price');
assert.equal(b.primaryShoppingList.total,11500,'The fallback must include the real itemized total');
assert.equal(b.checklistFor(b.primaryBundle)[0].label,'Solární panely','Checklist must follow buyer-selected tier');
b.bundles=[make('budget',{price:false}),bestUnpriced,premium];
assert.equal(b.primaryBundle,premium,'Use priced premium when budget and Best Value are technical-only');
assert.equal(b.primaryShoppingList.total,11500);
b.bundles=[make('budget',{price:false}),bestUnpriced,make('premium',{price:false})];
assert.equal(b.primaryBundle,bestUnpriced,'If no reconciled quote exists, preserve the technical Best Value fallback');
assert.equal(b.primaryShoppingList,null,'Never invent total or purchasing bill when no verified quote exists');
b.bundles=[budget,make('best',{price:true,total:11499}),premium];
assert.equal(b.primaryBundle,budget,'Mismatched Best Value displayed total must not hide another reconciled checkout');
assert.equal(b.purchaseBreakdownFor(b.bundles[1]),null,'The original arithmetic reconciliation gate stays fail-closed');
b.bundles=[budget,make('best',{price:true,integrated:true,pvSafe:false,total:11500})];
assert.equal(b.primaryBundle,budget,'An integrated inverter missing absolute PV Isc can never be primary');
assert.equal(b.completeBundles.length,1,'Unsafe hybrid must not appear among purchasable tiers');
b.bundles=[];
assert.equal(b.primaryBundle,null);
assert.equal(b.primaryShoppingList,null);
const html=fs.readFileSync(path.join(__dirname,'../template-parts/solar-builder.php'),'utf8');
assert(html.includes('data-se-primary-priced-fallback="true"'),'Explain the priced alternate explicitly in Czech UI');
assert(html.includes("completeBundles.some(b => b.priceComplete && !purchaseBreakdownFor(b))"),
  'Retain price reconciliation error even if the default checkout switches to another tier');
assert(html.includes('Varianta <strong x-text="primaryBundle?.label"'),'Display the actual selected checkout tier, never call budget Best Value');
console.log('PASS: verified buyer-ready primary with original Best Value, mismatch and PV Isc safety gates');
