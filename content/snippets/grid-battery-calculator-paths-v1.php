/** Scoped household-grid buyer routing and calculator discovery. */
function solar_expert_grid_battery_calculator_paths_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post)||strpos($content,'data-se-grid-battery-path-v1')!==false) return $content;
    $url='/kdy-ma-smysl-fotovoltaika/#se-bic-title';
    if((int)$post->ID===1171 && $post->post_name==='kdy-ma-smysl-fotovoltaika') {
        if(substr_count($content,'data-se-battery-incremental-calc-v1="1"')!==1||substr_count($content,'data-se-fve-investment-components-v1="1"')!==1) return $content;
        $old=array('<a class="se-btn" href="/quote-checker/">Zkontrolovat nabídku →</a>','<a class="se-btn se-btn-primary" href="/quote-checker/">Zkontrolovat rozsah nabídky →</a>');
        $new=array('<a class="se-btn" data-se-grid-battery-path-v1="grid-investment" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve">Zkontrolovat nabídku domovní FVE →</a>','<a class="se-btn se-btn-primary" data-se-grid-battery-path-v1="grid-calculator" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve">Zkontrolovat nabídku domovní FVE →</a>');
        foreach($old as $phrase) if(substr_count($content,$phrase)!==1) return $content;
        return str_replace($old,$new,$content);
    }
    if((int)$post->ID===1158 && $post->post_name==='co-je-potreba-k-fotovoltaice') {
        if(substr_count($content,'data-se-fve-investment-components-v1="1"')!==1) return $content;
        $old='<a href="/quote-checker/">kontrola nabídky</a>';
        if(substr_count($content,$old)!==1) return $content;
        return str_replace($old,'<a href="/quote-checker/">kontrola ostrovní sestavy</a> · <a data-se-grid-battery-path-v1="grid-components" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve">kontrola nabídky domovní FVE</a>',$content);
    }
    if((int)$post->ID===1186 && $post->post_name==='kolik-se-usetri-s-fotovoltaikou') {
        if(substr_count($content,'data-se-savings-model-v1="1"')!==1) return $content;
        $pattern='~<h3(?:\s[^>]*)?>\s*Výpočet úspor\s*</h3>~u';
        $block='<aside data-se-grid-battery-path-v1="savings" style="padding:16px;margin:18px 0;background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:12px"><strong>Vyplatí se připlatit za baterii?</strong><p>Pokud baterie ročně přijme 1 000 kWh přebytků, z nichž 900 kWh nahradí nákup za modelových 5 Kč/kWh a bez baterie byste získali 1 Kč/kWh za výkup, dodatečný hrubý přínos činí 3 500 Kč ročně. Po odečtení dodatečných nákladů může být výrazně nižší. Srovnávejte pouze rozdíl mezi jinak stejnými nabídkami.</p><a class="se-btn se-btn-primary" href="'.$url.'">Spočítat návratnost samotné baterie →</a></aside>';
    } elseif((int)$post->ID===1168 && $post->post_name==='jak-dlouho-vydrzi-baterie-fotovoltaika') {
        if(substr_count($content,'data-se-battery-runtime-v1="1"')!==1) return $content;
        $pattern='~<h3(?:\s[^>]*)?>\s*Časté dotazy\s*</h3>~u';
        $block='<aside data-se-grid-battery-path-v1="runtime" style="padding:16px;margin:18px 0;background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:12px"><strong>Delší výdrž ještě neznamená lepší návratnost.</strong><p>Rozšíření úložiště o 5 kWh přinese peněžní úsporu jen z dodatečné energie, kterou skutečně uložíte a později využijete. Pokud navíc uložíte 500 kWh za rok a po ztrátách využijete 450 kWh, při modelovém nákupu 5 Kč/kWh a výkupu 1 Kč/kWh jde o 1 750 Kč hrubého přínosu ročně. Při příplatku 40 000 Kč je jednoduchá návratnost před dalšími náklady asi 22,9 roku. Jde o příklad, ne cenovou nabídku. Hodnotu zálohy posuzujte zvlášť.</p><a class="se-btn se-btn-primary" href="'.$url.'">Přepočítat ekonomiku větší baterie →</a></aside>';
    } else return $content;
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_grid_battery_calculator_paths_v1',24);
