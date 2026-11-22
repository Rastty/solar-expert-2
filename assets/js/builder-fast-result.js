/* Solar Expert Builder: exact, reversible custom-appliance fast result v1.
 * WordPress Code Snippets inline extension. No local storage, no network,
 * no outside merchant requests, no price/offer/tech formula overrides.
 */
(function () {
  'use strict';
  var MARKER='v1';
  function mount() {
    var root=document.querySelector('#builder[x-data="solarExpertBuilder()"]');
    var alpine=window.Alpine;
    if(!root||!alpine||typeof alpine.$data!=='function')return false;
    if(root.querySelector('[data-se-builder-custom-fast="v1"]'))return true;
    var actions=root.querySelector('[x-show="step===2"] .se-actions');
    if(!actions)return false;
    var primary=actions.querySelector('button.se-btn-primary');
    var state=alpine.$data(root);
    if(!primary||!state||typeof state.calc!=='function'||
       typeof state.validateSelections!=='function'||
       typeof state.advanceToUsage!=='function'||
       !Array.isArray(state.appliances)||
       !String(primary.textContent||'').includes('Pokračovat'))return false;

    var fast=document.createElement('button');
    fast.type='button';
    fast.className='se-btn se-btn-primary';
    fast.textContent='Spočítat vlastní sestavu →';
    fast.setAttribute('data-se-builder-custom-fast',MARKER);
    fast.setAttribute('aria-describedby','se-builder-fast-defaults-v1');
    actions.insertBefore(fast,primary);

    // Preserve Alpine's original event handler, which still drives the
    // optional manual season and battery-autonomy form.
    primary.textContent='Upřesnit sezónu a rezervu →';
    primary.classList.remove('se-btn-primary');
    primary.type='button';
    primary.setAttribute('data-se-builder-advanced-choice','v1');

    var note=document.createElement('p');
    note.id='se-builder-fast-defaults-v1';
    note.className='se-muted';
    note.style.marginTop='10px';
    note.textContent='Rychlý výpočet: sezóna jaro–podzim a baterie na 1 den. Váš příkon, počet spotřebičů a doba provozu zůstanou beze změny. Pro jiné nastavení použijte Upřesnit sezónu a rezervu.';
    actions.insertAdjacentElement('afterend',note);

    function allowed() {
      return Boolean(state.selectedAppliances?.length) &&
        Number.isFinite(Number(state.dailyWh))&&Number(state.dailyWh)>0;
    }
    fast.disabled=!allowed();
    if(typeof alpine.effect==='function') {
      alpine.effect(function(){fast.disabled=!allowed();});
    }else {
      root.addEventListener('change',function(){fast.disabled=!allowed();});
      root.addEventListener('input',function(){fast.disabled=!allowed();});
    }
    fast.addEventListener('click',function(){
      if(!allowed())return;
      state.inputError=state.validateSelections();
      if(state.inputError){state.step=2;return;}
      // The user explicitly selected this documented default. Do not carry
      // a hidden stale manual peak from an earlier advanced edit.
      state.season='three';
      state.autonomy=1;
      state.manualPeak=null;
      // User-initiated PERSONALIZED calculation. Never call quickPreview()
      // or send synthetic tool, lead, affiliate or conversion events.
      state.calc(false);
      if(state.step!==4)return;
      var focusResult=function(){
        var heading=root.querySelector('h2[tabindex="-1"]');
        if(heading&&typeof heading.focus==='function'){
          heading.focus({preventScroll:true});
        }
      };
      if(typeof alpine.nextTick==='function')alpine.nextTick(focusResult);
      else Promise.resolve().then(focusResult);
    });
    return true;
  }
  document.addEventListener('alpine:initialized',mount,{once:true});
  if(document.readyState!=='loading'&&window.Alpine)mount();
})();
