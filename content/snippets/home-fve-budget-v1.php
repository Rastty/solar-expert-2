/** Existing home FVE price article: dated installer benchmark, explicit quote comparison, no post mutation. */
function solar_expert_home_fve_budget_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1187 || $post->post_name!=='kolik-stoji-fotovoltaika-na-rodinny-dum' || strpos($content,'data-se-home-fve-budget-v1')!==false) return $content;
    $old=array(
      'Průměrná cena fotovoltaického systému pro rodinný dům se pohybuje v rozmezí 200 000 – 400 000 Kč.',
      'Fotovoltaický systém na rodinném domě může zkrátit návratnost investice na 6-10 let.',
      'Po této době začne fotovoltaika generovat „zadarmo“ elektřinu, kterou lze využít k pokrytí spotřeby v domácnosti.',
      'Některé odhady nákladů na fotovoltaický systém na rodinný dům v České republice se pohybují od 200 000 do 400 000 Kč, v závislosti na výše uvedených faktorech.'
    );
    $new=array(
      'Pro aktuální orientaci v cenách použijte níže uvedený veřejný benchmark a samostatný cenový průvodce; původní odhad z roku 2024 již nepředstavuje aktuální ceník.',
      'Návratnost nelze stanovit univerzálně. Vychází z konečné ceny, využité výroby, ceny elektřiny a přetoků i provozních nákladů.',
      'I po dosažení jednoduché návratnosti vznikají náklady na provoz, servis a případnou výměnu komponent.',
      'Orientační veřejné ceny jednoho dodavatele a model porovnání rozsahu najdete v aktualizovaném přehledu výše.'
    );
    // Exact text only; never alter link targets or native post content.
    foreach($old as $phrase) if(substr_count($content,$phrase)!==1) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Co je fotovoltaika\?\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_HOME_BUDGET'
