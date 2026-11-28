/** Two legacy buyer articles, exact scoped anchors and corrections. */
function solar_expert_fve_investment_components_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post)||strpos($content,'data-se-fve-investment-components-v1')!==false) return $content;
    if((int)$post->ID===1171 && $post->post_name==='kdy-ma-smysl-fotovoltaika') {
        $pattern='~<h2(?:\s[^>]*)?>\s*Úvod\s*</h2>~u';
        $old=array('Nezávislost na cenových výkyvech u tradičních dodavatelů elektřiny','Možnost získání dotací nebo daňových úlev','Je ekologicky a ekonomicky efektivní');
        $new=array('Menší závislost na ceně nakupované elektřiny; běžná síťová FVE nezaručuje nezávislost ani zálohu','Možná podpora podle aktuálních pravidel a způsobilosti žadatele','Ekonomická výhodnost závisí na konkrétním projektu');
        $block=<<<'SE_INVESTMENT'
<section data-se-fve-investment-components-v1="1" aria-labelledby="se-investment-title" style="margin:22px 0;line-height:1.6;color:#142e2b">
<div style="padding:clamp(16px,4vw,25px);background:#eff8f5;border:1px solid #c9ddd9;border-radius:16px">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Rozhodovací průvodce · ekonomika FVE</p>
<h2 id="se-investment-title" style="margin:8px 0;color:#142e2b">Kdy se fotovoltaika vyplatí a kdy raději počkat?</h2>
<p><strong>Největší smysl má tam, kde využijete významnou část výroby přímo doma, střecha je vhodná a celková cena instalace odpovídá očekávanému přínosu.</strong> Roční spotřeba sama o sobě nestačí. Rozhoduje souběh výroby a spotřeby, cena ušetřeného odběru, čistý výkup a náklady na provoz.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px">
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Prověřit menší FVE</strong><p style="margin:6px 0 0">Nízký denní odběr, prázdný dům přes den. Nejdřív posun spotřeby do slunečných hodin.</p></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Porovnat s baterií i bez</strong><p style="margin:6px 0 0">Pravidelný večerní odběr a využitelné přebytky. Baterie má vlastní investiční ekonomiku.</p></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Nejdřív vyřešit překážky</strong><p style="margin:6px 0 0">Silné zastínění, nutná oprava střechy nebo nejisté připojení. Neobjednávat podle výkonu samotného.</p></div>
</div>
<p style="margin-bottom:0"><a class="se-btn se-btn-primary" href="/kolik-stoji-fotovoltaika/">Porovnat cenu a rozsah nabídek →</a> <a class="se-btn" href="/quote-checker/">Zkontrolovat nabídku →</a></p>
</div>
<h3>Fotovoltaika s baterií, nebo bez: dvě srovnatelné nabídky</h3>
<p>Model stejného domu a stejné roční AC výroby 5 000 kWh, přímá spotřeba 2 000 kWh, zbytek k výkupu či uložení. U baterie modelově přesuneme 1 500 kWh přebytků do úložiště s celkovou účinností 90 %, později tedy využijeme 1 350 kWh. Předpokládáme dostatečnou večerní spotřebu, povolené přetoky a čistý výkup 1 Kč/kWh. Ušetřený proměnný nákup 5 Kč/kWh. Všechny ceny jsou hypotetické, nikoli nabídky nebo tarify.</p>
<div role="region" aria-label="Model ekonomiky s baterií a bez baterie" tabindex="0" style="overflow-x:auto;border:1px solid #c9ddd9;border-radius:10px"><table style="width:100%;min-width:430px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Roční model</th><th scope="col">Bez baterie</th><th scope="col">S baterií</th></tr></thead><tbody><tr><th scope="row">Vlastní využití</th><td>2 000 kWh</td><td>3 350 kWh</td></tr><tr><th scope="row">Prodané přetoky</th><td>3 000 kWh</td><td>1 500 kWh</td></tr><tr><th scope="row">Hrubý přínos</th><td>13 000 Kč</td><td>18 250 Kč</td></tr><tr><th scope="row">Model provozních nákladů</th><td>2 000 Kč</td><td>3 000 Kč</td></tr><tr><th scope="row">Čistý roční přínos</th><td>11 000 Kč</td><td>15 250 Kč</td></tr><tr><th scope="row">Model investice</th><td>220 000 Kč</td><td>300 000 Kč</td></tr><tr><th scope="row">Prostá návratnost</th><td>20,0 roku</td><td>19,7 roku</td></tr></tbody></table></div>
<p>Samotný příplatek 80 000 Kč za baterii v modelu přináší dodatečných 4 250 Kč ročně po provozních nákladech, tedy prostou návratnost asi 18,8 roku. Pro desetiletou návratnost by při stejných cenách a 1 000 Kč dodatečných nákladů za rok muselo do baterie projít přibližně 2 571 kWh přebytků ročně: (8 000 + 1 000) / (0,90 × 5 − 1). Musí to umožnit skutečný denní profil, kapacita, výkon i životnost baterie. Záloha při výpadku má samostatnou užitnou hodnotu; nepočítejte ji automaticky jako úsporu peněz.</p>
<h3>Jak rozhodnout z vlastních dat</h3>
<p>Vyžádejte si hodinový nebo čtvrthodinový profil spotřeby, odhad měsíční výroby z <a href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en" rel="noopener">PVGIS Evropské komise</a> a dvě položkové nabídky se stejnou střechou a výkonem. U výkupu ověřte skutečnou čistou cenu a podmínky, u nákupu pouze opravdu ušetřené proměnné složky faktury. Fixní platby obvykle zůstávají. Zvlášť zvažte servis, financování, degradaci, výměnu střídače či baterie a případnou podporu; jednoduchá návratnost nezohledňuje časovou hodnotu peněz. Podporu prověřte na <a href="https://novazelenausporam.cz/" rel="noopener">oficiálním webu programu</a>, nezahrnujte ji před potvrzením způsobilosti.</p>
<p style="padding:14px;background:#eff8f5;border:1px solid #c9ddd9;border-radius:10px"><strong>Další krok:</strong> <a href="/kolik-se-usetri-s-fotovoltaikou/">výpočet úspor</a> · <a href="/kolik-vyrobi-fotovoltaika-za-den/">denní a sezónní výroba</a> · <a href="/kolik-stoji-fotovoltaika-na-rodinny-dum/">cenový průvodce pro rodinný dům</a>. Pro chatu bez sítě použijte <a href="/solarni-sestava-na-chatu/">samostatný ostrovní návrh</a>; ekonomiku síťové FVE nelze přenést přímo.</p>
</section>
SE_INVESTMENT;
    } elseif((int)$post->ID===1158 && $post->post_name==='co-je-potreba-k-fotovoltaice') {
        $pattern='~<h3(?:\s[^>]*)?>\s*Jak funguje fotovoltaická elektrárna\?\s*</h3>~u';
        $old=array('Připojení k elektrické síti: Fotovoltaický systém musí být připojen k elektrické síti, aby mohl elektrickou energii dodávat do domácnosti a v případě nadbytku ji prodávat zpět do sítě.','Baterie: Baterie jsou nezbytné pro ukládání přebytečné energie z fotovoltaického systému, která může být využita v době nízkého slunečního záření nebo v případě výpadku elektrické sítě.','Solární regulátor se používá k řízení nabíjení baterií nebo přívodu elektřiny do sítě. Chrání baterie před přebitím a prodlužuje jejich životnost.');
        $new=array('Připojení k síti: Potřebuje je síťová FVE, nikoli čistě ostrovní systém. Přetoky vyžadují odpovídající podmínky připojení a výkupu.','Baterie: Ukládá energii pro pozdější využití, ale není povinnou technickou součástí každé FVE. Záložní provoz vyžaduje samostatně navrženou funkci.','Solární regulátor MPPT řídí nabíjení baterie u příslušných DC systémů; u síťových a hybridních střídačů bývá MPPT integrovaný. Nabíjení musí odpovídat baterii a jejím ochranám.');
        $block=<<<'SE_COMPONENTS'
<section data-se-fve-investment-components-v1="1" aria-labelledby="se-components-title" style="margin:22px 0;line-height:1.6;color:#142e2b">
<div style="padding:clamp(16px,4vw,25px);background:#eff8f5;border:1px solid #c9ddd9;border-radius:16px">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Nákupní checklist · komponenty</p>
<h2 id="se-components-title" style="margin:8px 0;color:#142e2b">Co opravdu potřebujete k fotovoltaice?</h2>
<p><strong>Panely, konstrukci, vhodný střídač nebo regulátor, kabeláž, ochrany a bezpečný návrh.</strong> Baterie není nutná pro každou síťovou FVE. Ostrovní systém na chatě a hybridní elektrárna na rodinném domě mají odlišné požadavky.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px">
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Síťová FVE bez baterie</strong><p>Panely, síťový střídač, měření, ochrany a připojení. Při výpadku běžně nevyrábí pro domácnost.</p><a href="/kolik-stoji-fotovoltaika/">Cenové srovnání →</a></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Hybridní FVE s baterií</strong><p>Kompatibilní baterie a BMS, hybridní střídač, měření a řízení. Záloha jen pokud je navržena a ověřena.</p><a href="/kdy-ma-smysl-fotovoltaika/#se-investment-title">Ekonomika baterie →</a></div>
<div style="background:white;border:1px solid #c9ddd9;border-radius:12px;padding:14px"><strong>Ostrovní sestava</strong><p>FV pole, MPPT, akumulace dle provozu, DC napájení či měnič a nezávislá záloha podle rizika.</p><a href="/solarni-sestava-na-chatu/">Navrhnout sestavu →</a></div>
</div></div>
<h3>Kontrolní seznam před nákupem nebo poptávkou</h3>
<div role="region" aria-label="Komponenty fotovoltaiky" tabindex="0" style="overflow-x:auto;border:1px solid #c9ddd9;border-radius:10px"><table style="width:100%;min-width:430px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Položka</th><th scope="col">Co musí dodavatel potvrdit</th></tr></thead><tbody><tr><th scope="row">Panely a konstrukce</th><td>Výkon, rozměry, statika, stínění, vhodné upevnění, průchod střechou.</td></tr><tr><th scope="row">Střídač / MPPT</th><td>Napětí, pracovní rozsah, PV Isc, Voc za mrazu, počet větví, trvalý výkon a režimy.</td></tr><tr><th scope="row">Baterie a BMS</th><td>Nominální i využitelná energie, povolený proud, kompatibilita, teploty, záruka.</td></tr><tr><th scope="row">Ochrany a kabeláž</th><td>DC/AC ochrany, odpojování, uzemnění, vhodné vodiče a odborná instalace.</td></tr><tr><th scope="row">Měření a řízení</th><td>Kompatibilní měřidla, řízení přetoků, monitoring a případné řízení spotřebičů.</td></tr><tr><th scope="row">Dokončení dodávky</th><td>Projekt, podmínky připojení, revize, uvedení do provozu a dokumentace skutečného provedení dle konkrétního projektu.</td></tr></tbody></table></div>
<h3>Praktický příklad: 5 kWp na střeše a malá chata</h3>
<p>Dvanáct panelů po 450 Wp znamená 5,4 kWp nominálně; z toho samotného nelze určit vhodný střídač ani baterii. Zkontrolujte hodinový profil domu, střechu a konkrétní limity stringů. Pro ostrovní chatu s modelovým odběrem 1 kWh AC denně a dvěma dny rezervy vychází při 80% využití baterie a 90% účinnosti měniče 2,78 kWh nominálně. To je energetický požadavek, nikoli potvrzení výkonu nebo BMS. Pro nabíjení je nutné zvlášť ověřit sezónní výrobu.</p>
<p>U stávající síťové FVE bez záložního výstupu samotné přidání baterie nezaručí napájení domu při výpadku. Vyžádejte si výslovný popis zálohovaných okruhů, výkonu a způsobu bezpečného oddělení od sítě. Podmínky připojení ověřte u svého distributora a návrh nechte odborně posoudit.</p>
<p style="padding:14px;background:#eff8f5;border:1px solid #c9ddd9;border-radius:10px"><strong>Konkrétní nákupní cesty:</strong> <a class="se-btn se-btn-primary" href="/sady-pro-solarni-napajeni-kompletni-pruvodce/#se-complete-kit-offers-title">Porovnat kompletní sady →</a> <a href="/mppt-kalkulacka/">MPPT kalkulačka</a> · <a href="/vyber-baterii/">výběr baterie</a> · <a href="/vyber-menice/">výběr měniče</a> · <a href="/quote-checker/">kontrola nabídky</a>. Navazující průvodce obsahují také partnerské nabídky. Výběrové nástroje nenahrazují projekt ani revizi.</p>
</section>
SE_COMPONENTS;
    } else return $content;
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    foreach($old as $phrase) if(substr_count($content,$phrase)!==1) return $content;
    $offset=$m[0][0][1];
    return str_replace($old,$new,substr($content,0,$offset).$block.substr($content,$offset));
}
add_filter('the_content','solar_expert_fve_investment_components_v1',20);
