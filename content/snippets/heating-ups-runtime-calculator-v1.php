/** Scoped UPS energy budget calculator, no network requests or stored inputs. */
function solar_expert_heating_ups_runtime_calculator_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || $post->post_name!=='zalozni-zdroj-pro-obehove-cerpadlo' || strpos($content,'data-se-ups-runtime-calc-v1')!==false) return $content;
    if(substr_count($content,'data-se-heating-ups-offers-v1="1"')!==1) return $content;
    $pattern='~<h3(?:\s[^>]*)?>\s*Co si nechat potvrdit před objednáním\s*</h3>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_UPS_CALC'
<section data-se-ups-runtime-calc-v1="1" aria-labelledby="se-urc-title" style="margin:22px 0;padding:clamp(16px,4vw,25px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:16px;line-height:1.55">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Interaktivní nástroj · záloha topení</p>
<h3 id="se-urc-title" style="margin:8px 0;color:#142e2b">Kalkulačka výdrže záložního zdroje a potřebné baterie</h3>
<p><strong>Kolik Ah potřebujete na 8, 12 nebo 24 hodin?</strong> Zadejte celkový měřený příkon čerpadla a případně kotle, požadovanou dobu zálohy a parametry baterie. Výsledek je energetický odhad, ne potvrzení bezpečného provozu. Výchozí hodnoty odpovídají výše uvedenému ilustračnímu 12V olověnému systému.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px">
<label for="se-urc-load" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Celkový příkon spotřebičů (W)<input id="se-urc-load" type="number" min="1" max="10000" step="any" value="40" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-hours" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Požadovaná záloha (hodin)<input id="se-urc-hours" type="number" min="0.5" max="168" step="any" value="12" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-volts" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Jmenovité napětí baterie (V)<input id="se-urc-volts" type="number" min="6" max="60" step="any" value="12" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-ah" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Kapacita vybrané baterie (Ah)<input id="se-urc-ah" type="number" min="1" max="5000" step="any" value="120" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-usable" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Využitelný podíl aktuální kapacity (%)<input id="se-urc-usable" type="number" min="1" max="100" step="any" value="50" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-health" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Zbývající kapacita proti nové (%)<input id="se-urc-health" type="number" min="1" max="100" step="any" value="100" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-eff" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Modelová účinnost konverze (%)<input id="se-urc-eff" type="number" min="1" max="100" step="any" value="90" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-urc-idle" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Samostatná vlastní spotřeba UPS (W)<input id="se-urc-idle" type="number" min="0" max="1000" step="any" value="15" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
</div>
<p style="font-size:.9em">Jmenovitá kapacita je údaj nové baterie. Zbývající kapacita zohledňuje například stárnutí; využitelný podíl pak pracovní rozsah a počáteční nabití. Pokud již změřená účinnost zahrnuje vlastní odběr zdroje, nezapočítejte ho podruhé. Napětí musí odpovídat konkrétnímu UPS; uvedený SinusPRO 800 E je 12V model a nepodporuje LiFePO₄.</p>
<p style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="se-btn se-btn-primary" data-urc-calculate>Vypočítat zálohu</button><button type="button" class="se-btn" data-urc-reset>Obnovit příklad</button></p>
<p data-urc-error role="alert" hidden style="color:#9e2929;font-weight:600"></p>
<div data-urc-results aria-live="polite" aria-atomic="true" style="padding:14px;background:white;border:1px solid #c9ddd9;border-radius:12px">
<p style="margin:0">Minimální modelová jmenovitá kapacita pro zvolenou dobu</p><p data-urc-required style="font-size:1.65rem;font-weight:700;color:#205d53;margin:4px 0">119 Ah</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px">
<div><small>Výdrž zadané baterie</small><p data-urc-runtime style="font-weight:700;margin:4px 0">12,1 h</p></div>
<div><small>Příkon z baterie v modelu</small><p data-urc-draw style="font-weight:700;margin:4px 0">59,4 W</p></div>
<div><small>Využitelná energie baterie</small><p data-urc-energy style="font-weight:700;margin:4px 0">720 Wh</p></div>
</div>
<p data-urc-verdict style="font-weight:600;margin:8px 0 0">Modelově dosahuje 12 hodin, ale rezerva je velmi malá.</p>
<p data-urc-margin style="font-size:.9em;margin:4px 0 0">Modelová časová rezerva: 0,1 h. Ověřte vybíjecí křivku a skutečný odběr.</p>
</div>
<noscript><p>Pro vlastní přepočet povolte JavaScript; výše vidíte vzorový výsledek pro 40 W a 120 Ah.</p></noscript>
<details style="margin:14px 0"><summary style="cursor:pointer;font-weight:700">Vzorec a hranice výpočtu</summary><p>Příkon z baterie = příkon AC / účinnost + samostatný klidový odběr. Využitelná energie = V × Ah × využitelný podíl × zbývající kapacita. Výdrž = využitelné Wh / příkon z baterie. Potřebná jmenovitá kapacita = příkon z baterie × cílové hodiny / (V × využitelný podíl × zbývající kapacita), zaokrouhleno nahoru. Model předpokládá konstantní odběr; nezohledňuje samostatně Peukertův jev u olova, závislost účinnosti na zatížení, mezní napětí, teplotu, proudové limity ani rozběh. Nepoužívejte výsledek jako náhradu technického návrhu.</p></details>
<p style="margin:0"><strong>Co dál:</strong> <a class="se-btn se-btn-primary" href="#se-heating-ups-offer-title">Porovnat konkrétní záložní sady →</a> <a class="se-btn" href="/vyber-baterii/">Další baterie →</a>. Zadané hodnoty tento nástroj nikam neodesílá. U kotle na tuhá paliva musí nezávisle zůstat zachovány výrobcem předepsané ochrany proti přehřátí.</p>
</section>
SE_UPS_CALC;
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_heating_ups_runtime_calculator_v1',22);
add_action('wp_footer',function(){
    $post=get_queried_object();
    if(!is_singular('post')||!($post instanceof WP_Post)||$post->post_name!=='zalozni-zdroj-pro-obehove-cerpadlo') return;
    echo <<<'SE_URC_JS'
<script id="se-urc-script-v1">
(function(){
"use strict";
function upsRuntime(v){
    const values=[v.load,v.hours,v.volts,v.ah,v.usable,v.health,v.eff,v.idle];
    if(!values.every(Number.isFinite)||v.load<1||v.load>10000||v.hours<0.5||v.hours>168||v.volts<6||v.volts>60||v.ah<1||v.ah>5000||v.usable<1||v.usable>100||v.health<1||v.health>100||v.eff<1||v.eff>100||v.idle<0||v.idle>1000)return null;
    const perAh=v.volts*v.usable/100*v.health/100,draw=v.load/(v.eff/100)+v.idle,energy=v.ah*perAh,runtime=energy/draw;
    return {draw,energy,runtime,required:Math.ceil(draw*v.hours/perAh),margin:runtime-v.hours,meets:runtime>=v.hours};
}
const root=document.querySelector('[data-se-ups-runtime-calc-v1]');
if(!root)return;
const keys=['load','hours','volts','ah','usable','health','eff','idle'];
const input=Object.fromEntries(keys.map(k=>[k,root.querySelector('#se-urc-'+k)]));
const error=root.querySelector('[data-urc-error]'),results=root.querySelector('[data-urc-results]');
const number=(n,d=0)=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:d}).format(n);
function show(k,s){root.querySelector('[data-urc-'+k+']').textContent=s;}
function calculate(){
    const invalid=keys.filter(k=>!input[k].validity.valid||!Number.isFinite(input[k].valueAsNumber));
    keys.forEach(k=>input[k].setAttribute('aria-invalid',invalid.includes(k)?'true':'false'));
    const v=Object.fromEntries(keys.map(k=>[k,input[k].valueAsNumber]));
    const out=invalid.length?null:upsRuntime(v);
    error.hidden=!!out;results.hidden=!out;
    if(!out){error.textContent='Vyplňte všechny hodnoty v povoleném rozsahu. Příkon a kapacita musí být kladné, procenta 1–100 a doba 0,5–168 hodin.';return;}
    error.textContent='';
    show('required',number(out.required)+' Ah');
    show('runtime',number(out.runtime,1)+' h');
    show('draw',number(out.draw,1)+' W');
    show('energy',number(out.energy,1)+' Wh');
    show('verdict',!out.meets?'Modelově cílové doby nedosahujete.':out.margin<v.hours*0.2?'Modelově dosahujete cílové doby, ale rezerva je malá.':'Modelově dosahujete cílové doby; nejde o zaručenou výdrž.');
    show('margin',(out.meets?'Modelová časová rezerva: ':'Chybějící doba: ')+number(Math.abs(out.margin),1)+' h. Ověřte vybíjecí křivku a skutečný odběr.');
}
root.querySelector('[data-urc-calculate]').addEventListener('click',calculate);
root.querySelector('[data-urc-reset]').addEventListener('click',()=>{keys.forEach(k=>{input[k].value=input[k].defaultValue;});calculate();});
keys.forEach(k=>input[k].addEventListener('change',calculate));
calculate();
})();
</script>
SE_URC_JS;
},99);
