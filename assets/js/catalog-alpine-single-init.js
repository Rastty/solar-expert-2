/* Solar Expert live single catalog initialization, v1.
 * Alpine 3 automatically invokes component.init(). Older theme templates
 * also carry x-init="init()", causing a duplicate REST catalog request.
 * Remove ONLY that redundant attribute before Alpine starts; no engine,
 * offer URL, price, technical parameter, or catalog response is changed.
 */
(function(){
  'use strict';
  var allowed={
    'solarExpertBuilder()':true,
    'solarExpertBatterySelector()':true,
    'solarExpertMPPTSelector()':true,
    'solarExpertInverterSelector()':true
  };
  document.addEventListener('alpine:init',function(){
    var nodes=document.querySelectorAll('[x-data][x-init]');
    nodes.forEach(function(el){
      if(el.getAttribute('x-init')==='init()' &&
         Object.prototype.hasOwnProperty.call(allowed,el.getAttribute('x-data'))){
        el.removeAttribute('x-init');
        el.setAttribute('data-se-native-init-only','v1');
      }
    });
  },{once:true});
})();
