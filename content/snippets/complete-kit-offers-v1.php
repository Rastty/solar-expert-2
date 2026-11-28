/** Four configurable seller kits, scoped to existing complete-kit article. */
function solar_expert_complete_kit_offers_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || $post->post_name!=='sady-pro-solarni-napajeni-kompletni-pruvodce' || strpos($content,'data-se-complete-kit-offers-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Co má kompletní solární sada obsahovat\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $bases=get_option('solar_expert_affiliate_bases',array());
    $base=is_array($bases)&&isset($bases['vselektro-eu'])&&is_string($bases['vselektro-eu'])?$bases['vselektro-eu']:'';
    $u=wp_parse_url($base); $query=array();
    if(is_array($u)&&isset($u['query'])) parse_str($u['query'],$query);
    $approved=is_array($u)&&($u['scheme']??'')==='https'&&($u['host']??'')==='ehub.cz'&&($u['path']??'')==='/system/scripts/click.php'&&!isset($u['user'])&&!isset($u['pass'])&&!isset($u['port'])&&is_string($query['a_aid']??null)&&is_string($query['a_bid']??null)&&preg_match('/^[a-zA-Z0-9_-]+$/D',$query['a_aid'])&&preg_match('/^[a-zA-Z0-9_-]+$/D',$query['a_bid']);


    $rows=array(
      array('vselektro-musov-ii','Mušov II','34 639','090039002','solarni-sestava-musov-ii/','24 V · 2 kW','2–3 × 450 Wp, GEL','Pro sezónní chatu s menšími spotřebiči. Počet panelů a kapacita baterie se vybírají zvlášť.'),
      array('vselektro-victron-musov-ii','Victron Mušov II','49 706','0900390010','solarni-sestava-victron-musov-ii/','24 V · 1,6 kW dle popisu sady','2–3 panely, GEL','Alternativa s Victron MPPT a monitoringem. Měnič označený 2000 VA není totéž co 2000 W.'),
      array('vselektro-hybrid-i','Hybrid I','61 117','090039004','solarni-sestava-hybrid-i/','24 V · 3,5 kW','4–9 × 450 Wp, 1 MPPT','Pro vyšší současný odběr v jednofázovém ostrovním systému či s přepínáním na síť.'),
      array('vselektro-hybrid-ii','Hybrid II','88 848','090039005','solarni-sestava-hybrid-ii/','48 V · 5,5 kW','4–12 × 450 Wp, 2 MPPT','Pro větší jednofázovou sestavu. Přesná volba baterie a proudových limitů je zvlášť důležitá.')
    );
    $fresh=current_time('Y-m-d')<='2026-12-05';
    $block='<section data-se-complete-kit-offers-v1="1" aria-labelledby="se-complete-kit-offers-title" style="margin:22px 0;padding:clamp(16px,4vw,24px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:16px;line-height:1.6"><p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Nákupní výběr · VSelektro</p><h2 id="se-complete-kit-offers-title" style="margin:8px 0;color:#142e2b">Čtyři hotové solární sady: kterou prověřit pro svou chatu?</h2><p><strong>Pro sezónní chatu nejdřív porovnejte dvě ostrovní sady Mušov. Pro náročnější souběžné odběry prověřte Hybrid I nebo II.</strong> Všechny jsou konfigurovatelné; samotný název sady nebo výkon měniče nezaručuje denní výrobu ani potřebnou autonomii.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:12px">';
    foreach($rows as $r) {
        $target='https://www.vselektro.eu/'.$r[4]; $href=$target;
        if($approved) $href='https://ehub.cz/system/scripts/click.php?'.http_build_query(array('a_aid'=>$query['a_aid'],'a_bid'=>$query['a_bid'],'desturl'=>$target),'','&',PHP_QUERY_RFC3986);
        $block.='<div style="background:#fff;border:1px solid #c9ddd9;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px"><strong style="font-size:1.1rem">'.esc_html($r[1]).'</strong><span style="font-weight:600;color:#205d53">'.esc_html($r[5]).'</span><small>'.esc_html($r[6]).'</small><p style="margin:0">'.esc_html($r[7]).'</p>';
        if($fresh) $block.='<strong style="font-size:1.35rem;color:#205d53">'.esc_html($r[2]).' Kč</strong><small>Orientační cena s DPH z veřejného výpisu načteného 28. 11. 2026; varianty se liší.</small>';
        else $block.='<strong>Aktuální cenu ověřte v konfigurátoru prodejce</strong>';
        $block.='<small>Kat. č. '.esc_html($r[3]).'</small><a class="se-btn se-btn-primary" style="margin-top:auto" href="'.esc_url($href).'" data-se-deal-id="'.esc_attr($r[0]).'" data-se-merchant="vselektro-eu" data-se-placement="complete_kit_editorial_offers" data-se-monetized="'.($approved?'true':'false').'" rel="sponsored nofollow noopener">Zobrazit a nakonfigurovat →</a></div>';
    }
    $block.='</div><p style="font-size:.9em">Cenové příklady jsou z veřejně dostupných datovaných výpisů, nikoli živý sklad ani závazný ceník. Nezahrnují automaticky nosnou konstrukci, dopravu, montáž či revizi; ověřte konkrétní variantu a úplný rozsah na produktové stránce. Odkazy mohou být partnerské; nákup za podmínek programu může přinést provizi.</p><h3 style="color:#142e2b">Jak porovnat GEL a LiFePO₄ bez zavádějícího údaje o kapacitě?</h3><p>Pro Mušov II se dvěma 12V/200Ah GEL akumulátory je nominální energie 4,8 kWh, s 250Ah variantou 6 kWh. Při čistě modelovém využití 50 % jmenovité energie a 90% účinnosti měniče dostanete přibližně 2,16 nebo 2,70 kWh na straně 230 V. Pro odběr 3 kWh denně bez výroby nestačí v tomto modelu ani větší varianta na celý den. Skutečná dostupná energie závisí na dovolené hloubce vybití, vybíjecím proudu, teplotě a stárnutí. Nezaměňujte nominální kWh GEL s využitelnými kWh LiFePO₄.</p><p>Při 900 Wp a třech ekvivalentních hodinách slunce s ilustračním koeficientem 0,75 vychází 2,03 kWh denně, při 1 350 Wp 3,04 kWh. Při jediné hodině jen 0,68 a 1,01 kWh. Nejde o garantovanou výrobu těchto sad. Ověřte sezónu a lokalitu v <a href="https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en" rel="noopener">PVGIS</a>.</p><h3 style="color:#142e2b">Co si nechat potvrdit u výkonnějších sad?</h3><p>Hybrid I a II jsou podle prodejce jednofázové systémy s přepínáním na síť bez dodávky do distribuční sítě, nikoli automatická náhrada běžné třífázové domovní FVE. Při modelové účinnosti 90 % představuje 3,5 kW při 24 V přibližně 162 A a 5,5 kW při 48 V přibližně 127 A na bateriové straně. Při nižším napětí a rozběhu může být proud vyšší. Nestačí ověřit kapacitu baterie: dodavatel musí potvrdit přesný trvalý a krátkodobý proud celé bateriové banky, kompatibilitu BMS, MPPT limity, ochrany, přepínání sítí a montáž. Nepovažujte žádnou konfiguraci za schválenou pouze podle této karty.</p><div style="padding:14px;border:1px solid #c9ddd9;background:#fff;border-radius:12px"><strong>Nejste si jistí velikostí?</strong> Zadejte spotřebiče a počet dnů rezervy do našeho návrhu. Potom srovnejte stejnou využitelnou kapacitu baterie, skutečný výkon měniče, rozsah dodávky a konečnou cenu.<p style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:0"><a class="se-btn se-btn-primary" href="/solarni-sestava-na-chatu/">Navrhnout vlastní sestavu →</a><a class="se-btn" href="/quote-checker/">Zkontrolovat nabídku →</a></p></div></section>';
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_complete_kit_offers_v1',19);
add_action('wp_footer',function(){
    $post=get_queried_object();
    if(!is_singular('post')||!($post instanceof WP_Post)||$post->post_name!=='sady-pro-solarni-napajeni-kompletni-pruvodce') return;
    echo '<script id="se-complete-kit-offers-click-v1">document.addEventListener("click",function(e){if(!e.isTrusted)return;var a=e.target.closest&&e.target.closest("[data-se-complete-kit-offers-v1] a[data-se-deal-id]");if(!a||!window.SolarExpertAnalytics)return;window.SolarExpertAnalytics.track("bundle_deal_click",{dealId:a.dataset.seDealId,merchant:a.dataset.seMerchant,placement:a.dataset.sePlacement,monetized:a.dataset.seMonetized==="true"});});</script>';
},99);