<section data-se-home-fve-budget-v1="1" aria-labelledby="se-home-budget-title" style="margin:22px 0;line-height:1.6">
<div style="padding:clamp(16px,4vw,26px);border:1px solid #c9ddd9;border-radius:16px;background:#eff8f5;color:#142e2b">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase;letter-spacing:.04em">Cenový přehled · ověřeno 28. 11. 2026</p>
<h2 id="se-home-budget-title" style="margin:8px 0;color:#142e2b">Kolik si připravit na fotovoltaiku pro rodinný dům?</h2>
<p><strong>E.ON ve veřejných modelových příkladech uvádí cenu fotovoltaiky s fyzickou baterií od 250 000 Kč do 340 000 Kč podle velikosti systému.</strong> Jde o výchozí ceny jednoho dodavatele, nikoli průměr trhu, závaznou nabídku nebo potvrzení stejného rozsahu instalace pro každý dům.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:10px">
<div style="padding:14px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>5 kWp</strong><span style="display:block;color:#205d53;font-weight:700;font-size:1.35rem">od 250 000 Kč</span><small>Model spotřeby 3–5 MWh/rok</small></div>
<div style="padding:14px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>8,3 kWp</strong><span style="display:block;color:#205d53;font-weight:700;font-size:1.35rem">od 310 000 Kč</span><small>Model spotřeby 5–9 MWh/rok</small></div>
<div style="padding:14px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>9,96 kWp</strong><span style="display:block;color:#205d53;font-weight:700;font-size:1.35rem">od 340 000 Kč</span><small>Model spotřeby nad 9 MWh/rok</small></div>
</div>
<p style="font-size:.9em;margin:12px 0">Výrobce nabídky neuvádí v těchto třech krátkých příkladech přesnou kapacitu baterií ani úplný položkový rozsah. Neporovnávejte proto uvedené ceny přímo s jinými dodavateli bez sjednocení parametrů. Aktuální podmínky, DPH, montáž, kapacitu a případnou akci si nechte potvrdit.</p>
<p style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:0"><a class="se-btn se-btn-primary" href="https://www.eon.cz/domacnosti/usporne-technologie/solar/" data-se-lead-id="eon-solar" data-se-placement="home_fve_budget_legacy_intro" data-se-fallback="https://www.eon.cz/domacnosti/usporne-technologie/solar/" rel="sponsored nofollow noopener">Získat nezávaznou nabídku E.ON →</a><a class="se-btn" href="/kolik-stoji-fotovoltaika/">Porovnat cenové příklady a financování →</a></p>
<p style="font-size:.85em;margin:10px 0 0">Zdroj cen: <a href="https://www.eon.cz/domacnosti/usporne-technologie/solar/" rel="noopener">veřejný přehled E.ON, část Cenu fotovoltaiky určuje její velikost</a>. Poptávkový odkaz je partnerský a při splnění podmínek programu může přinést provizi. Výše provize neurčuje technické doporučení.</p>
</div>
<h3>Jak poznat, zda je levnější nabídka skutečně výhodnější?</h3>
<p>Porovnejte konečnou cenu stejného rozsahu včetně DPH. Následující příklad je záměrně hypotetický, ne skutečná nabídka E.ON ani jiného dodavatele.</p>
<div role="region" aria-label="Model porovnání dvou cenových nabídek" tabindex="0" style="overflow-x:auto;border:1px solid #d5dfdc;border-radius:10px"><table style="width:100%;min-width:420px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Položka</th><th scope="col">Nabídka A</th><th scope="col">Nabídka B</th></tr></thead><tbody><tr><th scope="row">Základní cena</th><td>280 000 Kč</td><td>310 000 Kč</td></tr><tr><th scope="row">Úprava rozvaděče</th><td>+ 25 000 Kč</td><td>V ceně</td></tr><tr><th scope="row">Záložní výstup a vybrané okruhy</th><td>+ 20 000 Kč</td><td>V ceně</td></tr><tr><th scope="row">Modelová konečná cena</th><td>325 000 Kč</td><td>310 000 Kč</td></tr></tbody></table></div>
<p>Při jinak shodných parametrech je zde nabídka B o 15 000 Kč levnější, přestože její základní cena byla vyšší. V praxi navíc porovnejte skutečně využitelnou kapacitu baterie, výkon záložního výstupu, konkrétní modely, záruky, servis a podmínky připojení.</p>
<h3>Co potřebuje dodavatel, aby nacenil váš dům?</h3>
<ul><li>Roční spotřebu z faktury a pokud možno průběh spotřeby, nikoliv jen zálohu v Kč.</li><li>Fotografie a rozměry střechy, orientaci, sklon, stínění a stav krytiny.</li><li>Plánované tepelné čerpadlo, elektromobil, ohřev vody a spotřebiče vyžadující zálohu.</li><li>Stav rozvaděče, podmínky distributora a požadavek na přetoky nebo bezpřetokový provoz.</li></ul>
<p>Vyžádejte si položkovou nabídku včetně projektu, montáže, revize, administrativy, záruk, DPH a všech podmínek pro doplatky. Pro cenu běžné domovní FVE použijte <a href="/kolik-stoji-fotovoltaika/">kontrolní seznam domovní fotovoltaiky</a>, nikoli ostrovní kalkulačku. Pro ekonomiku pokračujte do <a href="/kolik-se-usetri-s-fotovoltaikou/">modelu skutečně využité výroby a návratnosti</a>.</p>
<h3>Jaký rozpočet zbude po započtení provozních nákladů?</h3>
<p>Pokud hypotetická instalace stojí 310 000 Kč, hrubá roční úspora a výnosy z přetoků jsou 25 000 Kč a průběžné náklady 3 000 Kč ročně, vychází jednoduchá návratnost 310 000 ÷ 22 000 = přibližně 14,1 roku. Při čistém ročním přínosu 12 000 Kč je to 25,8 roku. Model nezohledňuje financování, degradaci, větší opravy, změny cen elektřiny ani diskontování. Nejde o předpověď pro váš dům.</p>
</section>
SE_HOME_BUDGET;
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$block.substr($content,$offset);
    return str_replace($old,$new,$content);
}
add_filter('the_content','solar_expert_home_fve_budget_v1',20);
