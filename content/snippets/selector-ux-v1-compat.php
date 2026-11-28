/** Progressive enhancement of three existing selectors. Read-only Alpine state; no ranking changes. Compat revision 20261128. */
function solar_expert_selector_ux_v1_scope() {
    return !is_admin() && is_page(array('vyber-baterii','vyber-menice','mppt-kalkulacka'));
}
add_action('wp_head',function(){
    if(!solar_expert_selector_ux_v1_scope()) return;
    echo <<<'SE_SUX_CSS'
<style id="se-selector-ux-v1-css" data-revision="compat-20261128">
[data-se-selector-ux-v1] {min-width:0;overflow-wrap:anywhere}
[data-se-selector-ux-v1] .se-sux-nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
[data-se-selector-ux-v1] .se-sux-nav a{display:flex;align-items:center;gap:7px;min-height:44px;padding:8px 12px;border:1px solid #c9ddd9;border-radius:10px;background:#fff;color:#164e43;font-weight:700;font-size:14px;text-decoration:none}
[data-se-selector-ux-v1] .se-sux-nav a span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#205d53;color:#fff;flex:none}
[data-se-selector-ux-v1] .se-sux-section{font-size:clamp(19px,4vw,23px);line-height:1.25;color:#142e2b;margin:24px 0 10px;scroll-margin-top:100px}
[data-se-selector-ux-v1] .se-sux-help{font-size:13px!important;line-height:1.45;color:#455d56!important;margin:6px 0 0}
[data-se-selector-ux-v1] .se-formgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
[data-se-selector-ux-v1] .se-field{min-width:0}
[data-se-selector-ux-v1] .se-field label{font-size:14px;line-height:1.4}
[data-se-selector-ux-v1] .se-field input,[data-se-selector-ux-v1] .se-field select{min-height:48px;box-sizing:border-box;font-size:16px;max-width:100%;border-color:#8aaca5}
[data-se-selector-ux-v1] .se-selector-examples .se-actions,[data-se-selector-ux-v1] [data-se-power-presets] .se-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
[data-se-selector-ux-v1] .se-selector-examples button,[data-se-selector-ux-v1] [data-se-power-presets] button{min-height:48px;white-space:normal;line-height:1.4;text-align:left;width:100%;font-size:14px}
[data-se-selector-ux-v1] .se-sux-summary{margin:18px 0;padding:16px;background:#eff8f5;border:1px solid #a9cfc2;border-radius:14px;color:#142e2b}
[data-se-selector-ux-v1] .se-sux-summary h3{margin:0 0 10px;font-size:19px;color:#142e2b}
[data-se-selector-ux-v1] .se-sux-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px}
[data-se-selector-ux-v1] .se-sux-metric{min-width:0;padding:12px;background:#fff;border:1px solid #c9ddd9;border-radius:10px}
[data-se-selector-ux-v1] .se-sux-metric small{display:block;color:#455d56;line-height:1.4;font-weight:600}
[data-se-selector-ux-v1] .se-sux-metric strong{display:block;margin-top:4px;color:#205d53;font-size:clamp(18px,4.5vw,25px);line-height:1.2}
[data-se-selector-ux-v1] .se-sux-status{margin:12px 0 6px;font-size:15px!important;font-weight:700;color:#142e2b!important}
[data-se-selector-ux-v1] .se-sux-next{display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin:8px 0 0;white-space:normal;text-align:center}
[data-se-selector-ux-v1] .se-sux-summary[data-state="invalid"] .se-sux-status,[data-se-selector-ux-v1] .se-sux-summary[data-state="error"] .se-sux-status{color:#8f2929!important}
[data-se-selector-ux-v1] .se-bundles{grid-template-columns:minmax(0,1fr);gap:14px}
[data-se-selector-ux-v1][data-se-sux-state="invalid"] .se-bundles,[data-se-selector-ux-v1][data-se-sux-state="invalid"] [data-se-24v-high-current],[data-se-selector-ux-v1][data-se-sux-state="invalid"] [data-se-inverter-24v-candidate]{display:none!important}
[data-se-selector-ux-v1] .se-bundle{min-width:0;padding:16px;border:1px solid #bdd2ca}
[data-se-selector-ux-v1] .se-bundle-head{flex-wrap:wrap;align-items:flex-start}
[data-se-selector-ux-v1] .se-bundle-head>strong{min-width:0;overflow-wrap:anywhere}
[data-se-selector-ux-v1] .se-bundle .se-offer-links{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
[data-se-selector-ux-v1] .se-bundle .se-offer{display:flex;flex-wrap:wrap;min-height:48px;width:100%;box-sizing:border-box;justify-content:space-between;line-height:1.4;white-space:normal}
[data-se-selector-ux-v1] .se-bundle .se-offer-cta{font-size:13px;white-space:normal}
[data-se-selector-ux-v1] a:focus-visible,[data-se-selector-ux-v1] button:focus-visible,[data-se-selector-ux-v1] input:focus-visible,[data-se-selector-ux-v1] select:focus-visible,[data-se-selector-ux-v1] [tabindex="-1"]:focus-visible{outline:3px solid #287b66;outline-offset:3px}
@media(max-width:600px){
 [data-se-selector-ux-v1]{padding:16px}
 [data-se-selector-ux-v1] .se-formgrid{grid-template-columns:minmax(0,1fr)}
 [data-se-selector-ux-v1] .se-selector-examples .se-actions,[data-se-selector-ux-v1] [data-se-power-presets] .se-actions{grid-template-columns:minmax(0,1fr)}
 [data-se-selector-ux-v1] .se-sux-next{width:100%;box-sizing:border-box}
}
</style>
SE_SUX_CSS;
},99);
add_action('wp_enqueue_scripts',function(){
    if(!solar_expert_selector_ux_v1_scope() || !wp_script_is('solar-expert-selectors','enqueued')) return;
    $js=<<<'SE_SUX_JS'
(function(){
'use strict';
const configurations={
'/vyber-baterii/':{root:'solarExpertBatterySelector()',kind:'battery',inputTitle:'1. Zadejte spotřebu a napětí',metrics:[['Potřebná nominální energie','requiredBatteryKwh','kWh',1],['Orientační trvalý proud BMS','requiredDischargeA','A',0]],help:{'se-battery-daily-kwh':'Např. 700 Wh = 0,7 kWh. Zahrňte vlastní odběr zdroje, pokud již není započtený.','se-battery-inverter-w':'Nezaměňujte denní energii a okamžitý výkon. Ověřte skutečný příkon a rozběh.','se-battery-voltage':'Použijte napětí svého měniče nebo DC systému; neměňte jej jen kvůli výsledku.'},gap:'/jakou-baterii-k-menici-2000w/',gapLabel:'Jak vybrat baterii podle výkonu měniče'},
'/vyber-menice/':{root:'solarExpertInverterSelector()',kind:'inverter',inputTitle:'1. Zadejte výkon a DC napětí',metrics:[['Trvalý výkon','continuousW','W',0],['Rozběhová špička','peakW','W',0],['Orientační DC proud trvale','requiredDcA','A',0]],help:{'se-inverter-voltage':'Napětí musí odpovídat bateriovému systému.','se-inverter-continuous':'Sečtěte spotřebiče, které budou běžet současně.','se-inverter-peak':'Zjistěte rozběhovou špičku a její trvání z dokumentace spotřebičů.'},gap:'/jakou-baterii-k-menici-3000w/',gapLabel:'Prověřit napájení výkonného měniče'},
'/mppt-kalkulacka/':{root:'solarExpertMpptSelector()',kind:'mppt',inputTitle:'1. Zadejte parametry panelů',metrics:[['Výkon celého pole','panelWp','Wp',0],['Modelové Voc za mrazu','coldStringVoc','V',1],['Celkové návrhové Isc','arrayIsc','A',2]],help:{'se-mppt-panel-voc':'Napětí naprázdno jednoho panelu podle datasheetu.','se-mppt-panel-vmp':'Napětí jednoho panelu v bodě maximálního výkonu.','se-mppt-panel-isc':'Návrhový zkratový proud jednoho panelu včetně potřebných součinitelů.','se-mppt-series-count':'Série zvyšuje napětí; počítejte panely v jedné větvi.','se-mppt-parallel-count':'Paralelní větve zvyšují celkový proud Isc.'},gap:'/jak-vybrat-mppt-regulator-pro-400w-panel/#se-mppt-offer-title',gapLabel:'Přečíst si příklady výběru MPPT'}
};
const cfg=configurations[location.pathname];if(!cfg)return;
function mount(){
 const root=document.querySelector('[x-data="'+cfg.root+'"]'),alpine=window.Alpine;
 if(!root||root.hasAttribute('data-se-selector-ux-v1')||!alpine||typeof alpine.$data!=='function'||typeof alpine.effect!=='function')return;
 const s=alpine.$data(root),form=root.querySelector('.se-formgrid'),bundles=root.querySelector('.se-bundles');
 if(!s||!form||!bundles||!Array.isArray(s.matches)||!cfg.metrics.every(m=>m[1] in s))return;
 // The live legacy battery selector exposes these four inputs, but not inputValid.
 // Only derive UI validity; never modify its state or electrical matcher.
 const legacyBattery=cfg.kind==='battery'&&!('inputValid' in s)&&['voltage','dailyKwh','autonomy','inverterW'].every(k=>k in s);
 if(!legacyBattery&&!('inputValid' in s))return;
 const isValid=()=>legacyBattery?([12,24,48].includes(Number(s.voltage))&&[s.dailyKwh,s.autonomy,s.inverterW].every(v=>Number.isFinite(Number(v))&&Number(v)>0)):s.inputValid===true;
 const resultNames={battery:'Doporučené baterie',inverter:'Doporučené měniče',mppt:'Předběžně vyhovující MPPT regulátory'};
 const resultRow=Array.from(root.querySelectorAll('.se-row')).find(el=>el.querySelector('h3')?.textContent.trim()===resultNames[cfg.kind]);
 if(!resultRow||resultRow.parentElement!==root||form.parentElement!==root)return;
 function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 const inputId='se-sux-'+cfg.kind+'-inputs',summaryId='se-sux-'+cfg.kind+'-summary',resultsId='se-sux-'+cfg.kind+'-results';
 if([inputId,summaryId,resultsId].some(id=>document.getElementById(id)))return;
 root.setAttribute('data-se-selector-ux-v1',cfg.kind);
 const nav=el('nav',null,'se-sux-nav');nav.setAttribute('aria-label','Kroky výběru');
 for(const [i,id,label] of [[1,inputId,'Zadání'],[2,summaryId,'Výpočet'],[3,resultsId,'Nabídky']]){
  const a=el('a');a.href='#'+id;a.append(el('span',String(i)),document.createTextNode(label));nav.append(a);
 }
 const nativeTitle=Array.from(root.children).find(n=>n.tagName==='H2');
 if(nativeTitle)nativeTitle.after(nav);else root.prepend(nav);
 const heading=el('h3',cfg.inputTitle,'se-sux-section');heading.id=inputId;heading.tabIndex=-1;form.before(heading);
 for(const [id,help] of Object.entries(cfg.help)){
  const input=root.querySelector('#'+id);if(!input||!input.parentElement)continue;
  const hint=el('p',help,'se-sux-help');hint.id=id+'-ux-help';
  input.parentElement.append(hint);
  input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+hint.id).trim());
 }
 const summary=el('section',null,'se-sux-summary');summary.id=summaryId;summary.setAttribute('aria-labelledby',summaryId+'-heading');summary.tabIndex=-1;
 const title=el('h3','2. Váš výpočet');title.id=summaryId+'-heading';
 const metrics=el('div',null,'se-sux-metrics');
 const values=cfg.metrics.map(m=>{const box=el('div',null,'se-sux-metric'),value=el('strong','—');box.append(el('small',m[0]),value);metrics.append(box);return value;});
 const status=el('p','Načítám výsledek…','se-sux-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const detail=el('p','Výsledek je orientační, nikoli schválení sestavy.','se-sux-help');
 const next=el('a','Přejít na výsledky ↓','se-btn se-btn-primary se-sux-next');next.href='#'+resultsId;
 const guide=el('p',null,'se-sux-help');const g=el('a',cfg.gapLabel);g.href=cfg.gap;guide.append(document.createTextNode('Další možnost: '),g);guide.hidden=true;
 summary.append(title,metrics,status,detail,next,guide);form.after(summary);
 const resultHeading=resultRow.querySelector('h3');resultHeading.id=resultsId;resultHeading.tabIndex=-1;resultHeading.classList.add('se-sux-section');
 resultHeading.textContent='3. '+resultHeading.textContent;
 function focusOnAnchor(e){
  const href=e.currentTarget.getAttribute('href');
  if(!href||!href.startsWith('#'))return;
  const dest=document.getElementById(href.slice(1));if(!dest)return;
  // Native anchor navigation retains history, keyboard focus follows the destination.
  dest.focus({preventScroll:true});
 }
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',focusOnAnchor));next.addEventListener('click',focusOnAnchor);
 function put(n,t){if(n.textContent!==t)n.textContent=t;}
 const fmt=(n,d)=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:d}).format(n);
 alpine.effect(()=>{
  const valid=isValid(),loading=!!s.catalogLoading,error=!!s.catalogError,count=Array.isArray(s.matches)?s.matches.length:0;
  cfg.metrics.forEach((m,i)=>{const n=Number(s[m[1]]);put(values[i],valid&&Number.isFinite(n)?fmt(n,m[3])+' '+m[2]:'—');});
  let state='ready',message='',hint='Výsledek je orientační; ověřte konkrétní parametry, nabídku a odborný návrh.';
  if(!valid){state='invalid';message='Upravte neplatné vstupy.';hint='Dokud nejsou hodnoty platné, nevybírejte produkt.';}
  else if(loading){state='loading';message='Načítám katalog…';}
  else if(error){state='error';message='Katalog se nepodařilo načíst.';hint='Obnovte stránku; neplatná doporučení nezobrazujeme.';}
  else if(!count){state='empty';message='V hlavním katalogu není odpovídající model.';hint='Může jít o omezení katalogu. Zkontrolujte vstupy a případné další kandidáty; neupravujte bezpečnostní limity jen kvůli nákupu.';}
  else{message='Modely v hlavním výběru: '+count;hint='Porovnejte technické parametry a jednotlivé nabídky; aktuální cenu a dostupnost ověřte u prodejce.';}
  summary.setAttribute('data-state',state);root.setAttribute('data-se-sux-state',state);put(status,message);put(detail,hint);
  put(next,count&&state==='ready'?'Zobrazit '+count+' výsledků ↓':'Přejít na výsledky ↓');
  guide.hidden=state!=='empty';
 });
}
document.addEventListener('alpine:initialized',mount,{once:true});
if(document.readyState!=='loading'&&window.Alpine)mount();
})();
SE_SUX_JS;
    wp_add_inline_script('solar-expert-selectors',$js,'after');
},100001);
