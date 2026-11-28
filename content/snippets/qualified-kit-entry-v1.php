/** Contextual purchase paths, no duplicate product cards or catalogue changes. */
function solar_expert_qualified_kit_entry_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || strpos($content,'data-se-qualified-kit-entry-v1')!==false) return $content;
    $entries=array(
        'co-je-1-kwp'=>array(
            'pattern'=>'~<h2(?:\s[^>]*)?>\s*Je 1 kWp dost pro chatu\?\s*</h2>~u',
            'prior'=>'data-se-kwp-cabin-balance="v1"',
            'title'=>'Kupujete sestavu kolem 1 kWp?',
            'intro'=>'Při výběru hotové sady porovnejte skutečný denní odběr, využitelnou kapacitu baterie a výkon měniče. Dva panely po 450 Wp znamenají 0,9 kWp; tři dávají 1,35 kWp. Při ilustračních 3 hodinách ekvivalentního plného slunce a souhrnném koeficientu 0,75 jde asi o 2,03 nebo 3,04 kWh za den. Nejde o garantovanou výrobu.',
            'decision'=>'Při modelové spotřebě 1,5 kWh denně a dvou dnech bez slunce potřebujete přibližně 4,17 kWh nominální LiFePO₄ (80 % dostupné energie, 90 % účinnost měniče). U GEL akumulátorů nepřebírejte stejnou hloubku vybití.',
            'target'=>'/sady-pro-solarni-napajeni-kompletni-pruvodce/#se-complete-kit-offers-title',
            'cta'=>'Porovnat hotové solární sady →',
            'secondary'=>'/solarni-sestava-na-chatu/',
            'secondary_label'=>'Spočítat vlastní spotřebu →'),
        'solarni-sestava-na-chatu-pro-lednici'=>array(
            'id'=>1613,
            'pattern'=>'~<h2(?:\s[^>]*)?>\s*Kolik solárních panelů na lednici na chatě\s*</h2>~u',
            'prior'=>'data-se-fridge-real-budget-v1="1"',
            'title'=>'Koupit celou sestavu, nebo jen doplnit baterii?',
            'intro'=>'Máte-li už kompatibilní panel, regulátor a měnič, může být výhodnější doplnit akumulaci po kontrole BMS a nabíjení. Pokud začínáte od nuly, porovnejte kompletní sady s uvedenými modelovými požadavky lednice a ostatních spotřebičů.',
            'decision'=>'Například 4,8 kWh nominální GEL při ilustrativním využití 50 % poskytne 2,4 kWh DC. Při našem modelu odběru z baterie 1,09 kWh denně jde zhruba o 2,2 dne bez dobíjení. Rezerva je malá; ověřte skutečnou vybíjecí charakteristiku, klidový odběr měniče a rozběh kompresoru. Nejde o potvrzení konkrétní sady.',
            'target'=>'/sady-pro-solarni-napajeni-kompletni-pruvodce/#se-complete-kit-offers-title',
            'cta'=>'Porovnat kompletní sady pro chatu →',
            'secondary'=>'/vyber-baterii/',
            'secondary_label'=>'Porovnat jen baterie →'),
        'solarni-panel-do-garaze-bez-elektriny'=>array(
            'pattern'=>'~<h2(?:\s[^>]*)?>\s*Co koupit až po ověření spotřeby\s*</h2>~u',
            'title'=>'Co koupit pro garáž: malý DC systém, nebo celou sestavu?',
            'intro'=>'Pro samotné LED osvětlení nebo malé DC spotřebiče často nemá smysl kupovat velký 230V měnič. Pro 400Wp panel a 12V či 24V baterii porovnejte konkrétní MPPT podle napětí, návrhového Isc, Voc v mrazu a nabíjecího proudu.',
            'decision'=>'Pro 468 Wh/den na straně zátěže, dva dny bez výroby a modelovou 90% účinnost DC napájení potřebujete asi 1,30 kWh nominální baterie při 80% využití. Je to výchozí orientace, nikoli schválené napájení vrat; u jejich pohonu má přednost výrobcem povolené řešení.',
            'target'=>'/jak-vybrat-mppt-regulator-pro-400w-panel/#se-mppt-offer-title',
            'cta'=>'Porovnat konkrétní MPPT regulátory →',
            'secondary'=>'/sady-pro-solarni-napajeni-kompletni-pruvodce/#se-complete-kit-offers-title',
            'secondary_label'=>'Pro více spotřebičů: celé sady →')
    );
    if(!isset($entries[$post->post_name])) return $content;
    $r=$entries[$post->post_name];
    if(isset($r['id'])&&(int)$post->ID!==$r['id']) return $content;
    if(isset($r['prior'])&&substr_count($content,$r['prior'])!==1) return $content;
    if(preg_match_all($r['pattern'],$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block='<section data-se-qualified-kit-entry-v1="1" aria-label="Další krok k nákupu" style="margin:22px 0;padding:clamp(16px,4vw,24px);background:#eff8f5;color:#142e2b;border:1px solid #c9ddd9;border-radius:14px;line-height:1.6"><p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase;letter-spacing:.04em">Od výpočtu k nákupu</p><h3 style="margin:8px 0;color:#142e2b">'.esc_html($r['title']).'</h3><p>'.esc_html($r['intro']).'</p><p style="padding:12px;background:#fff;border:1px solid #c9ddd9;border-radius:10px">'.esc_html($r['decision']).'</p><p style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:0"><a class="se-btn se-btn-primary" href="'.esc_url($r['target']).'">'.esc_html($r['cta']).'</a><a class="se-btn" href="'.esc_url($r['secondary']).'">'.esc_html($r['secondary_label']).'</a></p><p style="font-size:.85em;margin:10px 0 0">V navazujícím srovnání najdete také partnerské nabídky; cenu, dostupnost a kompatibilitu ověřte před objednáním.</p></section>';
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_qualified_kit_entry_v1',21);
