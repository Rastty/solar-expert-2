/** Crawlable, bounded relative acoustic example; no new legal threshold or lead route. */
function solar_expert_boundary_distance_example_v1($content) {
    if (is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() ||
        !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if (!($post instanceof WP_Post) ||
        $post->post_name!=='umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda') return $content;
    if (strpos($content,'data-se-boundary-distance-example="v1"')!==false) return $content;
    // Insert at the reviewed transition from acoustic factors to placement.
    $pattern='~<h2(?:\s[^>]*)?>\s*Kam venkovní jednotku raději nedávat\s*</h2>~u';
    if (preg_match_all($pattern,$content,$matches,PREG_OFFSET_CAPTURE)!==1) return $content;
    $offset=$matches[0][0][1];
    $html=<<<'SOLAR_BOUNDARY_DISTANCE_EXAMPLE'
<section data-se-boundary-distance-example="v1" class="se-note" aria-label="Modelové srovnání vzdáleností">
<h2>Jaký rozdíl udělají 2, 4 nebo 8 metrů od sousedova domu?</h2>
<p>Porovnávejte vzdálenost venkovní jednotky od místa, kde se hluk posuzuje, ne pouze od plotu. V ideálním volném prostoru u bodového zdroje klesá hladina akustického tlaku přibližně o 6 dB při každém zdvojnásobení vzdálenosti. Následující tabulka je jen relativní model stejného zdroje ve stejném režimu, nikoli hluk konkrétního čerpadla.</p>
<div style="overflow-x:auto"><table><thead><tr><th scope="col">Vzdálenost k posuzovanému místu</th><th scope="col">Rozdíl vůči 2 m (ideální model)</th></tr></thead><tbody>
<tr><td>2 m</td><td>0 dB</td></tr>
<tr><td>4 m</td><td>−6 dB</td></tr>
<tr><td>6 m</td><td>−9,5 dB</td></tr>
<tr><td>8 m</td><td>−12 dB</td></tr>
</tbody></table></div>
<p><strong>Pozor:</strong> 2 m nejsou doporučený ani zákonem univerzálně povolený odstup pro tepelné čerpadlo. V reálné zástavbě mohou výsledek významně změnit směrovost, odrazy od fasád, více zdrojů, vibrace, terén a provoz v mrazu. Tabulka neslouží k určení bezpečné vzdálenosti nebo splnění hygienického limitu. Ani z akustického výkonu LwA nelze bez dalších podkladů přímo odečíst hodnoty této tabulky jako skutečný akustický tlak u souseda.</p>
<h3>Co poslat dodavateli ještě před objednávkou</h3>
<ul><li>Nákres domu, plotu a sousedních chráněných míst včetně výšek a vzdáleností od plánované jednotky.</li><li>Dvě možné pozice jednotky, orientaci ventilátoru a okolní odrazivé stěny.</li><li>Požadavek na doložení hlukového posouzení konkrétního modelu v relevantním provozu, včetně nočního provozu a dopadu tichého režimu na výkon.</li><li>Požadavek na ověření servisních a bezpečnostních odstupů podle instalačního manuálu.</li></ul>
<p>Pokud vychází rizikové umístění, řešte změnu pozice nebo vhodnější zařízení před montáží. Více k rozdílu mezi akustickým výkonem a tlakem: <a href="/jsou-vzduchova-tepelna-cerpadla-hlucna/">hlučnost vzduchových tepelných čerpadel</a>.</p>
<p class="se-muted">Fyzikální základ relativního modelu: <a href="https://www.osha.gov/otm/section-3-health-hazards/chapter-5" rel="noopener">OSHA Technical Manual, kapitola Noise</a> (šíření od bodového zdroje ve volném prostoru; nejde o český právní předpis).</p>
</section>
SOLAR_BOUNDARY_DISTANCE_EXAMPLE;
    return substr($content,0,$offset).$html.substr($content,$offset);
}
add_filter('the_content','solar_expert_boundary_distance_example_v1',20);
