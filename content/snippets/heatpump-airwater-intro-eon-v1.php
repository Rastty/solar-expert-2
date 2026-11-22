/** Contextual, independently labeled comparison offer, no content overwrite. */
function solar_expert_heatpump_airwater_intro_v1($content) {
    if (is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() ||
        !is_string($content) || strlen($content) > 600000) return $content;
    $post = get_queried_object();
    if (!($post instanceof WP_Post) ||
        $post->post_name !== 'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji') return $content;
    if (strpos($content,'data-se-heatpump-intro-offer="v1"') !== false) return $content;
    $merchant = 'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/';
    // Preserve independent original offer/attribution at the end; if that
    // article source changes, do not inject a potentially off-target lead.
    if (strpos($content,$merchant) === false) return $content;
    if (!preg_match('/<\/p\s*>/i',$content,$m,PREG_OFFSET_CAPTURE)) return $content;
    $offset = $m[0][1] + strlen($m[0][0]);
    $html = <<<'SOLAR_HEATPUMP_AIRWATER_INTRO_V1'
<aside class="se-heatpump-intro-offer" data-se-heatpump-intro-offer="v1" aria-label="Nezávazná nabídka tepelného čerpadla" style="margin:1.1rem 0;padding:1rem 1.1rem;border:1px solid #cbd5d1;border-radius:10px;background:#f7faf8;color:#203129">
  <p style="margin:0 0 .4rem"><strong>Řešíte tepelné čerpadlo vzduch–voda pro svůj dům?</strong></p>
  <p style="margin:.3rem 0 .6rem">Pokud znáte orientační tepelnou ztrátu a víte, zda máte radiátory nebo podlahovku, můžete si nechat připravit nezávaznou nabídku E.ON a porovnat ji s dalšími dodavateli. Nechte si doložit výkon v mrazu, teplotu topné vody a rozsah montáže.</p>
  <p style="margin:.4rem 0"><a href="https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/" data-se-lead-id="eon-heat-pump" data-se-fallback="https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/" data-se-placement="heatpump_airwater_intro" rel="sponsored nofollow noopener" target="_blank">Nezávazně porovnat nabídku E.ON →</a></p>
  <p style="margin:.3rem 0 0;font-size:.83rem">Partnerský odkaz může Solar Expertu přinést provizi. Doporučení ani hodnocení produktu nejsou podmíněné provizí.</p>
</aside>
SOLAR_HEATPUMP_AIRWATER_INTRO_V1;
    return substr($content,0,$offset) . $html . substr($content,$offset);
}
add_filter('the_content','solar_expert_heatpump_airwater_intro_v1',20);
