<?php
/**
 * Bounded editorial bridges from existing topic guides to two published
 * purchase-intent articles. These are crawlable links, not affiliate ads.
 *
 * Do not modify indexed post bodies, canonical URLs, post dates or metadata.
 * Keeping the guide choice source-specific also avoids sending residential
 * rooftop buyers into the off-grid equipment journey by default.
 */
if ( ! defined('ABSPATH') ) { exit; }

function solar_expert_buyer_bridge_map() {
  return array(
    'kolik-panelu-je-potreba-na-jeden-string' => array(
      'kind' => 'mppt',
      'headline' => 'Vybíráte MPPT k panelu 400 W?',
      'explanation' => 'Po kontrole počtu panelů v sérii ověřte napětí stringu, baterie a nabíjecí proud konkrétního regulátoru.',
      'guide_slug' => 'jak-vybrat-mppt-regulator-pro-400w-panel',
      'guide_label' => 'Jak vybrat MPPT pro 400W panel →',
      'tool_slug' => 'mppt-kalkulacka',
      'tool_label' => 'Přepočítat MPPT podle datasheetu →',
    ),
    'jak-zapojit-solarni-panely' => array(
      'kind' => 'mppt',
      'headline' => 'Znáte sérii a paralelní zapojení. Jaký MPPT zvolit?',
      'explanation' => 'Na příkladu 400W panelu porovnejte 12V a 24V baterii, cold Voc, pracovní Vmp a proud regulátoru.',
      'guide_slug' => 'jak-vybrat-mppt-regulator-pro-400w-panel',
      'guide_label' => 'MPPT k panelu 400 W: nákupní průvodce →',
      'tool_slug' => 'mppt-kalkulacka',
      'tool_label' => 'Zkontrolovat parametry MPPT →',
    ),
    'pridani-dalsich-solarnich-panelu-ke-stavajicimu-solarnimu-systemu' => array(
      'kind' => 'mppt',
      'headline' => 'Přidáváte panely k ostrovnímu systému?',
      'explanation' => 'Po rozšíření panelového pole přepočítejte výkon, sériové Voc i paralelní Isc. Větší panel nemusí být kompatibilní s původním MPPT.',
      'guide_slug' => 'jak-vybrat-mppt-regulator-pro-400w-panel',
      'guide_label' => 'Průvodce výběrem MPPT pro 400 W →',
      'tool_slug' => 'mppt-kalkulacka',
      'tool_label' => 'Ověřit regulátor pro nové pole →',
    ),
    'tepelne-cerpadlo-nebo-elektrokotel' => array(
      'kind' => 'electric-heating-fve',
      'headline' => 'Topíte elektrokotlem a uvažujete o solárech?',
      'explanation' => 'Elektrokotel potřebuje nejvíce kWh v zimě, kdy FVE zpravidla vyrábí méně. Oddělte roční úsporu a zimní odběr, pak porovnejte s tepelným čerpadlem.',
      'guide_slug' => 'fotovoltaika-a-elektrokotel',
      'guide_label' => 'FVE k elektrokotli: spotřeba a návratnost →',
      'tool_slug' => 'kolik-stoji-fotovoltaika',
      'tool_label' => 'Domovní FVE: porovnání nabídky →',
    ),
    'sady-pro-solarni-napajeni-kompletni-pruvodce' => array(
      'kind' => 'cottage',
      'headline' => 'Má solární sada napájet lednici na chatě?',
      'explanation' => 'Nejdříve sečtěte denní Wh spotřebičů, autonomii baterie a rozběhovou špičku 230V kompresoru. Potom vybírejte komponenty.',
      'guide_slug' => 'solarni-sestava-na-chatu-pro-lednici',
      'guide_label' => 'Jak sestavit solární napájení lednice →',
      'tool_slug' => 'solarni-sestava-na-chatu',
      'tool_label' => 'Spočítat vlastní sestavu na chatu →',
    ),
    'jak-funguji-solarni-baterie-pruvodce-skladovanim-energie' => array(
      'kind' => 'cottage',
      'headline' => 'Jak velkou baterii potřebuje chata s lednicí?',
      'explanation' => 'Kapacitu baterie určujte z denní spotřeby v kWh, rezervy a napětí celé sestavy; potřebný výkon měniče je samostatná podmínka.',
      'guide_slug' => 'solarni-sestava-na-chatu-pro-lednici',
      'guide_label' => 'Modelový výpočet chaty s lednicí →',
      'tool_slug' => 'vyber-baterii',
      'tool_label' => 'Vybrat baterii podle kWh a BMS →',
    ),
  );
}

function solar_expert_append_buyer_bridge($content) {
  if ( is_admin() || ! is_singular('post') || ! in_the_loop() || ! is_main_query() || is_feed() ) {
    return $content;
  }

  $post = get_queried_object();
  $slug = $post && ! empty($post->post_name) ? (string) $post->post_name : '';
  $map = solar_expert_buyer_bridge_map();
  if ( ! isset($map[$slug]) || strpos($content, 'data-se-buyer-bridge=') !== false ) {
    return $content;
  }

  $item = $map[$slug];
  // A post might already contain a hand-edited, fully equivalent editorial
  // route. Respect that route instead of repeating its target URL in a CTA.
  $target_path = '/' . $item['guide_slug'] . '/';
  if ( strpos($content, 'href="' . $target_path . '"') !== false
       || strpos($content, 'href="' . home_url($target_path) . '"') !== false ) {
    return $content;
  }

  $guide_url = home_url($target_path);
  $tool_url = home_url('/' . $item['tool_slug'] . '/');
  $aside = '<aside class="se-note se-related-guides se-buyer-bridge" data-se-buyer-bridge="' . esc_attr($item['kind']) . '">'
    . '<h3>' . esc_html($item['headline']) . '</h3>'
    . '<p>' . esc_html($item['explanation']) . '</p>'
    . '<p class="se-actions">'
    . '<a class="se-btn se-btn-primary" href="' . esc_url($guide_url) . '">' . esc_html($item['guide_label']) . '</a> '
    . '<a class="se-btn" href="' . esc_url($tool_url) . '">' . esc_html($item['tool_label']) . '</a>'
    . '</p></aside>';

  return $content . $aside;
}
add_filter('the_content', 'solar_expert_append_buyer_bridge', 22);
