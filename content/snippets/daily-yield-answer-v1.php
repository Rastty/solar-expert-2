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
