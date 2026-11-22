/* Solar Expert live legacy Growatt integrated MPPT purchase safety gate v1.
 * Source review: public old WordPress v0.12.27 has neither per-tracker
 * PV input evidence nor proven absolute Isc for the two exact named SKUs.
 * Both must remain *informative*, never a complete shoppable PV bundle.
 * Does not modify panel math, catalog, price, affiliate mapping or topology.
 */
(function(){
  'use strict';
  var exactIds={
    'inverter-growatt-48-3500':true,
    'inverter-growatt-48-6000':true
  };
  var composer=window.SolarExpertBundleComposer;
  if(!composer || typeof composer.compose!=='function')return;
  if(composer.__seGrowattPVGuardV1===true)return;
  var original=composer.compose;
  composer.compose=function(){
    var result=original.apply(this,arguments);
    if(!Array.isArray(result))return result;
    return result.map(function(bundle){
      if(!bundle || !bundle.integratedMppt ||
         !Object.prototype.hasOwnProperty.call(exactIds,bundle.inverter&&bundle.inverter.id)){
        return bundle;
      }
      // The currently sold hardware revision has NO validated absolute PV
      // short-circuit Isc limit per MPPT input. Battery charger current and
      // 16A / 22A operating PV input are NEVER substitutes.
      bundle.complete=false;
      bundle.pvIscVerified=false;
      bundle.status='pv_isc_limit_unverified';
      var pending=Array.isArray(bundle.checksPending)?bundle.checksPending.slice():[];
      var notice='Absolutní PV Isc limit integrovaného MPPT pro tuto revizi Growatt není doložen; tuto sestavu nenakupujte bez posouzení výrobce.';
      if(!pending.includes(notice))pending.push(notice);
      bundle.checksPending=pending;
      bundle.pvPurchaseGate='blocked_missing_absolute_pv_isc';
      return bundle;
    });
  };
  composer.__seGrowattPVGuardV1=true;
})();
