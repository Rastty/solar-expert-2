/** Existing daily yield guide: direct answer and corrected legacy production statements. */
function solar_expert_daily_yield_answer_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || $post->post_name!=='kolik-vyrobi-fotovoltaika-za-den' || strpos($content,'data-se-daily-yield-answer-v1')!==false) return $content;
    $old=array(
      'Průměrně se dá říct, že jeden fotovoltaický panel o rozloze 1 m2 vyrobí přibližně 5 kWh energie za den.',
      'Pro pokrytí běžné spotřeby rodinného domu se doporučuje instalace 10 až 20 fotovoltaických panelů.',
      'Pro malé rekreační chaty nebo garáže může být dostačující pouze 1 nebo 2 panely.',
      'V průměru však fotovoltaický systém o výkonu 1 kWp by mohl vyprodukovat zhruba od 3 do 5 kWh elektřiny za den, pokud jsou podmínky pro sluneční svit optimální.'
    );
    $new=array(
      'Denní výroba se odhaduje z jmenovitého výkonu panelů v kWp, dopadajícího záření a systémových ztrát; nelze univerzálně počítat 5 kWh z jednoho metru čtverečního panelu.',
      'Počet panelů pro rodinný dům stanovte z jejich skutečného výkonu, spotřeby domácnosti, střechy a měsíčního modelu výroby.',
      'Pro rekreační chatu či garáž použijte samostatný návrh podle denních Wh, sezóny a potřebné autonomie.',
      'Při modelových třech ekvivalentních hodinách plného slunce a faktoru 0,80 vychází 1 kWp na 2,4 kWh za den; roční ani zimní průměr z toho nelze odvodit bez místních dat.'
    );
    foreach($old as $phrase) if(substr_count($content,$phrase)!==1) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Co je fotovoltaika a jak funguje\?\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_DAILY_YIELD'
