/** 1 kWp energy balance: explicit hypothetical inputs, no guaranteed yield. */
function solar_expert_kwp_cabin_balance_v1($content) {
    if (is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() ||
        !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if (!($post instanceof WP_Post) || $post->post_name!=='co-je-1-kwp') return $content;
    if (strpos($content,'data-se-kwp-cabin-balance="v1"')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Je 1 kWp dost pro chatu\?\s*</h2>~u';
    if (preg_match_all($pattern,$content,$matches,PREG_OFFSET_CAPTURE)!==1) return $content;
    $offset=$matches[0][0][1];
    $html=<<<'SOLAR_KWP_CABIN_BALANCE'
<section data-se-kwp-cabin-balance="v1" class="se-note" aria-label="Modelová energetická bilance chaty">
<h2>1 kWp na chatě: model výroby, spotřeby a baterie</h2>
<p>Pro předběžnou představu zvolme ostrovní sestavu s 1 kWp panelů a spotřebou 1,5 kWh za den na straně 230 V včetně energetického ekvivalentu klidového odběru měniče. Model výroby vychází z výkonu panelů × ekvivalentních hodin plného slunce × souhrnného koeficientu 0,75 na straně spotřeby. Jde o zvolené ilustrační hodnoty, nikoli předpověď českého počasí nebo změřenou účinnost.</p>
<div style="overflow-x:auto"><table><thead><tr><th scope="col">Ekvivalentní hodiny slunce</th><th scope="col">Model využitelné energie</th><th scope="col">Bilance vůči 1,5 kWh/den</th></tr></thead><tbody>
<tr><td>1 h</td><td>0,75 kWh</td><td>−0,75 kWh</td></tr>
<tr><td>3 h</td><td>2,25 kWh</td><td>+0,75 kWh</td></tr>
<tr><td>5 h</td><td>3,75 kWh</td><td>+2,25 kWh</td></tr>
</tbody></table></div>
<p>Kladná denní bilance ještě neznamená nepřetržité napájení: rozhoduje průběh odběru, dostupná kapacita baterie, stav nabití, výkon a omezení nabíjení. Pro skutečný pozemek a sezónu odhadněte měsíční výrobu přes <a href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en" rel="noopener">PVGIS Evropské komise</a>; průměr nenahrazuje návrh pro několik po sobě jdoucích slabých dní.</p>
<h3>Kolik baterie pro 1,5 kWh denně?</h3>
<p>Pro samostatný výpočet zálohy bez výroby počítejme s 80 % využitelné nominální energie LiFePO₄ a účinností měniče 90 %. Jeden den vychází na přibližně <strong>2,08 kWh nominální kapacity</strong>, dva dny na <strong>4,17 kWh</strong>. Nejde o garantovanou autonomii; započítejte skutečný klidový odběr, teplotu, stárnutí, rezervu a limity BMS. Tato účinnost slouží pouze k výpočtu kapacity baterie, nikoli k dalšímu odečítání z tabulky výroby výše.</p>
<p><a class="se-btn" href="/vyber-baterii/">Spočítat baterii podle vlastní spotřeby →</a></p>
<p>Máte dva 400Wp panely? Pro konkrétnější srovnání napětí, baterie a regulátoru přejděte na <a href="/jakou-baterii-a-mppt-k-solarnim-panelum-800w/">průvodce sestavou 800 Wp</a>. Výkon panelů sám neurčuje bezpečné napětí stringu ani proud BMS. Před nákupem ověřte konkrétní komponenty a odborný návrh.</p>
</section>
SOLAR_KWP_CABIN_BALANCE;
    return substr($content,0,$offset).$html.substr($content,$offset);
}
add_filter('the_content','solar_expert_kwp_cabin_balance_v1',20);
