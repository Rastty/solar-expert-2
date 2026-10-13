<?php
/**
 * SEO hygiene pilot: explicitly identified imported foreign-market news.
 *
 * Strict editorial denylist, NOT an automatic quality score. Never infer
 * low quality from age, category, publication frequency or GSC zero clicks.
 * No deletion/redirect; public originals remain readable. If a post is later
 * brought into the managed editorial manifest, do not suppress it here.
 *
 * Source: public WordPress GET 2026-10-13, EIA duplicate-title series and
 * unambiguously foreign USA tax/energy pieces. Review before expanding.
 */
if ( ! defined('ABSPATH') ) { exit; }

function solar_expert_import_cleanup_slugs() {
  $slugs = array(
    'dnes-v-energetice-us-energy-information-administration-eia',
    'elektrina-v-usa-us-energy-information-administration-eia',
    'solarni-tepelne-elektrarny-us-energy-information-administration-eia',
    'fotovoltaika-a-elektrina-us-energy-information-administration-eia',
    'kde-se-nachazi-solarni-energie-us-energy-information-administration-eia',
    'kratkodoby-energeticky-vyhled-us-energy-information-administration-eia',
    'pokyny-k-formulari-5695-narokovani-slevy-na-solarni-dan',
    'podrobnosti-o-solarnim-danovem-kreditu-hr-block',
    'spolecnost-chvalen-za-instalaci-solarnich-panelu-jamajska-informacni-sluzba',
    'solarni-energie-pro-vsechny-spolecnosti-v-guardsman-group-jamajska-informacni-sluzba',
  );
  // Strictly named foreign-origin reporting reviewed against the 13 Oct 2026
  // full 476-post public WordPress inventory, not broad category/date filters.
  // Keep general Czech buyer-information posts eligible for further refresh.
  $slugs = array_merge($slugs, array(
    'solarni-se-stava-spickovym-zdrojem-elektriny-v-kalifornii-casopis-pv-usa',
    'virginie-az',
    'zmena-klimatu-seia',
    'jak-to-funguje-energysage',
    'solarni-energie-v-queenslandu-informace-statistiky-a-zdroje',
    'vysvetleni-faktu-o-energetice-v-usa-spotreba-a-vyroba',
    'domaci-solarni-energie-v-tasmanii',
    'solar-vysvetleno-us-energy-information-administration-eia',
    'australska-energeticka-fakta-geoscience-australie',
    'zatazene-dny-a-slunecni-pole-nesdis',
    'solarni-energie-seia',
    'rozhodujete-se-zda-nainstalovat-solarni-panely-na-vas-dum-pomoci-muze-novy-webovy-nastroj-nist',
    'temna-strana-obnovitelnych-technologii-informacni-vek',
    'dekada-americkeho-solarniho-rustu',
    'adopce-domacich-solarnich-panelu-v-usa-stale-roste',
    '3-prekvapiva-fakta-o-solarni-energii-u-disney',
    'energeticky-plan-oshkosh-podrobne-popisuje-ambiciozni-premenu-na-solarni-energii-audio',
    'setrim-penize-pomoci-solarni-energie-v-mem-dome-pral-bych-si-aby-kazda-rodina-v-irsku-mohla',
    'solar-for-all-ministerstvo-obchodu-statu-washington',
    'vysvetleni-biomasy-us-energy-information-administration-eia',
    'slunecni-stat-podle-statu-seia',
    'program-solar-for-all-kalifornska-energeticka-komise',
    'dekada-rustu-pro-solarni-a-vetrnou-energii-usa',
    'fakta-o-ciste-energii-popiraji-bezne-myty-yale-climate-connections',
    'gsa-hleda-informace-od-prumyslu-o-domaci-vyrobe-solarnich-panelu',
    'flexibilni-solarni-clanky-nove-generace-csiro-vyletely-do-vesmiru',
    'co-bude-dal-po-bankrotu-solarniho-instalatoru-sunpower',
    'urad-guvernera-guverner-murphy-oznamuje-novou-pobidku-na-podporu-rozvoje-solarni-energie-informacni-centrum-na-pomoc-obcim-a-developerum-se-solarnimi-projekty',
    'solarni-portal-dilli-pred-instalaci-stresnich-solarnich-panelu-se-seznamte-s-klicovymi-detaily',
    'solar-together-startuje-ve-west-midlands',
    'proc-prumysl-ciste-energie-roste-navzdory-trumpovym-utokum-npr',
    'mi-solar-pro-vsechny',
    'mi-solar-pro-vsechny-pilotni-projekty',
    'energeticke-spolecnosti-jiz-vasi-solarni-energii-nechteji-informacni-vek',
    'pravni-ne-primocare-spolecnost-zabyvajici-se-solarni-energii-poskytuje-zakaznikum-zavadejici-informace-zpravy',
    'danove-ulevy-na-solarni-panely-po-celem-svete',
    'prumerna-denni-vyroba-solarnich-fotovoltaickych-clanku-v-australii',
  ));
  // Bounded, verified same-title EIA imports. Do not match arbitrary news.
  for ( $i = 1; $i <= 19; $i++ ) {
    $slugs[] = 'dnes-v-energetice-us-energy-information-administration-eia-' . $i;
  }
  return $slugs;
}


