/** Two exact existing solar articles; no title, post or catalog mutation. */
function solar_expert_string_large_array_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post)) return $content;
    if($post->post_name==='jak-zapojit-solarni-panely') {
        $old='Současná veřejná verze kalkulačky ještě automaticky nekontroluje celkový Isc paralelních stringů.';
        if(substr_count($content,$old)!==1 || strpos($content,'data-se-wiring-isc-v1')!==false) return $content;
        $new='<span data-se-wiring-isc-v1="1">Aktualizovaná MPPT kalkulačka nyní počítá celkový výkon a Isc ze zadaného počtu panelů v sérii a paralelních větví. Jde o předběžnou kontrolu; zadejte návrhové hodnoty konkrétních panelů a ověřte proudové součinitele, minimální teplotu a nabíjecí limity.</span>';
        $content=str_replace($old,$new,$content);
        $content=str_replace('Předběžně ověřit Voc/Vmp a výkon v MPPT kalkulačce','Předběžně ověřit Voc, Vmp, Isc a výkon v MPPT kalkulačce',$content);
        return $content;
    }
    if($post->post_name!=='kolik-panelu-je-potreba-na-jeden-string' || strpos($content,'data-se-large-array-guide-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Co ještě kromě napětí zkontrolovat\s*</h2>~u';
    if(preg_match_all($pattern,$content,$matches,PREG_OFFSET_CAPTURE)!==1) return $content;
    $offset=$matches[0][0][1];
    $html=<<<'SOLAR_LARGE_ARRAY_GUIDE'
<section data-se-large-array-guide-v1="1" class="se-note" aria-label="Model větší ostrovní sestavy">
<h2>Jaký MPPT regulátor pro 3 až 5 kWp na 48V baterii?</h2>
<p>U větší ostrovní fotovoltaiky rozhoduje vedle výkonu panelů i uspořádání stringů. Porovnejme modelové shodné panely 400 Wp s Voc 49 V, Vmp 40 V a Isc 11 A na panel. Počítejme s 48V bateriovým systémem a ilustrační korekcí Voc × 1,12. Nejde o datasheet konkrétního panelu ani schválené zapojení. Skutečný návrhový Isc může být vyšší.</p>
<div style="overflow-x:auto"><table><thead><tr><th scope="col">Model pole</th><th scope="col">Výkon</th><th scope="col">Vmp při modelových podmínkách</th><th scope="col">Modelové cold Voc</th><th scope="col">Součet Isc před součiniteli</th></tr></thead><tbody>
<tr><td>8 × 400 Wp, 2S4P</td><td>3 200 Wp</td><td>80 V</td><td>109,76 V</td><td>44 A</td></tr>
<tr><td>10 × 400 Wp, 2S5P</td><td>4 000 Wp</td><td>80 V</td><td>109,76 V</td><td>55 A</td></tr>
<tr><td>12 × 400 Wp, 3S4P</td><td>4 800 Wp</td><td>120 V</td><td>164,64 V</td><td>44 A</td></tr>
</tbody></table></div>
<p><strong>Proč nestačí údaj o wattech:</strong> v prvním modelu mohou předběžně vyhovět Victron SmartSolar 150/70-Tr VE.Can i 250/100-Tr VE.Can. Druhý model má sice 4 000 Wp, tedy nominální výkon 150/70 při 48 V, ale 55 A překračuje jeho maximální PV Isc 50 A. Třetí model překračuje napěťový limit 150V třídy. U většího 250/100 výrobce uvádí 5 800 Wp při 48 V, maximální PV Isc 70 A a provozní maximum 245 V. To z něj dělá model k dalšímu prověření, nikoliv automatické potvrzení kompatibility.</p>
<p>Zdroj: <a href="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_150-70_up_to_250-100_VE.Can/en/technical-specifications.html" rel="noopener">oficiální technické údaje Victron VE.Can</a>. Zkontrolujte přesnou variantu, limit při nejnižší teplotě, startovací a pracovní okno při horkých panelech, návrhový Isc, omezení konektorů a maximální proud baterie. Fixní 1,12 a rezervy kalkulačky nenahrazují odborný výpočet a jištění.</p>
<p><a class="se-btn se-btn-primary" href="/mppt-kalkulacka/">Porovnat MPPT pro 3–5 kWp →</a> V kalkulačce zvolte „8 × 400 Wp · 48 V · 2S4P“ a upravte hodnoty podle datasheetu. Nástroj je pro ostrovní nabíjecí regulátory, ne pro kompletní návrh síťové FVE.</p>
<h3>Jak velká baterie k takovému poli?</h3>
<p>Kapacitu určuje denní odběr a rezerva bez výroby, ne samotný počet panelů. Například při odběru 3 kWh denně na straně 230 V včetně energetického ekvivalentu klidového odběru, 80 % využitelné kapacity a 90 % účinnosti měniče vychází modelově 4,17 kWh nominální kapacity pro jeden den a 8,33 kWh pro dva dny. Skutečná autonomie závisí na teplotě, stárnutí, nabití a BMS. Pro výběr použijte <a href="/vyber-baterii/">kalkulačku baterií</a> a <a href="/vyber-menice/">výběr měniče</a>; ověřte i jejich trvalý a rozběhový výkon. Aktuální ceny a sklad ověřte u prodejců.</p>
</section>
SOLAR_LARGE_ARRAY_GUIDE;
    return substr($content,0,$offset).$html.substr($content,$offset);
}
add_filter('the_content','solar_expert_string_large_array_v1',20);
