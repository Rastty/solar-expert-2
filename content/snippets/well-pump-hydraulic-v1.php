/** Existing well-pump guide: hydraulic sizing and three buyer decisions. */
function solar_expert_well_pump_hydraulic_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1641 || $post->post_name!=='solarni-cerpadlo-do-studny-bez-elektriny' || strpos($content,'data-se-well-pump-hydraulic-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Kolik elektřiny spotřebuje čerpadlo za den\?\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_WELL_PUMP'
<section data-se-well-pump-hydraulic-v1="1" aria-labelledby="se-well-choice" style="margin:22px 0;line-height:1.6">
<div style="padding:clamp(16px,4vw,26px);border:1px solid #c9ddd9;border-radius:16px;background:#eff8f5;color:#142e2b">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase;letter-spacing:.04em">Nákupní rozhodnutí</p>
<h2 id="se-well-choice" style="margin:8px 0;color:#142e2b">Jaké solární čerpadlo do studny vybrat?</h2>
<p><strong>Pro denní zalévání z hlubší studny obvykle prověřte specializované solární čerpadlo s nádrží; pro vodu na požádání i v noci potřebujete navíc vhodné tlakové a energetické řešení.</strong> Nejdříve určete průtok a celkovou dopravní výšku, až potom výkon panelů.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px">
<div style="padding:14px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>Mělký zdroj a zalévání</strong><p>Menší solární čerpadlo je kandidátem pouze při nízké dopravní výšce. Například MALAPA SO312 uvádí maximální výtlak 7 m a maximální průtok 8 l/min. Tyto mezní hodnoty neplatí současně.</p><a href="https://malapa.cz/solarni-systemy-s-cerpadlem-na-vodu/so312-solarni-cerpadlo-na-vodu-8l-min-ponorne-vytlak-7m" rel="noopener">Parametry modelu</a></div>
<div style="padding:14px;background:#fff;border:2px solid #287b66;border-radius:12px"><strong>Hlubší vrt nebo studna</strong><p>Prověřte ponorné solární systémy, například řadu Grundfos SQFlex. Konkrétní model se volí podle dynamické hladiny, požadované denní dodávky, dopravní výšky a lokality.</p><a href="https://www.grundfos.com/solutions/learn/ecademy/all-courses/solar-pumping-systems/how-to-size-and-select-a-solar-water-pumping-system" rel="noopener">Návrhový postup výrobce</a></div>
<div style="padding:14px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>Stávající čerpadlo 230 V</strong><p>Pokud je napájení z měniče výrobcem povolené, ověřte rozběh, trvalý příkon, proud baterie a dobu provozu v noci.</p><a class="se-btn se-btn-primary" href="/solarni-sestava-na-chatu/">Navrhnout napájení →</a></div>
</div>
<p style="font-size:.9em;margin:12px 0 0">Odkazy na výrobce či dodavatele jsou technické reference, nikoli potvrzené affiliate nabídky. Bez křivky čerpadla a údajů o studni nelze doporučit konkrétní výkon nebo garantovat průtok.</p>
</div>
<h3>Výtlak není hloubka studny: příklad pro 20 a 40 metrů</h3>
<p>Uvažujme dynamickou hladinu 12 m pod terénem, hladinu v otevřené nádrži 3 m nad terénem a modelové ztráty potrubí 5 m při požadovaném průtoku. Celková dopravní výška (TDH) je 12 + 3 + 5 = <strong>20 m</strong>. Pokud místo otevřeného výtoku potřebujete ve stejném odběrném bodě tlak 2 bary, přičtěte přibližně 20,4 m vodního sloupce: celkem asi 40,4 m. Potrubní ztráty nejsou konstanta a musí se přepočítat na skutečný průtok.</p>
<div role="region" aria-label="Příklad dopravní výšky" tabindex="0" style="overflow-x:auto;border:1px solid #d5dfdc;border-radius:10px"><table style="width:100%;min-width:440px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Model odběrného místa</th><th scope="col">Převýšení</th><th scope="col">Ztráty</th><th scope="col">Požadovaný tlak</th><th scope="col">TDH</th></tr></thead><tbody><tr><th scope="row">Otevřená nádrž</th><td>15 m</td><td>5 m</td><td>0 bar</td><td>20 m</td></tr><tr style="background:#eff8f5;color:#142e2b"><th scope="row">Tlakový odběr</th><td>15 m</td><td>5 m</td><td>2 bary</td><td>40,4 m</td></tr></tbody></table></div>
<p><strong>Čerpadlo s maximálním výtlakem 20 m nemusí do otevřené nádrže v tomto příkladu dodat použitelný průtok.</strong> Najděte na křivce výrobce průtok právě při požadovaném TDH. U solárního systému ověřte i dodávku za proměnlivého osvitu. Výška nádrže není automaticky dostatečný tlak pro sprchu nebo zavlažovač.</p>
<h3>Kolik vody musí čerpadlo dodat za den?</h3>
<div role="region" aria-label="Denní dodávka vody" tabindex="0" style="overflow-x:auto;border:1px solid #d5dfdc;border-radius:10px"><table style="width:100%;min-width:400px;margin:0"><thead><tr><th scope="col">Denní spotřeba</th><th scope="col">Při 3 h skutečného čerpání</th><th scope="col">Využitelná zásoba na 2 dny</th></tr></thead><tbody><tr><th scope="row">300 l</th><td>100 l/h</td><td>600 l</td></tr><tr><th scope="row">600 l</th><td>200 l/h</td><td>1 200 l</td></tr><tr><th scope="row">1 000 l</th><td>333 l/h</td><td>2 000 l</td></tr></tbody></table></div>
<p>Jde o modelové objemy, ne spotřebu typické domácnosti. Tři hodiny skutečného čerpání nejsou totéž co tři ekvivalentní hodiny slunečního svitu. Ověřte vydatnost studny i při čerpání a ochranu proti chodu nasucho. Objem nádrže musí zohlednit nevyužitelnou část, rezervu, přepad, hygienu, zamrznutí a nosnost podkladu; 1 200 litrů vody má přibližně 1,2 tuny bez hmotnosti nádrže.</p>
<h3>Proč nestačí porovnat jen příkon motoru?</h3>
<p>Hydraulická energie na přečerpání 1 m³ vody o 20 m je přibližně 54,5 Wh (objem v m³ × TDH v m × 2,725). Při 40 m je to 109 Wh. Pokud čistě pro ilustraci předpokládáme 30% celkovou účinnost čerpadla a jeho pohonu, elektrická energie vychází asi 182 nebo 363 Wh. Skutečná účinnost závisí na pracovním bodu; tento výpočet není údajem konkrétního výrobku, rozběhovým výkonem ani návrhem panelů. Připočtěte další skutečné ztráty a odběry systému, pokud nejsou v účinnosti zahrnuté.</p>
<div style="padding:14px;border-left:4px solid #287b66;background:#eff8f5;color:#142e2b;border-radius:8px"><strong>Před objednáním si vyžádejte dvě srovnatelné nabídky:</strong> stejný denní objem, průtok při TDH, dodávka ve zvolené sezóně, konkrétní čerpadlo a řídicí jednotka, ochrany, panely, kabely, nádrž či baterie, montáž a servis. Není-li hydraulický návrh doložen, samotná elektrická kalkulačka vhodnost čerpadla nepotvrdí.</div>
<p style="display:flex;flex-wrap:wrap;gap:8px"><a class="se-btn se-btn-primary" href="/quote-checker/">Prověřit nabídku elektrické sestavy →</a><a class="se-btn" href="/vyber-menice/">Porovnat měniče pro existující čerpadlo →</a></p>
</section>
SE_WELL_PUMP;
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_well_pump_hydraulic_v1',20);
