/** Scoped incremental battery economics calculator; no customer data collection or network calls. */
function solar_expert_battery_incremental_calculator_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1171 || $post->post_name!=='kdy-ma-smysl-fotovoltaika' || strpos($content,'data-se-battery-incremental-calc-v1')!==false) return $content;
    if(substr_count($content,'data-se-fve-investment-components-v1="1"')!==1) return $content;
    $pattern='~<h3(?:\s[^>]*)?>\s*Jak rozhodnout z vlastních dat\s*</h3>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_BATTERY_CALC'
<section data-se-battery-incremental-calc-v1="1" aria-labelledby="se-bic-title" style="margin:22px 0;padding:clamp(16px,4vw,25px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:16px;line-height:1.55">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Interaktivní nástroj · vlastní nabídka</p>
<h3 id="se-bic-title" style="margin:8px 0;color:#142e2b">Kalkulačka návratnosti baterie k fotovoltaice</h3>
<p>Porovnejte <strong>pouze příplatek za baterii</strong> proti jinak stejné FVE bez baterie. Zadejte své hodnoty; vzorové ceny jsou hypotetické, nikoli aktuální ceník. Výpočet probíhá v prohlížeči a zadané hodnoty nikam neposíláme.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px">
<label for="se-bic-energy" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Přebytky skutečně uložené za rok (kWh)<input id="se-bic-energy" type="number" min="0" max="100000" step="1" value="1500" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-bic-eff" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Účinnost uložení a využití (%)<input id="se-bic-eff" type="number" min="1" max="100" step="any" value="90" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-bic-buy" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Ušetřený nákup (Kč/kWh)<input id="se-bic-buy" type="number" min="0" max="100" step="any" value="5" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-bic-sell" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Čistý výkup přetoků (Kč/kWh)<input id="se-bic-sell" type="number" min="0" max="100" step="any" value="1" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-bic-price" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Příplatek za baterii (Kč)<input id="se-bic-price" type="number" min="0" max="10000000" step="1" value="80000" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-bic-cost" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Dodatečné roční náklady (Kč)<input id="se-bic-cost" type="number" min="0" max="1000000" step="1" value="1000" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
<label for="se-bic-years" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Cílová návratnost (roky)<input id="se-bic-years" type="number" min="1" max="40" step="any" value="10" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:7px;background:white;color:#142e2b"></label>
</div>
<p style="font-size:.9em">Uložené kWh jsou přebytky, které byste bez baterie prodali a které po ztrátách skutečně nahradí pozdější nákup elektřiny. Nejde o celou roční výrobu ani jmenovitou kapacitu baterie. Při nepovolených či neplacených přetocích zadejte 0 Kč/kWh, pokud by energie jinak neměla hodnotu; model nepokrývá záporné výkupní ceny a dynamické obchodování.</p>
<p style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="se-btn se-btn-primary" data-bic-calculate>Vypočítat návratnost</button><button type="button" class="se-btn" data-bic-reset>Obnovit vzorový příklad</button></p>
<p data-bic-error role="alert" hidden style="color:#9e2929;font-weight:600"></p>
<div data-bic-results aria-live="polite" aria-atomic="true" style="padding:14px;background:white;border:1px solid #c9ddd9;border-radius:12px">
<p style="margin:0">Čistý dodatečný přínos za rok</p><p data-bic-net style="font-size:1.65rem;font-weight:700;color:#205d53;margin:4px 0">4 250 Kč</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:10px">
<div><small>Prostá návratnost příplatku</small><p data-bic-payback style="font-weight:700;margin:4px 0">18,8 roku</p></div>
<div><small>Nejvyšší modelový příplatek při cíli</small><p data-bic-max style="font-weight:700;margin:4px 0">42 500 Kč</p></div>
<div><small>Potřebný roční vstup do baterie při cíli</small><p data-bic-required style="font-weight:700;margin:4px 0">2 572 kWh</p></div>
</div>
<p data-bic-breakdown style="font-size:.9em;margin:8px 0">Využito 1 350 kWh; ztráta 150 kWh; ušetřený nákup 6 750 Kč; ušlý výkup 1 500 Kč; náklady 1 000 Kč.</p>
<p data-bic-verdict style="font-weight:600;margin:0">Při těchto vstupech desetileté návratnosti nedosahujete.</p>
</div>
<noscript><p>Pro vlastní přepočet povolte JavaScript; výše je zobrazen vzorový výsledek. Vzorec je uveden níže.</p></noscript>
<details style="margin:14px 0"><summary style="cursor:pointer;font-weight:700">Jak kalkulačka počítá a co nezahrnuje</summary><p>Čistý přírůstek za rok = uložené kWh × (účinnost × ušetřený nákup − čistý výkup) − dodatečné náklady. Prostá návratnost = příplatek / kladný čistý přírůstek. Maximální příplatek pro cílovou návratnost = kladný čistý přírůstek × cílové roky. Potřebná energie se zaokrouhluje nahoru na celé kWh. Při nulovém nebo záporném přínosu není kladný příplatek prostě návratný. Model nezohledňuje časovou hodnotu peněz, změny cen, stárnutí, výměnu komponent, úvěr, dotace ani samostatnou užitnou hodnotu zálohy. Skutečné množství energie a možné ztráty odvoďte z hodinového profilu spotřeby a výroby, nikoli jen z roční faktury.</p></details>
<p style="margin-bottom:0"><a class="se-btn se-btn-primary" href="/quote-checker/">Zkontrolovat rozsah nabídky →</a> <a class="se-btn" href="/kolik-stoji-fotovoltaika/">Porovnat ceny FVE →</a></p>
</section>
SE_BATTERY_CALC;
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_battery_incremental_calculator_v1',22);
add_action('wp_footer',function(){
    $post=get_queried_object();
    if(!is_singular('post')||!($post instanceof WP_Post)||(int)$post->ID!==1171||$post->post_name!=='kdy-ma-smysl-fotovoltaika') return;
    echo <<<'SE_BIC_JS'
<script id="se-bic-script-v1">
(function(){
"use strict";
function batteryEconomics(v){
    const values=[v.energy,v.eff,v.buy,v.sell,v.price,v.cost,v.years];
    if(!values.every(Number.isFinite)||v.energy<0||v.energy>100000||v.eff<1||v.eff>100||v.buy<0||v.buy>100||v.sell<0||v.sell>100||v.price<0||v.price>10000000||v.cost<0||v.cost>1000000||v.years<1||v.years>40) return null;
    const useful=v.energy*v.eff/100,loss=v.energy-useful,saved=useful*v.buy,foregone=v.energy*v.sell,margin=v.eff/100*v.buy-v.sell,net=saved-foregone-v.cost;
    return {useful,loss,saved,foregone,net,payback:net>0?v.price/net:null,max:Math.max(0,net*v.years),required:margin>0?Math.ceil(Math.max(0,(v.price/v.years+v.cost)/margin)):null,meets:net>0&&v.price/net<=v.years};
}
const root=document.querySelector('[data-se-battery-incremental-calc-v1="1"]');
if(!root)return;
const keys=['energy','eff','buy','sell','price','cost','years'];
const input=Object.fromEntries(keys.map(k=>[k,root.querySelector('#se-bic-'+k)]));
const error=root.querySelector('[data-bic-error]'),results=root.querySelector('[data-bic-results]');
const number=(n,d=0)=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:d,minimumFractionDigits:0}).format(n);
const money=n=>number(n)+' Kč';
function show(k,s){root.querySelector('[data-bic-'+k+']').textContent=s;}
function calculate(){
    const invalid=keys.filter(k=>!input[k].validity.valid||!Number.isFinite(input[k].valueAsNumber));
    keys.forEach(k=>input[k].setAttribute('aria-invalid',invalid.includes(k)?'true':'false'));
    const v=Object.fromEntries(keys.map(k=>[k,input[k].valueAsNumber]));
    const out=invalid.length?null:batteryEconomics(v);
    error.hidden=!!out; results.hidden=!out;
    if(!out){error.textContent='Vyplňte všechny hodnoty v povoleném rozsahu. Účinnost 1–100 %, cílový horizont 1–40 let; ceny a energie nesmí být záporné.';return;}
    error.textContent='';
    show('net',money(out.net));
    show('payback',out.payback===null?'Bez kladné prosté návratnosti':number(out.payback,1)+' r.');
    show('max',money(out.max));
    show('required',out.required===null?'Nedosažitelné při zadaných cenách':number(out.required)+' kWh');
    show('breakdown','Využito '+number(out.useful,1)+' kWh; ztráta '+number(out.loss,1)+' kWh; ušetřený nákup '+money(out.saved)+'; ušlý výkup '+money(out.foregone)+'; náklady '+money(v.cost)+'.');
    show('verdict',out.meets?'V jednoduchém modelu splňujete cílovou návratnost. Ověřte životnost a skutečný průtok energie.':out.net<=0?'Při těchto vstupech baterie nepřináší kladný čistý roční přínos.':'Při těchto vstupech cílové návratnosti nedosahujete.');
}
root.querySelector('[data-bic-calculate]').addEventListener('click',calculate);
root.querySelector('[data-bic-reset]').addEventListener('click',()=>{keys.forEach(k=>{input[k].value=input[k].defaultValue;});calculate();});
keys.forEach(k=>input[k].addEventListener('change',calculate));
calculate();
})();
</script>
SE_BIC_JS;
},99);
