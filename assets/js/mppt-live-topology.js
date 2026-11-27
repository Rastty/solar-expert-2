/* Port of reviewed dev MPPT selector + template at 2d197ebf20759d463b241b99e3584a6f8cff6eae; only the production MPPT page. */
(function(){
'use strict';
if(window.location.pathname!=='/mppt-kalkulacka/')return;
const markup="<div class=\"se-panel\" x-data=\"solarExpertMpptSelector()\" data-se-mppt-topology=\"v1\">\n  <div class=\"se-kicker\">Výběr MPPT regulátoru</div><h2>Vyberte regulátor podle FV pole</h2>\n  <div class=\"se-note\" style=\"margin-bottom:14px\"><strong>Upravte parametry svého pole.</strong> Hodnoty níže jsou jen výchozí příklad; výsledek se po každé změně přepočítá automaticky. Zadejte <strong>jmenovitý výkon jednoho panelu</strong>, počet panelů v sérii (S) a paralelních větví (P): celkový výkon pole spočítáme automaticky. Před výběrem potřebujete také <strong>Isc panelu</strong> z datasheetu.</div>\n  <div class=\"se-note\" x-show=\"articleExample\" x-cloak role=\"status\" data-se-article-example=\"mppt400\" style=\"margin-bottom:14px\">\n    <strong>Model z článku o regulátoru k 400W panelu (24V baterie).</strong>\n    Pro výpočet jsme předvyplnili ilustrační Voc 49 V, Vmp 40 V a Isc 11 A, jeden panel v sérii a jednu paralelní větev. <strong>Nejsou to parametry všech 400W panelů.</strong> Opište vlastní Voc, Vmp a Isc z datasheetu a ověřte minimální teplotu lokality.\n  </div>\n  <div class=\"se-note se-selector-examples\" data-se-selector-examples=\"mppt\" style=\"margin-bottom:14px\">\n    <strong>Nemáte zatím parametry? Vyzkoušejte ukázkové zapojení.</strong>\n    <p class=\"se-muted\">Voc, Vmp a Isc jsou modelové hodnoty, nikoli parametry libovolného 400W či 190W panelu. Před nákupem opište hodnoty z datasheetu svého panelu.</p>\n    <div class=\"se-actions\">\n      <button type=\"button\" class=\"se-btn\" @click=\"applyExample('single400')\">1 panel 400 W · 24 V baterie</button>\n      <button type=\"button\" class=\"se-btn\" @click=\"applyExample('pair190')\">2 panely po 190 W · 12 V baterie</button>\n      <button type=\"button\" class=\"se-btn\" @click=\"applyExample('pair400')\">2 × 400 Wp · 24 V · 1S2P</button>\n      <button type=\"button\" class=\"se-btn\" @click=\"applyExample('large3200')\">8 × 400 Wp · 48 V · 2S4P</button>\n    </div>\n  </div>\n  <div class=\"se-formgrid\">\n    <div class=\"se-field\"><label for=\"se-mppt-voltage\">Bateriový systém</label><select id=\"se-mppt-voltage\" class=\"se-select\" x-model.number=\"voltage\" @change=\"run()\"><option value=\"12\">12 V</option><option value=\"24\">24 V</option><option value=\"48\">48 V</option></select></div>\n    <div class=\"se-field\"><label for=\"se-mppt-panel-wp\">Výkon jednoho panelu (Wp)</label><input id=\"se-mppt-panel-wp\" class=\"se-input\" type=\"number\" min=\"1\" max=\"15000\" step=\"10\" x-model.number=\"panelUnitWp\" @input.debounce.200ms=\"run()\"></div>\n    <div class=\"se-field\"><label for=\"se-mppt-panel-voc\">Voc panelu (V)</label><input id=\"se-mppt-panel-voc\" class=\"se-input\" type=\"number\" min=\".1\" step=\".1\" x-model.number=\"panelVoc\" @input.debounce.200ms=\"run()\"></div>\n    <div class=\"se-field\"><label for=\"se-mppt-panel-vmp\">Vmp panelu (V)</label><input id=\"se-mppt-panel-vmp\" class=\"se-input\" type=\"number\" min=\".1\" step=\".1\" x-model.number=\"panelVmp\" @input.debounce.200ms=\"run()\"></div>\n    <div class=\"se-field\"><label for=\"se-mppt-panel-isc\">Isc jednoho panelu (A)</label><input id=\"se-mppt-panel-isc\" class=\"se-input\" type=\"number\" min=\".01\" max=\"250\" step=\".01\" x-model.number=\"panelIsc\" @input.debounce.200ms=\"run()\"></div>\n    <div class=\"se-field\"><label for=\"se-mppt-series-count\">Panelů v sérii (S)</label><input id=\"se-mppt-series-count\" class=\"se-input\" type=\"number\" min=\"1\" max=\"20\" step=\"1\" x-model.number=\"seriesCount\" @input.debounce.200ms=\"run()\"></div>\n    <div class=\"se-field\"><label for=\"se-mppt-parallel-count\">Počet paralelních stringů (P)</label><input id=\"se-mppt-parallel-count\" class=\"se-input\" type=\"number\" min=\"1\" max=\"20\" step=\"1\" x-model.number=\"parallelCount\" @input.debounce.200ms=\"run()\"></div>\n  </div>\n  <div class=\"se-note\" style=\"margin-top:14px\">\n    Jmenovitý výkon celého pole: <strong><span x-text=\"Number.isFinite(panelWp)?panelWp.toLocaleString('cs-CZ'):'—'\"></span> Wp</strong>\n    (<span x-text=\"Number(seriesCount)*Number(parallelCount)\"></span> panelů × <span x-text=\"panelUnitWp\"></span> Wp/panel, automaticky přepočítáno při změně S nebo P).\n    String Vmp: <strong><span x-text=\"stringVmp.toFixed(1)\"></span> V</strong> · konzervativní cold Voc (×1,12): <strong><span x-text=\"coldStringVoc.toFixed(1)\"></span> V</strong> ·\n    celkové Isc pole: <strong><span x-text=\"Number.isFinite(arrayIsc)?arrayIsc.toFixed(2):'—'\"></span> A</strong> ·\n    orientační nabíjecí proud s 25% výkonovou rezervou: <strong><span x-text=\"requiredChargeA\"></span> A</strong> (není to povinné minimum regulátoru).\n    Výběr hlídá výrobcem uvedený přípustný výkon pole pro zvolené napětí baterie, startovací MPPT napětí, rezervu pod maximálním Voc a Isc všech paralelních větví pod výrobcem uvedeným limitem s 2% bezpečnostní rezervou.\n    Regulátor s menším nabíjecím proudem může být podle výrobce pro daný výkon pole přípustný; svůj výstupní proud omezí. Isc na FV vstupu a nabíjecí proud baterie jsou <strong>dva rozdílné parametry</strong>. Výsledek není schválením zapojení. Použijte návrhový Isc jednoho panelu včetně potřebných proudových součinitelů a případného bifaciálního zisku. Fixní 1,12 a 2 % jsou pouze modelová kontrola, nikoli náhrada odborného výpočtu. Před nákupem ověřte přesný teplotní koeficient Voc, minimální teplotu, Vmp za horka, skutečné nabíjecí napětí a proudový limit baterie, jištění a konektory podle konkrétního projektu.\n  </div>\n  <div class=\"se-note se-note-error\" x-show=\"!inputValid\" style=\"margin-top:14px\" role=\"alert\">\n    Zkontrolujte vstupy: výkon jednoho panelu, Voc, Vmp a Isc musí být kladná konečná čísla, Voc vyšší než Vmp, počty panelů v sérii i paralelních větví celé kladné hodnoty a jejich součin nesmí překročit 15 000 Wp.\n  </div>\n  <div class=\"se-note\" x-show=\"catalogLoading\" style=\"margin-top:14px\" role=\"status\" aria-live=\"polite\">Načítám ověřený katalog MPPT regulátorů…</div>\n  <div class=\"se-note se-note-error\" x-show=\"catalogError\" style=\"margin-top:14px\" role=\"alert\">\n    Katalog MPPT se teď nepodařilo načíst. Obnovte stránku; nebudeme zobrazovat neověřené doporučení.\n  </div>\n  <div class=\"se-row\" style=\"margin-top:20px\"><h3 style=\"margin:0\">Předběžně vyhovující MPPT regulátory</h3><small class=\"se-muted\">podle modelových vstupů</small></div>\n  <p class=\"se-merchant-disclosure\" x-show=\"matches.some(r => SolarExpertAffiliate.sharedOperatorNotice(r.product))\" x-cloak>\n    Battery.cz a Solar-Import.cz provozuje stejná společnost Efteria, spol. s r.o. Porovnáváme nabídky jejích dvou webů, nikoliv dvou nezávislých prodejců.\n  </p>\n  <div class=\"se-bundles\" :aria-busy=\"catalogLoading ? 'true' : 'false'\" aria-live=\"polite\">\n    <template x-for=\"r in matches\" :key=\"r.product.id\">\n      <div class=\"se-bundle\">\n        <div class=\"se-bundle-head\">\n          <strong x-text=\"r.product.name\"></strong>\n          <strong x-show=\"SolarExpertProductMatcher.effectivePrice(r.product)<Number.MAX_SAFE_INTEGER\"><span x-text=\"SolarExpertProductMatcher.effectivePrice(r.product).toLocaleString('cs-CZ')\"></span> Kč</strong>\n        </div>\n        <div class=\"se-muted\"><span x-text=\"r.product.rated_charge_a\"></span> A · max Voc <span x-text=\"r.product.max_pv_voc_v\"></span> V</div>\n        <div class=\"se-offer-links\" style=\"margin-top:10px\">\n          <template x-for=\"o in SolarExpertAffiliate.offers(r.product).slice(0,3)\" :key=\"r.product.id+'-'+o.merchantId\">\n            <a class=\"se-offer\" target=\"_blank\" :href=\"o.href\"\n               :data-se-product-id=\"r.product.id\" :data-se-merchant=\"o.merchantId\" data-se-placement=\"mppt-selector\"\n               :rel=\"o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'\"\n               @click=\"SolarExpertAffiliate.trackOffer(r.product,o.raw,'mppt-selector')\">\n              <span x-text=\"o.merchant?.label\"></span><small class=\"se-offer-independent\" x-show=\"SolarExpertAffiliate.isIndependentAlternative(r.product,o.merchantId)\">Jiný provozovatel</small><small class=\"se-offer-best\" x-show=\"o.is_best_price && o.savings_vs_next_czk\">levnější z uvedených · o <span x-text=\"o.savings_vs_next_czk?.toLocaleString('cs-CZ')\"></span> Kč</small><strong x-show=\"o.price_czk\" x-text=\"o.price_czk?.toLocaleString('cs-CZ')+' Kč'\"></strong>\n              <span class=\"se-offer-cta\" x-text=\"o.price_czk ? 'Zobrazit nabídku ↗' : 'Ověřit cenu u prodejce ↗'\"></span>\n            </a>\n          </template>\n        </div>\n      </div>\n    </template>\n    <div x-show=\"!catalogLoading && !catalogError && inputValid && !matches.length\" class=\"se-note\">Žádný MPPT v ověřeném katalogu současně nesplňuje výrobcem povolený výkon FV pole, napěťové okno a bezpečný Isc vstupu. U 48V nebo větších polí může jít o mezeru našeho současného katalogu, ne o chybu vašeho návrhu.</div>\n  </div>\n</div>";
function install(){
 const root=document.querySelector('[x-data="solarExpertMpptSelector()"]');
 if(!root||root.hasAttribute('data-se-mppt-topology')||!root.querySelector('#se-mppt-panel-wp')||root.querySelector('#se-mppt-panel-isc'))return;
 const template=document.createElement('template');template.innerHTML=markup;
 const next=template.content.firstElementChild;
 if(!next||next.getAttribute('x-data')!=='solarExpertMpptSelector()')return;
 window.solarExpertMpptSelector=function(){return{
  voltage:24,panelUnitWp:190,panelVoc:25.5,panelVmp:21.8,panelIsc:9.17,seriesCount:2,parallelCount:2,coldFactor:1.12,catalog:[],matches:[],engagementTracked:false,catalogLoading:true,catalogError:false,pendingExample:false,articleExample:false,
  // Derived array power: changing topology cannot preserve a falsely low Wp total.
  get panelWp(){return Number(this.panelUnitWp)*Number(this.seriesCount)*Number(this.parallelCount);},
  get coldStringVoc(){return Number(this.panelVoc)*Number(this.seriesCount)*Number(this.coldFactor);},
  get stringVmp(){return Number(this.panelVmp)*Number(this.seriesCount);},
  get arrayIsc(){return Number(this.panelIsc)*Number(this.parallelCount);},
  get requiredChargeA(){const voltage=Math.max(1,Number(this.voltage));return Math.max(10,Math.ceil(((Number(this.panelWp)/voltage)*1.25)/5)*5);},
  get inputValid(){
    const numeric=[this.panelUnitWp,this.panelWp,this.panelVoc,this.panelVmp,this.panelIsc,this.seriesCount,this.parallelCount];
    return numeric.every(value=>Number.isFinite(Number(value))) &&
      [12,24,48].includes(Number(this.voltage)) &&
      Number(this.panelUnitWp)>0 && Number(this.panelUnitWp)<=15000 &&
      Number(this.panelWp)>0 && Number(this.panelWp)<=15000 &&
      Number(this.panelVoc)>0 && Number(this.panelVoc)<=600 &&
      Number(this.panelVmp)>0 && Number(this.panelVmp)<Number(this.panelVoc) &&
      Number(this.panelIsc)>0 && Number(this.panelIsc)<=250 &&
      Number.isInteger(Number(this.seriesCount)) && Number(this.seriesCount)>=1 && Number(this.seriesCount)<=20 &&
      Number.isInteger(Number(this.parallelCount)) && Number(this.parallelCount)>=1 && Number(this.parallelCount)<=20;
  },
  applyArticleExampleFromUrl(){
    // Immutable, illustrative 400 W / 24 V example ONLY; arbitrary URL
    // parameters may not change any electrical input or select a merchant.
    const search=window.location&&typeof window.location.search==='string'?window.location.search:'';
    if(new URLSearchParams(search).get('scenario')!=='mppt400')return;
    Object.assign(this,{voltage:24,panelUnitWp:400,panelVoc:49,panelVmp:40,panelIsc:11,seriesCount:1,parallelCount:1});
    this.articleExample=true;
  },
  applyExample(kind){
    // Illustrative datasheet-like electrical inputs, not manufacturer data for a particular module.
    const examples={
      single400:{voltage:24,panelUnitWp:400,panelVoc:49,panelVmp:40,panelIsc:11,seriesCount:1,parallelCount:1},
      pair190:{voltage:12,panelUnitWp:190,panelVoc:25.5,panelVmp:21.8,panelIsc:9.17,seriesCount:2,parallelCount:1},
      pair400:{voltage:24,panelUnitWp:400,panelVoc:49,panelVmp:40,panelIsc:11,seriesCount:1,parallelCount:2},
      large3200:{voltage:48,panelUnitWp:400,panelVoc:49,panelVmp:40,panelIsc:11,seriesCount:2,parallelCount:4}
    };
    const selection=examples[kind];
    if(!selection)return;
    Object.assign(this,selection);
    this.articleExample=false;
    if(this.catalogLoading||!this.catalog.length){this.pendingExample=true;return;}
    this.run(true);
  },
  async init(){
    this.applyArticleExampleFromUrl();
    this.catalogLoading=true;this.catalogError=false;
    try{this.catalog=await seCatalog();this.run(this.pendingExample);this.pendingExample=false;}
    catch(_){this.catalog=[];this.matches=[];this.catalogError=true;}
    finally{this.catalogLoading=false;}
  },
  run(track=true){
    if(!this.catalog.length||!this.inputValid){this.matches=[];return;}
    const voltage=Number(this.voltage),panelWp=Number(this.panelWp),mpptA=this.requiredChargeA;
    // The 25% charge-current estimate is buying guidance, NOT an electrical
    // rejection threshold. For example Victron explicitly rates its 100/20
    // for 580Wp at 24V, so a 400Wp array must not be rejected merely because
    // 400/24 * 1.25 rounds to 25A. The manufacturer's voltage-specific PV
    // power rating, absolute Isc, cold Voc and startup window are the gates.
    // Passing mpptA:0 keeps the shared Matcher/Builder policy unchanged.
    const s={voltage,panelWp,mpptA:0};
    this.matches=window.SolarExpertProductMatcher.rank(this.catalog.filter(p=>p.type==='mppt'),s)
      .filter(x=>{
        const p=x.product;
        const maxVoc=Number(p.max_pv_voc_v||0);
        const minVmp=Number((p.min_pv_start_v_by_voltage||{})[String(voltage)]||0);
        const maxIsc=Number(p.max_pv_isc_a||0);
        const auditedIsc={'mppt-victron-100-20':20,'mppt-victron-100-30':35,'mppt-victron-100-50':60,'mppt-victron-150-35':35,'mppt-victron-150-70':50,'mppt-victron-250-100':70};
        if(!Object.prototype.hasOwnProperty.call(auditedIsc,p.id)||maxIsc!==auditedIsc[p.id]||!String(p.max_pv_isc_source_url||'').startsWith('https://www.victronenergy.com/'))return false;
        const ratedChargeA=Number(p.rated_charge_a||0);
        const maxRatedWp=Number((p.max_pv_w_by_voltage||{})[String(voltage)]||0);
        // Series increases voltage, PARALLEL strings increase short-circuit
        // current. Never recommend a controller without audited Isc limit.
        // Preserve existing 2% guard margin from the full-system Builder.
        return ratedChargeA>0 && maxRatedWp>=panelWp && maxIsc>0 &&
          this.arrayIsc<=maxIsc*.98 &&
          this.coldStringVoc<maxVoc*.98 && this.stringVmp>=minVmp;
      })
      .slice(0,5);
    if(track){
      seTrackSelectorOnce(this,'mppt',{voltage,panelWp,requiredChargeA:mpptA,seriesCount:Number(this.seriesCount),parallelCount:Number(this.parallelCount),arrayIsc:this.arrayIsc,stringVmp:this.stringVmp,coldStringVoc:this.coldStringVoc});
      // Legacy production analytics does not implement seTrackSelectorOfferGap; preserve native event only.
    }
  }
};};
 // Only the old MPPT root is replaced before Alpine walks it; no x-init duplicate.
 root.replaceWith(next);
}
document.addEventListener('alpine:init',install,{once:true});
})();
