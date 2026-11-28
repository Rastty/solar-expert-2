/** Existing heat-pump shortlist: exact source-based cold-weather comparison and quote routing. */
function solar_expert_heatpump_frost_comparison_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || $post->post_name!=='nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu' || strpos($content,'data-se-heatpump-frost-comparison-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Shortlist současných vzduch–voda řad\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $lead='~<h2(?:\s[^>]*)?>\s*Nezávazná nabídka jako další srovnávací bod\s*</h2>~u';
    if(preg_match_all($lead,$content,$l)!==1 || strpos($content,'id="se-hp-frost-quote"')!==false) return $content;
    $block=<<<'SE_FROST'
<section data-se-heatpump-frost-comparison-v1="1" aria-labelledby="se-hp-frost-title" style="margin:22px 0;line-height:1.6;color:#142e2b">
<div style="padding:clamp(16px,4vw,25px);background:#eff8f5;border:1px solid #c9ddd9;border-radius:16px">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Technické srovnání · zimní výkon</p>
<h2 id="se-hp-frost-title" style="margin:8px 0;color:#142e2b">Které tepelné čerpadlo zvládne váš dům v mrazu?</h2>
<p><strong>Nesrovnávejte pouze číslo 8 nebo 12 kW v názvu.</strong> Rozhoduje výkon při skutečné venkovní teplotě a požadované teplotě vody. Níže jsou příklady tří značek z dokumentace výrobců, nikoli náš laboratorní test, žebříček spolehlivosti nebo nabídka instalace.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px">
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Vaillant aroTHERM plus</strong><small style="display:block">VWL 75/8.1 A 230V</small><p style="font-size:1.4rem;font-weight:700;color:#205d53;margin:4px 0">6,94 kW</p><p style="margin:0">A−7/W35, COP 2,94. Publikovaný provozní bod, nikoli maximální výkon.</p></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>NIBE S2125-12</strong><small style="display:block">Evropský technický list CH/FR</small><p style="font-size:1.4rem;font-weight:700;color:#205d53;margin:4px 0">8,18 kW</p><p style="margin:0">A−7/W55, maximální zatížení, COP 2,19.</p></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Daikin Altherma 4 H</strong><small style="display:block">EPSK08AW1</small><p style="font-size:1.4rem;font-weight:700;color:#205d53;margin:4px 0">6,98 kW</p><p style="margin:0">A−15/W55, maximální výkon dle katalogu 05/2026.</p></div>
</div>
<p style="font-size:.9em">Karty záměrně ukazují odlišné provozní body. Neslouží k určení vítěze. Srovnatelné teploty najdete v tabulce níže.</p>
<p style="margin-bottom:0"><a class="se-btn se-btn-primary" href="#se-hp-frost-quote">Připravit srovnávací poptávku →</a> <a class="se-btn" href="/prumerna-spotreba-tepelneho-cerpadla/">Spočítat provozní náklady →</a></p>
</div>
<h3>Výkon a COP při −7 °C: podlahové topení versus radiátory</h3>
<p>A−7/W35 znamená venkovní vzduch −7 °C a výstupní topnou vodu 35 °C; W55 znamená 55 °C. Výkon udává dodané teplo v kW, COP poměr dodaného tepla k příkonu při daném bodě. Nezaměňujte jmenovitý, dílčí a maximální výkon. Ani shodné teploty samy o sobě nezaručují shodné zatížení a podmínky měření.</p>
<div role="region" aria-label="Výkon při minus sedmi stupních" tabindex="0" style="overflow-x:auto;border:1px solid #c9ddd9;border-radius:10px"><table style="width:100%;min-width:520px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Přesný model</th><th scope="col">A−7/W35 (kW / COP)</th><th scope="col">A−7/W55 (kW / COP)</th><th scope="col">Podmínka údaje</th></tr></thead><tbody><tr><th scope="row">Vaillant VWL 75/8.1 A</th><td>6,94 / 2,94</td><td>—</td><td>Bod z prospektu 05/2026</td></tr><tr><th scope="row">NIBE S2125-8</th><td>5,52 / 3,21</td><td>5,17 / 2,29</td><td>Max. zatížení</td></tr><tr><th scope="row">NIBE S2125-12</th><td>8,34 / 2,88</td><td>8,18 / 2,19</td><td>Max. zatížení</td></tr><tr><th scope="row">Daikin EPSK08AW1</th><td>7,83 / —</td><td>7,86 / —</td><td>Výkon dle EN 14511, ceník 02/2026</td></tr></tbody></table></div>
<p><small>Pomlčka znamená, že daný údaj v použitém zdroji pro tento bod neuvádíme, nikoli nulu. U Vaillantu neodvozujeme maximální výkon z uvedeného bodu (verze prospektu se liší); u Daikinu nedopočítáváme COP bez příkonu. U NIBE jde o švýcarský francouzský technický list, přesnou místní variantu potvrďte s dodavatelem.</small></p>
<h3>Příklad domu s tepelnou ztrátou 8 kW</h3>
<p>Pokud má dům při −12 °C návrhovou tepelnou ztrátu 8 kW a uvnitř udržujete 21 °C, při zjednodušeném lineárním modelu bez vnitřních a solárních zisků potřebuje při −7 °C přibližně 6,79 kW a při −15 °C 8,73 kW. Předpokládejme, že radiátory v těchto bodech potřebují vodu 55 °C.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:10px">
<div style="border:1px solid #c9ddd9;border-radius:12px;padding:14px;background:#fff"><strong>Při −7 °C: NIBE S2125-8</strong><p style="margin:6px 0">5,17 kW proti potřebě 6,79 kW: modelový deficit 1,62 kW. Je nutné řešit zdroj chybějícího tepla.</p></div>
<div style="border:1px solid #c9ddd9;border-radius:12px;padding:14px;background:#fff"><strong>Při −7 °C: NIBE S2125-12</strong><p style="margin:6px 0">8,18 kW proti potřebě 6,79 kW: modelová rezerva 1,39 kW. Samo o sobě nepotvrzuje dimenzování ani ekonomiku.</p></div>
<div style="border:1px solid #c9ddd9;border-radius:12px;padding:14px;background:#fff"><strong>Při −15 °C: Daikin EPSK08AW1</strong><p style="margin:6px 0">6,98 kW proti potřebě 8,73 kW: modelový deficit 1,75 kW. Katalog 05/2026 uvádí maximum včetně vlivu odmrazování.</p></div>
</div>
<p>Ve skutečném projektu nechte vypočítat tepelnou ztrátu, topnou křivku, výkon při návrhovém mrazu, bod bivalence a množství tepla z dohřevu za rok. Zahrňte i ohřev vody, odmrazování, minimální modulaci a hydraulické podmínky. Záporná rezerva neznamená automaticky špatné čerpadlo: může být součástí záměrného bivalentního návrhu. Kladná rezerva neznamená automaticky optimální velikost.</p>
<h3>Kolik může stát vyšší teplota topné vody?</h3>
<p>Pro stejných 24 kWh dodaného tepla by čistě ilustrační COP 3,2 znamenal 7,5 kWh elektřiny a COP 2,3 asi 10,43 kWh. Při hypotetických 5 Kč/kWh jde o 37,50 Kč versus 52,17 Kč. Nejde o predikci spotřeby konkrétní jednotky při jiné zátěži ani o roční SCOP. Vyžádejte si samostatný výpočet pro skutečnou topnou křivku vašeho domu.</p>
<h3>Co poslat dodavateli před poptávkou</h3>
<p>Tepelná ztráta a návrhová teplota, dosavadní zdroj a roční spotřeba, radiátory nebo podlahovka, požadovaná teplota vody v mrazu, počet osob a ohřev vody, místo venkovní jednotky a napájení. Požadujte přesný model, výkonové křivky při W35 i W55, odhad dohřevu, celkovou cenu s montáží a servis v regionu. <a href="/umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda/">Ověřte také akustiku a umístění</a>.</p>
<p style="font-size:.9em"><strong>Primární zdroje, ověřeno 28. 11. 2026:</strong> <a href="https://www.vaillant.cz/product-highlights/arotherm-plus-2026/prospekt.pdf" rel="noopener">Vaillant – prospekt 05/2026, str. 11</a> · <a href="https://www.nibe.eu/download/18.712dd4e31961ba0902e77a/1762499304723/FLY_NIBE_S2125_FR_web.pdf" rel="noopener">NIBE – S2125, CH/FR 11/2025, str. 4</a> · <a href="https://www.daikin.cz/content/dam/dace-cz/Ceniky/fy-2026/daikin-cenik-altherma-b2c-20260213.pdf.pdf" rel="noopener">Daikin – ceník 02/2026, str. 24</a> · <a href="https://www.daikin.cz/content/dam/Affiliates/DACE/dace-cz/Katalogy/2026/Daikin-katalog-vyt%C3%A1p%C4%9Bn%C3%AD-20260507.pdf" rel="noopener">Daikin – katalog 05/2026, str. 12</a>. Nejde o aktuální cenové nabídky; přesná místní konfigurace, dostupnost a výkonové podmínky se ověřují před nákupem.</p>
</section>
SE_FROST;
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$block.substr($content,$offset);
    return preg_replace($lead,'<h2 id="se-hp-frost-quote">Nezávazná nabídka jako další srovnávací bod</h2>',$content,1);
}
add_filter('the_content','solar_expert_heatpump_frost_comparison_v1',20);
