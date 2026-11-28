/** Caravan purchase decision: exact existing post, no catalog or native post edits. */
function solar_expert_caravan_panel_decision_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1618 || $post->post_name!=='solarni-panel-na-karavan-200w' || strpos($content,'data-se-caravan-panel-choice-v1')!==false) return $content;
    $old='Současná veřejná verze kalkulačky kontroluje výkon FV pole, Voc a Vmp. Před nákupem je navíc nutné samostatně ověřit Isc a počet paralelních stringů v datasheetu regulátoru; rozšíření této kontroly připravujeme.';
    $pattern='~<h2(?:\s[^>]*)?>\s*Jak velkou 12V baterii ke karavanovému panelu\?\s*</h2>~u';
    if(substr_count($content,$old)!==1 || preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $html=<<<'SE_CARAVAN'
<section data-se-caravan-panel-choice-v1="1" aria-labelledby="se-caravan-choice" style="margin:22px 0;padding:clamp(14px,3vw,24px);border:1px solid #c9ddd9;border-radius:16px;background:#eff8f5;color:#142e2b">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase;letter-spacing:.04em">Nákupní rozhodnutí</p>
<h2 id="se-caravan-choice" style="margin-top:8px;color:#142e2b">Jeden 200W panel, nebo dva? Srovnání pro karavan</h2>
<p>Pro modelový odběr 338 Wh denně bez lednice může být jeden panel dostačující za příznivého počasí. Pro lednici a další odběry kolem 800 Wh denně už má smysl zvážit větší pole a baterii. Zde počítáme s přesným příkladem panelu 190 Wp z předchozí části, nikoli libovolným 200W modulem.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px">
<div style="padding:16px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>1 × 190 Wp</strong><p style="font-size:1.55rem;font-weight:700;margin:5px 0;color:#205d53">499 Wh/den</p><p style="margin:0">Při 3,5 ekvivalentních hodinách a koeficientu 0,75. Při 1 h jen 143 Wh. Vhodné k prověření pro lehké odběry.</p></div>
<div style="padding:16px;background:#fff;border:1px solid #c9ddd9;border-radius:12px"><strong>2 × 190 Wp</strong><p style="font-size:1.55rem;font-weight:700;margin:5px 0;color:#205d53">998 Wh/den</p><p style="margin:0">Za stejných modelových podmínek. Při 1 h jen 285 Wh. Vyšší výroba, ale nutná kontrola plochy střechy a regulátoru.</p></div>
</div>
<p style="font-size:.9em">Jde o citlivostní výpočet, ne prognózu. Reálný výnos ovlivní stín, orientace a teplota. Ekvivalentní hodiny slunce nejsou délka dne.</p>
<h3 style="color:#142e2b">Který regulátor má smysl koupit?</h3>
<div role="region" aria-label="Srovnání regulátorů" tabindex="0" style="overflow-x:auto;background:#fff;border-radius:10px"><table style="width:100%;min-width:440px;margin:0"><thead><tr><th scope="col">SmartSolar</th><th scope="col">Nominální FV výkon při 12 V</th><th scope="col">Max. PV Isc</th><th scope="col">Nabíjecí proud</th></tr></thead><tbody><tr><th scope="row">100/15</th><td>220 Wp</td><td>15 A</td><td>15 A</td></tr><tr><th scope="row">100/20</th><td>290 Wp</td><td>20 A</td><td>20 A</td></tr><tr><th scope="row">100/30</th><td>440 Wp</td><td>35 A</td><td>30 A</td></tr></tbody></table></div>
<p>Všechny tři uvedené modely mají maximální PV Voc 100 V. Pro jeden popsaný panel může být 100/15 nebo 100/20 kandidátem. Pro dva shodné panely 380 Wp má 100/30 vyšší nominální výkonovou rezervu; nejde o potvrzení kompatibility. Při paralelním modelu je součet Isc při STC 18,34 A, při sériovém modelu 9,17 A a ilustrační cold Voc 57,12 V při koeficientu 1,12. U paralelního zapojení může návrhový Isc po součinitelích překročit 20 A. Přesné teploty, startovací napětí, návrhový Isc, konektory, stínění a nabíjecí limity baterie musí ověřit odborník. Výkon nad nominální hodnotou může regulátor omezit; absolutní elektrické limity se nesmějí překročit.</p>
<p style="display:flex;flex-wrap:wrap;gap:8px"><a class="se-btn se-btn-primary" href="/mppt-kalkulacka/">Porovnat kompatibilní MPPT →</a><a class="se-btn" href="/vyber-baterii/">Vybrat 12V baterii →</a></p>
<h3 style="color:#142e2b">50, 100 nebo 200 Ah? Rezerva na dvě noci</h3>
<p>Při 12,8 V, 80 % využitelné kapacity a 90 % účinnosti napájecí cesty poskytují modelově 50/100/200 Ah přibližně 461/922/1 843 Wh. Pro dva dny odběru 338 Wh vychází alespoň 73,4 Ah jmenovité kapacity; pro 800 Wh denně alespoň 173,6 Ah. Baterii vybírejte podle skutečných odběrů, teploty, BMS, nabíjení a rezervy. Pokud chybí dlouhodobá výroba, větší baterie sama deficit nevyřeší.</p>
<p><strong>Před objednáním:</strong> porovnejte rozměry a hmotnost panelů, schválené kotvení na vozidle, nabíjení z alternátoru či sítě, ochranu LiFePO₄ proti nepovolenému nabíjení v chladu a kompletní cenu montáže. Žádné uvedené variantě nepřisuzujeme ověřenou cenu nebo skladovou dostupnost.</p>
<p style="font-size:.9em">Výrobní zdroje: <a href="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_75-10_up_to_100-20/en/technical-specifications.html" rel="noopener">SmartSolar 100/15 a 100/20</a>; <a href="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html" rel="noopener">SmartSolar 100/30</a>.</p>
</section>
SE_CARAVAN;
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$html.substr($content,$offset);
    return str_replace($old,'Aktuální MPPT kalkulačka kontroluje výkon, Voc, Vmp a součet Isc paralelních stringů u podporovaných modelů. Zadejte skutečné návrhové údaje panelu a ověřte přesné limity, teplotní korekce a jištění v manuálu výrobce. Výsledek je předběžný filtr, ne schválená instalace.',$content);
}
add_filter('the_content','solar_expert_caravan_panel_decision_v1',20);
