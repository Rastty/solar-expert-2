/** Decision-first battery runtime and cycle-life guide; exact existing post only. */
function solar_expert_battery_runtime_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1168 || $post->post_name!=='jak-dlouho-vydrzi-baterie-fotovoltaika' || strpos($content,'data-se-battery-runtime-v1')!==false) return $content;
    $block=<<<'SE_BATTERY_RUNTIME'
<section data-se-battery-runtime-v1="1" aria-labelledby="se-battery-runtime-heading" style="margin:1rem 0 2rem;line-height:1.6">
<div style="padding:clamp(16px,4vw,28px);border:1px solid #c9ddd9;border-radius:16px;background:#eff8f5;color:#142e2b">
<p style="margin:0 0 6px;font-size:.85em;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#205d53">Průvodce výběrem baterie</p>
<h2 id="se-battery-runtime-heading" style="margin:0 0 12px;color:#142e2b">Jak dlouho vydrží baterie 5, 10 nebo 15 kWh?</h2>
<p style="margin:0 0 16px"><strong>10kWh baterie při stálém odběru 500 W vydrží modelově 14,4 hodiny.</strong> Počítáme s plně nabitou novou baterií, 80 % využitelného rozsahu a 90 % účinností měniče, bez dobíjení. Skutečná výdrž závisí na nabití, stáří a spotřebě.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px">
<div style="background:#fff;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong style="display:block;color:#205d53">5 kWh</strong><span style="display:block;font-size:1.65rem;font-weight:700;color:#142e2b">7,2 h</span><small>3,6 kWh pro spotřebiče</small><span aria-hidden="true" style="display:block;height:6px;margin-top:8px;border-radius:9px;background:#dcece7"><span style="display:block;width:33.33%;height:100%;border-radius:9px;background:#287b66"></span></span></div>
<div style="background:#fff;border:2px solid #287b66;border-radius:12px;padding:13px"><strong style="display:block;color:#205d53">10 kWh</strong><span style="display:block;font-size:1.65rem;font-weight:700;color:#142e2b">14,4 h</span><small>7,2 kWh pro spotřebiče</small><span aria-hidden="true" style="display:block;height:6px;margin-top:8px;border-radius:9px;background:#dcece7"><span style="display:block;width:66.67%;height:100%;border-radius:9px;background:#287b66"></span></span></div>
<div style="background:#fff;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong style="display:block;color:#205d53">15 kWh</strong><span style="display:block;font-size:1.65rem;font-weight:700;color:#142e2b">21,6 h</span><small>10,8 kWh pro spotřebiče</small><span aria-hidden="true" style="display:block;height:6px;margin-top:8px;border-radius:9px;background:#dcece7"><span style="display:block;width:100%;height:100%;border-radius:9px;background:#287b66"></span></span></div>
</div>
<p style="margin:10px 0 0;font-size:.9em">Srovnání při celkovém modelovém odběru 500 W, včetně energetického ekvivalentu klidové spotřeby měniče.</p>
<p style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0"><a class="se-btn se-btn-primary" href="/vyber-baterii/">Vybrat baterii podle spotřeby →</a><a class="se-btn" href="/kolik-stoji-fotovoltaika/">Porovnat domovní FVE →</a></p>
</div>
<nav aria-label="Obsah průvodce výdrží" style="margin:18px 0;padding:14px;border:1px solid #d5dfdc;border-radius:12px"><strong>V tomto průvodci</strong><ul style="margin-bottom:0"><li><a href="#se-runtime-table">Výdrž podle příkonu</a></li><li><a href="#se-runtime-real">Nabití, stáří a záloha při výpadku</a></li><li><a href="#se-runtime-cycles">Životnost v cyklech</a></li><li><a href="#se-runtime-buy">Jakou baterii koupit</a></li></ul></nav>
<h2 id="se-runtime-table">Výdrž baterie v hodinách: 5, 10 a 15 kWh</h2>
<p>Výdrž v hodinách = jmenovitá kapacita v kWh × dostupný podíl nabití × stav kapacity (SoH) × účinnost měniče ÷ celkový odběr v kW. Zde SoH = 100 %, dostupný podíl = 80 % a účinnost = 90 %. Spotřeba je přepočtena na stranu 230 V včetně ztrát klidového provozu nezahrnutých v účinnosti.</p>
<div style="overflow-x:auto;border:1px solid #d5dfdc;border-radius:10px" role="region" aria-label="Tabulka výdrže baterie" tabindex="0"><table style="width:100%;min-width:420px;margin:0"><caption style="padding:8px;text-align:left">Model bez slunce, dobíjení a výpadků ochrany</caption><thead><tr style="background:#205d53;color:#fff"><th scope="col">Stálý odběr</th><th scope="col">5 kWh</th><th scope="col">10 kWh</th><th scope="col">15 kWh</th></tr></thead><tbody><tr><th scope="row">250 W</th><td>14,4 h</td><td>28,8 h</td><td>43,2 h</td></tr><tr style="background:#eff8f5;color:#142e2b"><th scope="row">500 W</th><td>7,2 h</td><td>14,4 h</td><td>21,6 h</td></tr><tr><th scope="row">1 000 W</th><td>3,6 h</td><td>7,2 h</td><td>10,8 h</td></tr><tr style="background:#eff8f5;color:#142e2b"><th scope="row">2 000 W</th><td>1,8 h</td><td>3,6 h</td><td>5,4 h</td></tr></tbody></table></div>
<p>Tabulka ukazuje energii, nikoli povolený výkon baterie. Než zapojíte vysoký odběr, ověřte trvalý i špičkový proud BMS, výkon měniče, teplotu a přesný model. Skutečná účinnost není konstantní.</p>
<h2 id="se-runtime-real">Co když je při výpadku baterie nabitá jen na 60 %?</h2>
<p>U nové 10kWh baterie s nastaveným minimem 20 % máte při 60% nabití k dispozici rozdíl 40 procentních bodů: 10 × 0,40 × 0,90 = 3,6 kWh na straně 230 V. Při odběru 500 W je to 7,2 h. Pokud má baterie už jen 80 % původní kapacity, zbývá modelově 2,88 kWh, tedy 5,76 h. Rezerva 20 % je pouze předpoklad; konkrétní nastavení určuje výrobce a návrh systému.</p>
<div style="padding:16px;border-left:4px solid #287b66;background:#eff8f5;color:#142e2b;border-radius:8px"><strong>Pozor: kapacita není záloha.</strong> Běžná síťová FVE se při výpadku sítě nemusí přepnout do ostrovního provozu. Ověřte podporu záložního výstupu, vybrané okruhy, výkon po jednotlivých fázích a možnost dobíjení z panelů v ostrovním režimu. Elektrické zapojení musí posoudit kvalifikovaný odborník.</div>
<h3>Kolik kapacity potřebujete na jednu noc?</h3>
<p>Pokud požadujete 12 hodin při průměrném celkovém odběru 350 W, potřebujete 4,2 kWh dodané energie. Při 80% dostupném rozsahu a 90% účinnosti vychází 5,83 kWh jmenovité kapacity nové baterie. Při modelovém SoH 80 % potřebujete přibližně 7,29 kWh. Zaokrouhlete nahoru a ověřte rozběhy i reálnou spotřebu. Pro denní cyklus počítejte také, zda se baterie stihne znovu nabít.</p>
<h2 id="se-runtime-cycles">Životnost baterie: cykly nejsou roky ani záruka</h2>
<p>Jedním z parametrů je hloubka vybití (DoD). Například technická dokumentace řady Victron Lithium Smart uvádí cyklickou životnost do hranice alespoň 80 % jmenovité kapacity: 2 500 cyklů při 80% DoD, 3 000 při 70% DoD a 5 000 při 50% DoD. Nejde o hodnoty všech LiFePO₄ baterií. <a href="https://www.victronenergy.com/media/pg/Lithium_Battery_Smart/en/technical-data.html" rel="noopener">Zdroj: technická data výrobce</a>.</p>
<p>Při hypotetických 250 cyklech ročně se stejnou hloubkou vybití by 2 500 cyklů odpovídalo deseti rokům čistě aritmeticky. Kalendářní stárnutí, teplota, proudové zatížení a podmínky záruky mohou skutečnou životnost zkrátit; částečné cykly také nelze bez přepočtu zaměňovat za plné ekvivalentní cykly. Konec cyklické životnosti v datasheetu nemusí znamenat náhlé selhání.</p>
<h3>Co porovnat v záruce</h3>
<ul><li>Počet let, cyklů či garantovanou celkovou dodanou energii v MWh a rozhodující limit.</li><li>Zbytkovou kapacitu na konci záruky a podmínky jejího měření.</li><li>Teplotu, maximální proud, povolené nabíjení a schválené měniče.</li><li>Zda lze přidávat nové moduly k původním a jaké jsou podmínky servisu.</li></ul>
<h2 id="se-runtime-buy">Jakou velikost baterie tedy koupit?</h2>
<p>Pro přesun denních přebytků do večera vycházejte ze skutečné večerní a noční spotřeby, nikoli pouze z výkonu panelů. Pro zálohu přidejte dobu výpadku a minimální očekávané nabití. Pro ostrovní sestavu zohledněte více dní bez výroby. Výhodnost větší baterie závisí na tom, kolik dodatečných kWh skutečně uložíte a později spotřebujete, ne jen na její ceně za kWh.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px;margin:16px 0">
<div style="padding:16px;border:1px solid #d5dfdc;border-radius:12px"><strong>Chata a ostrovní systém</strong><p>Navrhněte baterii, panely i měnič podle denní energie a rezervy.</p><a class="se-btn se-btn-primary" href="/solarni-sestava-na-chatu/">Navrhnout sestavu →</a></div>
<div style="padding:16px;border:1px solid #d5dfdc;border-radius:12px"><strong>Domovní síťová FVE</strong><p>Porovnejte cenu a nabídku včetně využitelné kapacity a záložního výstupu.</p><a class="se-btn" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve">Zkontrolovat nabídku →</a></div>
</div>
<h3>Časté dotazy</h3>
<p><strong>Vydrží 10 kWh celý den?</strong> V uvedeném modelu má 7,2 kWh využitelné energie na straně 230 V, takže při 300 W přibližně 24 hodin. Při 1 000 W jen 7,2 hodiny.</p>
<p><strong>Pomůže větší baterie v zimě?</strong> Prodlouží výdrž, ale nevytvoří energii. Pokud se dlouhodobě nedobíjí, deficit nevyřeší. Viz <a href="/kolik-vyrobi-fotovoltaika-v-zime/">zimní výroba fotovoltaiky</a>.</p>
<p><strong>Stačí znát kapacitu v Ah?</strong> Ne. Přibližná jmenovitá energie v Wh je napětí × Ah. Porovnávejte kWh a provozní limity, nikoli samotné Ah.</p>
</section>
SE_BATTERY_RUNTIME;
    return $block.$content;
}
add_filter('the_content','solar_expert_battery_runtime_v1',20);