<section data-se-daily-yield-answer-v1="1" aria-labelledby="se-daily-yield-title" style="margin:22px 0;line-height:1.6;color:#142e2b">
<div style="padding:clamp(16px,4vw,25px);background:#eff8f5;border:1px solid #c9ddd9;border-radius:16px">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Praktický výpočet · denní výroba</p>
<h2 id="se-daily-yield-title" style="margin:8px 0;color:#142e2b">Kolik kWh vyrobí fotovoltaika 5, 8 nebo 10 kWp za den?</h2>
<p><strong>Při modelových třech ekvivalentních hodinách plného slunce a faktoru ztrát 0,80 vyrobí 5kWp elektrárna 12 kWh, 8kWp elektrárna 19,2 kWh a 10kWp elektrárna 24 kWh za den.</strong> To není roční průměr, typický zimní den ani předpověď. Výroba na konkrétní střeše závisí na lokalitě, sklonu, orientaci, stínu, teplotě a počasí.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px">
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>5 kWp</strong><p style="font-size:1.5rem;font-weight:700;color:#205d53;margin:4px 0">12 kWh</p><small>Model 3 hodin</small></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>8 kWp</strong><p style="font-size:1.5rem;font-weight:700;color:#205d53;margin:4px 0">19,2 kWh</p><small>Model 3 hodin</small></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>10 kWp</strong><p style="font-size:1.5rem;font-weight:700;color:#205d53;margin:4px 0">24 kWh</p><small>Model 3 hodin</small></div>
</div>
<p style="margin-bottom:0"><a class="se-btn se-btn-primary" href="/kolik-stoji-fotovoltaika/">Porovnat cenu domácí fotovoltaiky →</a> <a class="se-btn" href="/kolik-se-usetri-s-fotovoltaikou/">Spočítat hodnotu vlastní spotřeby →</a></p>
</div>
<p><strong>V tomto průvodci:</strong> <a href="#se-daily-yield-table">tabulka výkonů</a> · <a href="#se-daily-yield-season">léto a zima</a> · <a href="#se-daily-yield-use">výroba versus spotřeba</a> · <a href="#se-daily-yield-size">počet panelů</a></p>
<h3 id="se-daily-yield-table">Denní výroba od jednoho panelu po rodinný dům</h3>
<p>Orientační vzorec: <strong>denní kWh = výkon v kWp × ekvivalentní hodiny plného slunce × souhrnný faktor 0,80.</strong> Ekvivalentní hodiny nejsou délkou dne. Faktor 0,80 je zvolený pro jednoduché srovnání, nikoli výsledek měření nebo dodatečný koeficient pro již vypočítanou AC výrobu z PVGIS.</p>
<div role="region" aria-label="Modelová denní výroba fotovoltaiky" tabindex="0" style="overflow-x:auto;border:1px solid #c9ddd9;border-radius:10px"><table style="width:100%;min-width:420px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Výkon pole</th><th scope="col">1 h</th><th scope="col">3 h</th><th scope="col">5 h</th></tr></thead><tbody><tr><th scope="row">400 Wp</th><td>0,32</td><td>0,96</td><td>1,60</td></tr><tr><th scope="row">1 kWp</th><td>0,8</td><td>2,4</td><td>4,0</td></tr><tr><th scope="row">3 kWp</th><td>2,4</td><td>7,2</td><td>12,0</td></tr><tr><th scope="row">5 kWp</th><td>4,0</td><td>12,0</td><td>20,0</td></tr><tr><th scope="row">8 kWp</th><td>6,4</td><td>19,2</td><td>32,0</td></tr><tr><th scope="row">10 kWp</th><td>8,0</td><td>24,0</td><td>40,0</td></tr></tbody></table></div>
<p><small>Všechny výsledky v kWh/den, jde o ilustrační scénáře. Velmi slabý nebo zasněžený den může mít výrobu i nižší než první sloupec.</small></p>
<h3 id="se-daily-yield-season">Kolik vyrobí fotovoltaika v létě a v zimě?</h3>
<p>Evropský nástroj PVGIS počítá pro síťové systémy dlouhodobé měsíční průměry denní a roční výroby. Pro konkrétní český příklad uvádí <a href="https://teploplan.cz/fotovoltaika/baterie/" rel="noopener">výpočet Teploplan z PVGIS 5.3</a> pro 1 kWp, souřadnice 49,8° N, 15,5° E, jih, sklon 35°, zadané systémové ztráty 14 % a databázi SARAH3: 0,99 kWh denně v prosinci a 4,33 kWh denně v červnu, 1 055 kWh za rok. Jde o převzatý výsledek jednoho modelu, nikoli náš nezávislý výpočet ani český celostátní průměr.</p>
<div role="region" aria-label="Přepočet sezónního modelu" tabindex="0" style="overflow-x:auto;border:1px solid #c9ddd9;border-radius:10px"><table style="width:100%;min-width:420px;margin:0"><thead><tr><th scope="col">Pole</th><th scope="col">Prosinec kWh/den</th><th scope="col">Červen kWh/den</th><th scope="col">Roční průměr kWh/den</th></tr></thead><tbody><tr><th scope="row">5 kWp</th><td>4,95</td><td>21,65</td><td>14,45</td></tr><tr><th scope="row">8 kWp</th><td>7,92</td><td>34,64</td><td>23,12</td></tr><tr><th scope="row">10 kWp</th><td>9,90</td><td>43,30</td><td>28,90</td></tr></tbody></table></div>
<p>Naše přepočty vycházejí z uvedeného 1kWp příkladu prostým násobením výkonem a roční průměr z 1 055 × výkon / 365. Předpokládají stejnou specifickou výrobu a žádné další omezení střídače nebo přetoků. Skutečná výroba se může lišit. Vlastní lokalitu ověřte v <a href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-tools/grid-connected-pv_en" rel="noopener">oficiální metodice a nástroji PVGIS</a>; pro ostrovní sestavu použijte samostatný model s baterií. Podrobněji: <a href="/kolik-vyrobi-fotovoltaika-v-zime/">výroba v zimě</a> a <a href="/kolik-vyrobi-fotovoltaika-za-rok/">roční výroba</a>.</p>
<h3 id="se-daily-yield-use">Výroba 24 kWh neznamená úsporu 24 kWh</h3>
<p>Pokud modelově vyrobíte 24 kWh a přímo využijete 10 kWh, dalších 6 kWh uložíte a později získáte 5,4 kWh (90% modelová účinnost ukládání a následného využití), zbývá 8 kWh přetoku při povoleném výkupu. Při hypotetické hodnotě odebrané elektřiny 5 Kč/kWh a přetoku 1 Kč/kWh vychází 15,4 × 5 + 8 × 1 = <strong>85 Kč za tento den</strong> před fixními a dalšími náklady. Nejde o tarif ani příslib návratnosti. Záleží na skutečném souběhu spotřeby s výrobou a využití baterie.</p>
<section data-se-daily-yield-calc-v2="1" aria-labelledby="se-dyc-title" style="margin:22px 0;padding:clamp(16px,4vw,25px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:16px;line-height:1.55">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Interaktivní nástroj · vlastní spotřeba</p>
<h3 id="se-dyc-title" style="margin:8px 0;color:#142e2b">Kalkulačka denní výroby fotovoltaiky a hodnoty elektřiny</h3>
<p>Nejdříve spočítejte modelovou výrobu, pak její skutečné využití. Výpočet pracuje pouze s údaji, které zadáte; nejde o meteorologickou předpověď, simulaci konkrétní střechy ani aktuální tarif.</p>
<h4 style="margin:16px 0 8px">1. Výroba panelů</h4>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px"><label for="se-dyc-power" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Výkon panelů (kWp)<input id="se-dyc-power" type="number" min="0.05" max="100" step="any" value="10" inputmode="decimal" aria-describedby="se-dyc-power-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-power-help" style="font-weight:400;color:#455d56">0,45 kWp = panel 450 Wp</small></label>
<label for="se-dyc-sun" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Ekvivalentní hodiny slunce<input id="se-dyc-sun" type="number" min="0" max="12" step="any" value="3" inputmode="decimal" aria-describedby="se-dyc-sun-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-sun-help" style="font-weight:400;color:#455d56">Nejde o délku dne.</small></label>
<label for="se-dyc-factor" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Souhrnný faktor výroby (%)<input id="se-dyc-factor" type="number" min="1" max="100" step="any" value="80" inputmode="decimal" aria-describedby="se-dyc-factor-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-factor-help" style="font-weight:400;color:#455d56">Zahrnuje modelové systémové ztráty.</small></label></div>
<p style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="se-btn" data-dyc-sun="1" style="min-height:44px">Slabý den (1 h)</button><button type="button" class="se-btn" data-dyc-sun="3" style="min-height:44px">Model 3 h</button><button type="button" class="se-btn" data-dyc-sun="5" style="min-height:44px">Slunečný model (5 h)</button></p>
<div aria-live="polite" style="background:white;padding:14px;border:1px solid #c9ddd9;border-radius:12px"><small>Modelová denní AC výroba</small><p data-dyc-production style="font-size:clamp(25px,6vw,34px);font-weight:700;color:#205d53;margin:4px 0">24 kWh</p><p data-dyc-production-error role="alert" hidden style="color:#8f2929;font-weight:600"></p></div>
<h4 style="margin:18px 0 8px">2. Využití a hodnota vyrobené energie</h4>
<p>Zadejte pouze energii, kterou v daném dni využijete přímo nebo uložíte a později skutečně spotřebujete. Součet přímého využití a energie vložené do baterie nesmí překročit výrobu. Nevyužitý zbytek model označuje jako potenciální přetok; při nulových přetocích může být výroba omezena.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px"><label for="se-dyc-direct" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Přímo využitá výroba (kWh)<input id="se-dyc-direct" type="number" min="0" max="1200" step="any" value="10" inputmode="decimal" aria-describedby="se-dyc-direct-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-direct-help" style="font-weight:400;color:#455d56">Spotřeba souběžná s výrobou.</small></label>
<label for="se-dyc-charge" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Přebytky uložené do baterie (kWh)<input id="se-dyc-charge" type="number" min="0" max="1200" step="any" value="6" inputmode="decimal" aria-describedby="se-dyc-charge-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-charge-help" style="font-weight:400;color:#455d56">Energie před ztrátami ukládání.</small></label>
<label for="se-dyc-eff" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Účinnost uložení a využití (%)<input id="se-dyc-eff" type="number" min="1" max="100" step="any" value="90" inputmode="decimal" aria-describedby="se-dyc-eff-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-eff-help" style="font-weight:400;color:#455d56">Kolik uložené energie nahradí odběr.</small></label>
<label for="se-dyc-buy" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Ušetřený nákup (Kč/kWh)<input id="se-dyc-buy" type="number" min="0" max="100" step="any" value="5" inputmode="decimal" aria-describedby="se-dyc-buy-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-buy-help" style="font-weight:400;color:#455d56">Pouze ušetřené proměnné platby.</small></label>
<label for="se-dyc-sell" style="display:flex;flex-direction:column;gap:4px;font-weight:600">Čistý výkup (Kč/kWh)<input id="se-dyc-sell" type="number" min="0" max="100" step="any" value="1" inputmode="decimal" aria-describedby="se-dyc-sell-help" style="width:100%;min-height:48px;box-sizing:border-box;padding:9px;border:1px solid #8aaca5;border-radius:8px;background:#fff;color:#142e2b;font-size:16px"><small id="se-dyc-sell-help" style="font-weight:400;color:#455d56">Při neplaceném přetoku zadejte 0.</small></label></div>
<p style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="se-btn se-btn-primary" data-dyc-calculate style="min-height:44px">Přepočítat</button><button type="button" class="se-btn" data-dyc-reset style="min-height:44px">Obnovit příklad</button></p>
<p data-dyc-error role="alert" hidden style="color:#8f2929;font-weight:600"></p>
<div data-dyc-results aria-live="polite" aria-atomic="true" style="padding:14px;background:white;border:1px solid #c9ddd9;border-radius:12px">
<p style="margin:0">Hrubá hodnota výroby v tomto dni</p><p data-dyc-value style="font-size:clamp(25px,6vw,34px);font-weight:700;color:#205d53;margin:4px 0">85 Kč</p>
<div style="display:flex;width:100%;height:14px;border-radius:7px;overflow:hidden;background:#dce7e3;margin:10px 0" aria-hidden="true"><span data-dyc-bar="direct" style="width:41.6667%;background:#205d53"></span><span data-dyc-bar="recovered" style="width:22.5%;background:#5ba28c"></span><span data-dyc-bar="loss" style="width:2.5%;background:#a2aab0"></span><span data-dyc-bar="export" style="width:33.3333%;background:#d6a64c"></span></div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px">
<div><small>Přímo využito</small><p data-dyc-direct style="font-weight:700;margin:4px 0">10 kWh</p></div>
<div><small>Využito z baterie</small><p data-dyc-recovered style="font-weight:700;margin:4px 0">5,4 kWh</p></div>
<div><small>Ztráta při ukládání a využití</small><p data-dyc-loss style="font-weight:700;margin:4px 0">0,6 kWh</p></div>
<div><small>Potenciální přetok</small><p data-dyc-export style="font-weight:700;margin:4px 0">8 kWh</p></div></div>
<p data-dyc-breakdown style="font-size:.9em;margin:8px 0 0">Ušetřený nákup 77 Kč + čistý výkup 8 Kč. Před dalšími náklady; nejde o čistou úsporu ani denní příjem.</p>
</div>
<noscript><p>Pro vlastní přepočet povolte JavaScript; výše vidíte vzorové hodnoty. Vzorce jsou uvedeny níže.</p></noscript>
<details style="margin:14px 0"><summary style="cursor:pointer;font-weight:700">Vzorec a hranice výpočtu</summary><p>Výroba = kWp × ekvivalentní hodiny × souhrnný faktor. Využito z baterie = uložený přebytek × celková účinnost. Potenciální přetok = výroba − přímá spotřeba − uložený přebytek. Hrubá hodnota = (přímá spotřeba + využito z baterie) × ušetřená cena + potenciální přetok × čistý výkup. Pro již vypočítanou AC výrobu z PVGIS další systémový faktor nepoužívejte. Nezapočítáváme kapacitu a výkon baterie, hodinový profil, záporné/dynamické ceny, poplatky mimo zadané ceny, investici ani servis. Uložené kWh musí být později skutečně využité a prodej přetoků povolený. Výsledky nelze prostě násobit 365 jako roční úsporu. Zadané hodnoty tento nástroj nikam neodesílá.</p></details>
<p style="margin:0"><a class="se-btn se-btn-primary" href="/kdy-ma-smysl-fotovoltaika/#se-bic-title">Posoudit návratnost baterie →</a> <a class="se-btn" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve">Porovnat nabídku domovní FVE →</a></p>
</section>
<h3 id="se-daily-yield-size">Kolik panelů potřebuji na 5 nebo 10 kWp?</h3>
<p>Při výběru panelů o jmenovitém výkonu 450 Wp znamená 12 kusů 5,40 kWp, 18 kusů 8,10 kWp a 23 kusů 10,35 kWp. Nejde o instalační doporučení: rozměry, statika, stínění, kompatibilita stringů se střídačem a výkonové limity se kontrolují pro konkrétní projekt. Velikost elektrárny vybírejte podle hodinového profilu spotřeby, nikoli pouze podle roční faktury.</p>
<p style="padding:14px;background:#eff8f5;border:1px solid #c9ddd9;border-radius:10px"><strong>Další krok:</strong> pro rodinný dům si porovnejte <a href="/kolik-stoji-fotovoltaika/">cenu a rozsah dodávky</a>. Pro chatu bez sítě použijte <a href="/solarni-sestava-na-chatu/">návrh ostrovního systému</a> nebo <a href="/sady-pro-solarni-napajeni-kompletni-pruvodce/#se-complete-kit-offers-title">srovnání hotových sad</a>. Oba případy vyžadují jiný návrh.</p>
</section>
SE_DAILY_YIELD;
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$block.substr($content,$offset);
    return str_replace($old,$new,$content);
}
add_filter('the_content','solar_expert_daily_yield_answer_v1',20);