/** Immutable protection from 13 Oct 2026 Prometheus GSC near-win/query observations. */
function solar_expert_import_gsc_protected_slugs() {
  return array(
    'castecne-zastineni-a-solarni-panely',
    'chlazeni-fotovoltaickych-panelu',
    'co-je-1-kwp',
    'fotovoltaika-na-eternitovou-strechu',
    'jak-funguji-solarni-panely-na-plochych-strechach',
    'jak-vycistit-solarni-panely-pruvodce-cistenim-solaru',
    'jak-zapojit-solarni-panely',
    'kolik-panelu-je-potreba-na-jeden-string',
    'kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem',
    'kolik-vyrobi-fotovoltaika-za-hodinu',
    'kolik-vyrobi-fotovoltaika-za-rok',
    'kompletni-pruvodce-velikosti-solarnich-panelu',
    'kotveni-fotovoltaickych-panelu-na-ploche-strese',
    'nataceni-solarnich-panelu-za-sluncem',
    'nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu',
    'polohovani-solarnich-panelu',
    'proc-jsou-tepelna-cerpadla-tak-draha',
    'proc-se-solarni-panely-neprehrivaji',
    'recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady',
    'tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti',
    'tepelna-cerpadla-lg-vyhody-nevyhody-ceny',
    'tepelne-cerpadlo-nebo-elektrokotel',
    'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda',
    'velikost-rozmery-a-hmotnost-solarnich-panelu',
    'vrt-pro-tepelne-cerpadlo',
    'vysvetleni-solarnich-panelu-pv-t',
  );
}

function solar_expert_managed_cleanup_protection_slugs() {
  static $protected = null;
  static $cached_path = null;
  $path = get_template_directory() . '/content/manifest.json';
  if ( $path === $cached_path ) { return $protected; }
  $cached_path = $path;
  $protected = null; // Never reuse a previous valid allowlist after a path/manifest failure.

  // If the authoritative manifest is absent/corrupt, fail open.
  if ( ! is_readable($path) ) { return null; }
  $manifest = json_decode((string) file_get_contents($path), true);
  if ( ! is_array($manifest) || ! isset($manifest['items']) || ! is_array($manifest['items']) ) {
    return null;
  }
  $protected = array();
  foreach ( $manifest['items'] as $item ) {
    if ( is_array($item) && ! empty($item['slug']) ) {
      $protected[(string) $item['slug']] = true;
    }
  }
  return $protected;
}

function solar_expert_is_low_value_import($post) {
  if ( ! ($post instanceof WP_Post) || $post->post_type !== 'post' || $post->post_status !== 'publish' ) {
    return false;
  }
  $protected = solar_expert_managed_cleanup_protection_slugs();
  if ( $protected === null || isset($protected[$post->post_name]) ) { return false; }
  if ( in_array((string) $post->post_name, solar_expert_import_gsc_protected_slugs(), true) ) { return false; }
  return in_array((string) $post->post_name, solar_expert_import_cleanup_slugs(), true);
}

function solar_expert_low_value_import_robots($robots) {
  if ( is_admin() || ! is_singular('post') || ! solar_expert_is_low_value_import(get_queried_object()) ) {
    return $robots;
  }
  // Yoast is active on production and owns the robots meta. Follow permits
  // discovery of any editorial outbound/internal links still in the article.
  return 'noindex, follow';
}
add_filter('wpseo_robots', 'solar_expert_low_value_import_robots', 30);

function solar_expert_exclude_low_value_imports_from_sitemap($excluded_post_ids) {
  $excluded_post_ids = is_array($excluded_post_ids) ? $excluded_post_ids : array();
  $protected = solar_expert_managed_cleanup_protection_slugs();
  if ( $protected === null ) { return $excluded_post_ids; }

  // One bounded indexed WordPress query, not 500 per-post lookups on
  // every sitemap request. Yoast merges this filter with redirect exclusions.
  $posts = get_posts(array(
    'post_type' => 'post',
    'post_status' => 'publish',
    'post_name__in' => solar_expert_import_cleanup_slugs(),
    'posts_per_page' => count(solar_expert_import_cleanup_slugs()),
    'no_found_rows' => true,
    'fields' => 'ids',
    'suppress_filters' => true,
  ));
  foreach ( $posts as $id ) {
    $post = get_post((int) $id);
    if ( solar_expert_is_low_value_import($post) ) {
      $excluded_post_ids[] = (int) $id;
    }
  }
  return array_values(array_unique(array_map('intval', $excluded_post_ids)));
}
add_filter('wpseo_exclude_from_sitemap_by_post_ids', 'solar_expert_exclude_low_value_imports_from_sitemap', 20);
