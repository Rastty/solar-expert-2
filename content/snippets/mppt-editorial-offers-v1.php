/** Three existing approved merchant products, no catalog or matcher mutation. */
function solar_expert_mppt_editorial_offers_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content)) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || $post->post_name!=='jak-vybrat-mppt-regulator-pro-400w-panel' || strpos($content,'data-se-mppt-editorial-offers-v1')!==false) return $content;
    $old='Pozor: současná veřejná kalkulačka zatím automaticky neověřuje Isc panelů ani počet paralelních stringů. Isc z datasheetu panelu a maximální vstupní Isc regulátoru ověřte samostatně před nákupem.';
    $pattern='~<h2(?:\s[^>]*)?>\s*Tři typické situace při výběru\s*</h2>~u';
    if(substr_count($content,$old)!==1 || preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $bases=get_option('solar_expert_affiliate_bases',array());
    $base=is_array($bases)&&isset($bases['vselektro-eu'])&&is_string($bases['vselektro-eu'])?$bases['vselektro-eu']:'';
    $u=wp_parse_url($base); $query=array();
    if(is_array($u)&&isset($u['query'])) parse_str($u['query'],$query);
    $approved=is_array($u)&&($u['scheme']??'')==='https'&&($u['host']??'')==='ehub.cz'&&($u['path']??'')==='/system/scripts/click.php'&&!isset($u['user'])&&!isset($u['pass'])&&!isset($u['port'])&&is_string($query['a_aid']??null)&&is_string($query['a_bid']??null)&&preg_match('/^[a-zA-Z0-9_-]+$/D',$query['a_aid'])&&preg_match('/^[a-zA-Z0-9_-]+$/D',$query['a_bid']);
    $rows=array(
      array('20','2 404','8719076043027','solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/','290 / 580 Wp','Jeden 400Wp panel a 24V baterie, pokud vyhoví napětí a proud.'),
      array('30','3 444','8719076040170','solarni-regulator-victron-energy-smartsolar-30a/','440 / 880 Wp','Jeden 400Wp panel na 12 V nebo dva na 24 V, až po kontrole pole.'),
      array('50','4 946','8719076040194','solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/','700 / 1 400 Wp','Rezerva pro větší pole; stále stejná absolutní mez Voc 100 V.')
    );
    $fresh=current_time('Y-m-d')<='2026-12-05';
    $block='<section data-se-mppt-editorial-offers-v1="1" aria-labelledby="se-mppt-offer-title" style="margin:22px 0;padding:clamp(16px,4vw,24px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:16px"><p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Konkrétní modely · VSelektro</p><h2 id="se-mppt-offer-title" style="margin:8px 0;color:#142e2b">Kde koupit regulátor k 400W panelu?</h2><p>Nejdřív zkontrolujte skutečné Voc za mrazu, Vmp, návrhový Isc a povolený nabíjecí proud baterie v <a href="/mppt-kalkulacka/">MPPT kalkulačce</a>. Následující tři modely jsou výkonoví kandidáti, nikoli potvrzená kompatibilita.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px">';
    foreach($rows as $r) {
        $target='https://www.vselektro.eu/'.$r[3];
        $href=$target;
        if($approved) $href='https://ehub.cz/system/scripts/click.php?'.http_build_query(array('a_aid'=>$query['a_aid'],'a_bid'=>$query['a_bid'],'desturl'=>$target),'','&',PHP_QUERY_RFC3986);
        $block.='<div style="background:#fff;border:1px solid #c9ddd9;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px"><strong>Victron SmartSolar 100/'.esc_html($r[0]).'</strong><span style="font-size:.9em">FV nominálně 12 V / 24 V: '.esc_html($r[4]).'</span><p style="margin:0">'.esc_html($r[5]).'</p>';
        if($fresh) $block.='<strong style="font-size:1.35rem;color:#205d53">'.esc_html($r[1]).' Kč</strong><small>28. 11. 2026 · s DPH · obchod uváděl skladem</small>';
        else $block.='<strong>Aktuální cenu a sklad ověřte u prodejce</strong>';
        $block.='<small>EAN '.esc_html($r[2]).'</small><a class="se-btn se-btn-primary se-offer" style="margin-top:auto" href="'.esc_url($href).'" data-se-product-id="mppt-victron-100-'.esc_attr($r[0]).'" data-se-merchant="vselektro-eu" data-se-placement="mppt400_editorial_cards" data-se-monetized="'.($approved?'true':'false').'" rel="sponsored nofollow noopener">Zobrazit u VSelektro →</a></div>';
    }
    $block.='</div><p style="font-size:.9em;margin:12px 0">Ceny jsou datovaný snímek veřejných nabídek, nikoli záruka ceny či skladu. Odkazy mohou být partnerské; nákup za splnění podmínek programu může přinést provizi. VSelektro je samostatný obchodník, nikoli druhý web Battery.cz / Solar-Import.cz. U 100/50 se údaj obchodníka o ochraně proti přepólování (35 A) liší od maximálního PV Isc v aktuálním manuálu výrobce (60 A); před nákupem si nechte potvrdit přesnou revizi a platný limit. <a href="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html" rel="noopener">Manuál 100/30 a 100/50</a> · <a href="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_75-10_up_to_100-20/en/technical-specifications.html" rel="noopener">manuál 100/20</a>.</p><p><a class="se-btn" href="/mppt-kalkulacka/">Porovnat i další vhodné regulátory →</a></p></section>';
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$block.substr($content,$offset);
    return str_replace($old,'Aktuální veřejná kalkulačka kontroluje také součet Isc paralelních větví u podporovaných modelů. Zadejte skutečné návrhové hodnoty a ověřte přesné limity, jištění a dokumentaci výrobce; výsledek není schválením instalace.',$content);
}
add_filter('the_content','solar_expert_mppt_editorial_offers_v1',20);
add_action('wp_footer',function(){
    if(!is_singular('post')||get_queried_object()->post_name!=='jak-vybrat-mppt-regulator-pro-400w-panel') return;
    echo '<script id="se-mppt-editorial-offers-click-v1">document.addEventListener("click",function(e){if(!e.isTrusted)return;var a=e.target.closest&&e.target.closest("[data-se-mppt-editorial-offers-v1] a[data-se-product-id]");if(!a||!window.SolarExpertAnalytics)return;window.SolarExpertAnalytics.track("affiliate_click",{productId:a.dataset.seProductId,merchant:a.dataset.seMerchant,placement:a.dataset.sePlacement,monetized:a.dataset.seMonetized==="true"});});</script>';
},99);
