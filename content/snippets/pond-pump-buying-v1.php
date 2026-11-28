/** Existing pond guide: exact manufacturer models, continuous-load budget and corrected calculator claim. */
function solar_expert_pond_pump_buying_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || $post->post_name!=='solarni-panel-pro-zahradni-cerpadlo-a-jezirko' || strpos($content,'data-se-pond-pump-buying-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Co zkontrolovat před objednávkou\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $old='Veřejná MPPT kalkulačka zatím sama nepotvrzuje všechny limity PV Isc a paralelních větví.';
    $new='MPPT kalkulačka kontroluje návrhové PV Isc a paralelní větve u podporovaných modelů; u neúplných nebo neznámých parametrů nesmí být její výstup považován za potvrzení bezpečnosti.';
    if(substr_count($content,$old)!==1) return $content;
    $block=<<<'SE_POND_BUYING'
<section data-se-pond-pump-buying-v1="1" aria-labelledby="se-pond-buying-title" style="margin:22px 0;line-height:1.6;color:#142e2b">
<div style="padding:clamp(16px,4vw,25px);background:#eff8f5;border:1px solid #c9ddd9;border-radius:16px">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Praktický nákupní výběr · jezírko</p>
<h2 id="se-pond-buying-title" style="margin:8px 0;color:#142e2b">Jakou solární fontánu nebo čerpadlo vybrat?</h2>
<p><strong>Pro dekorativní fontánu bez nočního provozu nejdřív porovnejte hotové přímé solární sady. Pro filtraci s rybami, která nesmí přestat, potřebujete samostatně navrženou spolehlivou zálohu.</strong> Tři příklady níže patří do stejné řady Esotec Water Splash. Nejde o žebříček trhu, skladovou nabídku ani záruku průtoku.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px">
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Water Splash 470</strong><small style="display:block">101012 · 5 Wp</small><p style="font-size:1.35rem;font-weight:700;color:#205d53;margin:4px 0">470 l/h max.</p><p style="margin:0">Výtlak max. 0,9 m; příkon čerpadla max. 3 W.</p><p><a href="https://www.esotec.cz/solarni-fontany/solarni-fontana-esotec-water-splash-5-470/" rel="noopener">Detail modelu →</a></p></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Water Splash 610</strong><small style="display:block">101013 · 10 Wp</small><p style="font-size:1.35rem;font-weight:700;color:#205d53;margin:4px 0">610 l/h max.</p><p style="margin:0">Výtlak max. 1,5 m; příkon max. 7 W.</p><p><a href="https://www.esotec.cz/solarni-fontany/solarni-fontana-esotec-water-splash-10-610/" rel="noopener">Detail modelu →</a></p></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Water Splash 1350</strong><small style="display:block">101014 · 20 Wp</small><p style="font-size:1.35rem;font-weight:700;color:#205d53;margin:4px 0">1 350 l/h max.</p><p style="margin:0">Výtlak max. 1,9 m; příkon max. 11,5 W.</p><p><a href="https://www.esotec.cz/solarni-zahrada/solarni-fontana-esotec-water-splash-20-1350-101014/" rel="noopener">Detail modelu →</a></p></div>
</div>
<p style="font-size:.9em;margin-bottom:0">Parametry z <a href="https://www.esotec.cz/user/documents/upload/Nov%C3%A1%20slo%C5%BEka/101012-101013-101014-CZ.pdf.pdf" rel="noopener">návodu výrobce Esotec pro 101012–101014</a>. Všechny tři sady pracují přímo ze slunce bez baterie; maximální výtlak a maximální průtok nejsou jeden současně dosažitelný provozní bod. Výrobce uvádí teplotní rozsah čerpadla +4 až +40 °C a nutnost zimního uskladnění bez mrazu. Odkazy na tyto fontány nejsou ověřené affiliate nabídky.</p>
</div>
<h3>Kolik vody skutečně proteče potůčkem?</h3>
<p>Pokud požadujete 1 200 l/h ve výšce 1,2 m a odhadnete další tlakové ztráty v potrubí a filtru na ekvivalent 0,4 m vodního sloupce, požadovaný pracovní bod je 1 200 l/h při celkovém výtlaku 1,6 m. Model s maximálním výtlakem 1,5 m nevyhoví. Ani čerpadlo s maximy 1 350 l/h a 1,9 m není automaticky vhodné: vyžádejte si jeho průtokovou křivku a výkon při daném napájení. Bez ní konkrétní pracovní bod nepotvrzujeme. Zohledněte zanesení filtru a kolísání slunečního svitu.</p>
<h3>Kolik stojí energetická rezerva pro filtraci 24/7?</h3>
<p>Model nepřetržité 35W filtrace představuje 840 Wh denně na straně spotřebiče. Pokud uvažujeme souhrnnou účinnost DC napájení 90 % a využití 80 % jmenovité energie LiFePO₄, potřebujeme přibližně 1,17 kWh nominální baterie na jeden den nebo 2,33 kWh na dva dny bez výroby. Předpoklady nejsou měřením konkrétní filtrace. Při dodatečné spotřebě, chladu, stárnutí a ohřevu baterie se potřebná kapacita zvýší.</p>
<div role="region" aria-label="Modelová denní filtrace" tabindex="0" style="overflow-x:auto;border:1px solid #c9ddd9;border-radius:10px"><table style="width:100%;min-width:420px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Trvalý příkon</th><th scope="col">Denní odběr</th><th scope="col">1 den baterie</th><th scope="col">2 dny baterie</th></tr></thead><tbody><tr><th scope="row">20 W</th><td>480 Wh</td><td>0,67 kWh</td><td>1,33 kWh</td></tr><tr><th scope="row">35 W</th><td>840 Wh</td><td>1,17 kWh</td><td>2,33 kWh</td></tr><tr><th scope="row">60 W</th><td>1 440 Wh</td><td>2,00 kWh</td><td>4,00 kWh</td></tr></tbody></table></div>
<p>Pro 35 W vychází odběr z baterie asi 933 Wh/den. Při ilustračních třech ekvivalentních hodinách slunce a faktoru 0,75 na straně baterie dodá 400 Wp pouze 900 Wh/den, tedy ani nepokryje běžný odběr. Pole 800 Wp dodá modelově 1 800 Wh, přebytek asi 867 Wh/den; obnova rezervy po dvou dnech bez slunce by za těchto předpokladů trvala asi 2,15 dne. Při jediné ekvivalentní hodině nestačí ani 800 Wp. Pro filtraci životně důležitou pro ryby není takový model náhradou nezávislé spolehlivé zálohy, signalizace poruchy a odborného návrhu.</p>
<p style="padding:14px;background:#eff8f5;border:1px solid #c9ddd9;border-radius:10px"><strong>Další krok k nákupu:</strong> <a class="se-btn se-btn-primary" href="/jakou-baterii-k-solarnimu-panelu-400w/#se-battery400-offer-title">Porovnat konkrétní baterie →</a> <a class="se-btn" href="/jakou-baterii-a-mppt-k-solarnim-panelum-800w/#se-800wp-offer-title">Prověřit větší 800Wp systém →</a> <a href="/solarni-cerpadlo-do-studny-bez-elektriny/">Řešíte místo jezírka studnu?</a> V navazujících průvodcích jsou partnerské nabídky. Elektrické zařízení u vody musí být vhodné pro dané prostředí; kompatibilitu, ochrany a instalaci ověří kvalifikovaná osoba.</p>
</section>
SE_POND_BUYING;
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$block.substr($content,$offset);
    return str_replace($old,$new,$content);
}
add_filter('the_content','solar_expert_pond_pump_buying_v1',20);
