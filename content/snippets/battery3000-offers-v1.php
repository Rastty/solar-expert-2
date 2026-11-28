/** Existing 3000 W guide: manufacturer-limited multi-module candidate banks. */
function solar_expert_battery3000_offers_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content)) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1652 || $post->post_name!=='jakou-baterii-k-menici-3000w' || strpos($content,'data-se-battery3000-offers-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Má měnič 3000 W dostatečný rozběh pro čerpadlo, kompresor nebo nářadí\?\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $bases=get_option('solar_expert_affiliate_bases',array());
    $base=is_array($bases)&&isset($bases['vselektro-eu'])&&is_string($bases['vselektro-eu'])?$bases['vselektro-eu']:'';
    $u=wp_parse_url($base); $query=array();
    if(is_array($u)&&isset($u['query'])) parse_str($u['query'],$query);
    $approved=is_array($u)&&($u['scheme']??'')==='https'&&($u['host']??'')==='ehub.cz'&&($u['path']??'')==='/system/scripts/click.php'&&!isset($u['user'])&&!isset($u['pass'])&&!isset($u['port'])&&is_string($query['a_aid']??null)&&is_string($query['a_bid']??null)&&preg_match('/^[a-zA-Z0-9_-]+$/D',$query['a_aid'])&&preg_match('/^[a-zA-Z0-9_-]+$/D',$query['a_bid']);

    $rows=array(
      array('epever-24v-100ah','24 V · 4 moduly','LFP2.56KWH25.6V-P65L2EV50','lifepo4-baterie-24v-100ah-epever-lfp2-56kwh25-6v-p65l2ev50/',4,'17 535','70 140','25,6 V','20,8 V','160,3 A','041039621','Výrobce připouští nejvýše čtyři paralelní moduly.','24V manuál'),
      array('epever-51v-100ah','48 V · 2 moduly','LFP5.12KWH51.2V-P20R3','lifepo4-pack-51-2v-100ah-epever-lfp5-12kwh51-2v/',2,'29 590','59 180','51,2 V','41,6 V','80,1 A','041039692','Výrobce připouští až osm paralelních modulů.','48V datasheet')
    );
    $fresh=current_time('Y-m-d')<='2026-12-05';
    $block='<section data-se-battery3000-offers-v1="1" aria-labelledby="se-battery3000-offers-title" style="margin:22px 0;padding:clamp(16px,4vw,24px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:16px;line-height:1.6"><p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase">Konkrétní modely · VSelektro</p><h2 id="se-battery3000-offers-title" style="margin:8px 0;color:#142e2b">Jakou bateriovou sestavu koupit pro měnič 3000 W?</h2><p><strong>Pozor: ani 5,12 kWh samo o sobě nezaručuje trvalý výkon 3000 W.</strong> U následujících dvou přesných modelů uvádí výrobce trvalý vybíjecí proud 50 A na modul, ačkoli obchod uvádí vyšší maximální proud. Proto samotný jeden modul žádné z těchto variant pro plnou trvalou zátěž nedoporučujeme.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px">';
    foreach($rows as $r) {
        $target='https://www.vselektro.eu/'.$r[3]; $href=$target;
        if($approved) $href='https://ehub.cz/system/scripts/click.php?'.http_build_query(array('a_aid'=>$query['a_aid'],'a_bid'=>$query['a_bid'],'desturl'=>$target),'','&',PHP_QUERY_RFC3986);
        $block.='<div style="background:#fff;border:1px solid #c9ddd9;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px"><strong>'.esc_html($r[1]).' · 10,24 kWh</strong><small style="overflow-wrap:anywhere">'.esc_html($r[2]).'</small><p style="margin:0">Při modelové dolní mezi '.esc_html($r[8]).' vychází celkový proud '.esc_html($r[9]).'. Ideální rovnoměrné rozdělení přibližně 40,1 A na modul. '.esc_html($r[11]).'</p>';
        if($fresh) $block.='<strong style="font-size:1.35rem;color:#205d53">'.esc_html($r[6]).' Kč</strong><small>'.esc_html((string)$r[4]).' × '.esc_html($r[5]).' Kč s DPH · veřejně zobrazená cena 28. 11. 2026, pouze moduly, bez montáže a dopravy. Počet kusů skladem neověřen.</small>';
        else $block.='<strong>Cenu a dostupnost všech kusů ověřte u prodejce</strong>';
        $block.='<small>Kat. č. '.esc_html($r[10]).' · předběžná varianta k odbornému ověření</small><a class="se-btn se-btn-primary se-offer" style="margin-top:auto" href="'.esc_url($href).'" data-se-product-id="'.esc_attr($r[0]).'" data-se-merchant="vselektro-eu" data-se-placement="battery3000_editorial_banks" data-se-monetized="'.($approved?'true':'false').'" rel="sponsored nofollow noopener">Zobrazit jeden modul u VSelektro →</a></div>';
    }
    $block.='</div><p style="font-size:.9em">Cenový snímek není závazná nabídka. Tlačítka vedou na jednotlivé moduly, nikoli do košíku s potřebným počtem kusů. Odkazy mohou být partnerské; nákup za podmínek programu může přinést provizi.</p><h3 style="color:#142e2b">Proč čtyři 24V moduly nebo dva 48V?</h3><p>Pro srovnání používáme 3000 W / (dolní mez napětí × 0,90). Jde o konzervativní model, nikoli doporučené provozní napětí. Při 20,8 V vychází 160,3 A; při 41,6 V 80,1 A. Tři 24V moduly by při ideálním sdílení znamenaly 53,4 A na modul, tedy nad trvalým limitem. U 48V varianty jeden modul nestačí. Maximální krátkodobé hodnoty nejsou trvalým limitem.</p><p>Obě modelové sestavy mají 10,24 kWh nominálně. Při 80 % dostupné energie a účinnosti měniče 90 % je teoretická výdrž při 3000 W asi 2,46 hodiny; skutečná bude záviset na teplotě, stavu nabití, poklesu napětí, spotřebě měniče a proudových ochranách.</p><p><strong>Nejde o schválenou kombinaci:</strong> ověřte přesné typy měničů, povolenou komunikaci BMS, nabíjecí napětí, proudy při rozběhu, rovnoměrnost zatížení i chování při odpojení jednoho modulu. Použijte výrobcem povolené uspořádání a odborně navržené ochrany. Po výpadku modulu nelze předpokládat, že soustava smí dále dodávat plných 3000 W. Neměňte napěťovou třídu existujícího měniče.</p><p>Primární zdroje: <a href="https://www.epever.com/wp-content/uploads/2024/10/LFP2.56KWH25.6V-P65L2EV50-Manual-EN-V1.1.pdf" rel="noopener">EPEVER 24 V, manuál V1.1</a> · <a href="https://www.epever.com/wp-content/uploads/2023/09/LFP5.12KWH51.2V-P20R3-EN.pdf" rel="noopener">EPEVER 51,2 V, datasheet</a>.</p><p><a class="se-btn" href="/vyber-baterii/">Prověřit napětí, energii a výkon →</a> <a class="se-btn" href="/quote-checker/">Zkontrolovat úplnou nabídku →</a></p></section>';
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_battery3000_offers_v1',20);
add_action('wp_footer',function(){
    $post=get_queried_object();
    if(!is_singular('post')||!($post instanceof WP_Post)||(int)$post->ID!==1652||$post->post_name!=='jakou-baterii-k-menici-3000w') return;
    echo '<script id="se-battery3000-offers-click-v1">document.addEventListener("click",function(e){if(!e.isTrusted)return;var a=e.target.closest&&e.target.closest("[data-se-battery3000-offers-v1] a[data-se-product-id]");if(!a||!window.SolarExpertAnalytics)return;window.SolarExpertAnalytics.track("affiliate_click",{productId:a.dataset.seProductId,merchant:a.dataset.seMerchant,placement:a.dataset.sePlacement,monetized:a.dataset.seMonetized==="true"});});</script>';
},99);