add_action('wp_footer',function(){
    $post=get_queried_object();
    if(!is_singular('post')||!($post instanceof WP_Post)||$post->post_name!=='kolik-vyrobi-fotovoltaika-za-den') return;
    echo <<<'SE_DYC_JS'
<script id="se-dyc-script-v2">
(function(){
'use strict';
function dailyValue(v){
 const inRange=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
 if(!inRange(v.power,.05,100)||!inRange(v.sun,0,12)||!inRange(v.factor,1,100))return null;
 const production=v.power*v.sun*v.factor/100;
 if(!inRange(v.direct,0,1200)||!inRange(v.charge,0,1200)||!inRange(v.eff,1,100)||!inRange(v.buy,0,100)||!inRange(v.sell,0,100))return {production,error:'values'};
 if(v.direct+v.charge>production+1e-8)return {production,error:'allocation'};
 const recovered=v.charge*v.eff/100,loss=v.charge-recovered,exported=Math.max(0,production-v.direct-v.charge),saved=(v.direct+recovered)*v.buy,feed=exported*v.sell;
 return {production,direct:v.direct,recovered,loss,export:exported,saved,feed,value:saved+feed};
}
const root=document.querySelector('[data-se-daily-yield-calc-v2]');
if(!root)return;
const keys=['power','sun','factor','direct','charge','eff','buy','sell'],input=Object.fromEntries(keys.map(k=>[k,root.querySelector('#se-dyc-'+k)]));
const error=root.querySelector('[data-dyc-error]'),pError=root.querySelector('[data-dyc-production-error]'),results=root.querySelector('[data-dyc-results]');
const number=(n,d=2)=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:d}).format(n);
function put(k,t){const n=root.querySelector('[data-dyc-'+k+']');if(n.textContent!==t)n.textContent=t;}
function calculate(){
 const v=Object.fromEntries(keys.map(k=>[k,input[k].valueAsNumber]));
 const out=dailyValue(v);
 keys.forEach(k=>input[k].setAttribute('aria-invalid',(!input[k].validity.valid||!Number.isFinite(v[k])||(out?.error==='allocation'&&['direct','charge'].includes(k)))?'true':'false'));
 pError.hidden=!!out;error.hidden=!out||!out.error;results.hidden=!out||!!out.error;
 put('production',out?number(out.production)+' kWh':'—');
 pError.textContent=out?'':'Zkontrolujte výkon, hodiny slunce a faktor výroby.';
 if(!out){error.textContent='';return;}
 if(out.error){error.textContent=out.error==='allocation'?'Přímá spotřeba a uložená energie převyšují výrobu o '+number(v.direct+v.charge-out.production)+' kWh. Snižte jejich součet nejvýše na '+number(out.production)+' kWh.':'Zkontrolujte hodnoty využití, účinnosti a cen; všechna pole musí být vyplněna v povoleném rozsahu.';return;}
 error.textContent='';
 put('value',number(out.value)+' Kč');
 for(const k of ['direct','recovered','loss','export']){put(k,number(out[k])+' kWh');root.querySelector('[data-dyc-bar="'+k+'"]').style.width=(out.production>0?100*out[k]/out.production:0)+'%';}
 put('breakdown','Ušetřený nákup '+number(out.saved)+' Kč + čistý výkup '+number(out.feed)+' Kč. Před dalšími náklady; nejde o čistou úsporu ani denní příjem.');
}
root.querySelectorAll('[data-dyc-sun]').forEach(b=>b.addEventListener('click',()=>{input.sun.value=b.dataset.dycSun;calculate();}));
root.querySelector('[data-dyc-calculate]').addEventListener('click',calculate);
root.querySelector('[data-dyc-reset]').addEventListener('click',()=>{keys.forEach(k=>input[k].value=input[k].defaultValue);calculate();});
keys.forEach(k=>input[k].addEventListener('input',calculate));
calculate();
})();
</script>
SE_DYC_JS;
},99);
