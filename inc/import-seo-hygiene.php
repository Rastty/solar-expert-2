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
  // Bounded, verified same-title EIA imports. Do not match arbitrary news.
  for ( $i = 1; $i <= 19; $i++ ) {
    $slugs[] = 'dnes-v-energetice-us-energy-information-administration-eia-' . $i;
  }
  return $slugs;
}

function solar_expert_managed_cleanup_protection_slugs() {
  static $protected = null;
  if ( $protected !== null ) { return $protected; }

  // If the authoritative manifest is absent/corrupt, fail open.
  $path = get_template_directory() . '/content/manifest.json';
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
    'posts_per_page' => 40,
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
