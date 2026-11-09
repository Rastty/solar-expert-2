<?php
/**
 * Keep category landing pages focused on editor-reviewed, repo-managed guides.
 *
 * This controls discovery ONLY on the two broad editorial category archives.
 * It does not delete posts, change their URL, canonical, sitemap, indexability,
 * RSS feeds, or the WordPress admin. Unmanaged posts remain publicly accessible
 * at their original URL; the sitemap continues to handle their discovery.
 */
if ( ! defined('ABSPATH') ) { exit; }

function solar_expert_curated_archive_post_slugs() {
  $manifest_file = get_template_directory() . '/content/manifest.json';
  if ( ! is_readable($manifest_file) ) { return array(); }
  $manifest = json_decode((string) file_get_contents($manifest_file), true);
  if ( ! is_array($manifest) || ! isset($manifest['items']) || ! is_array($manifest['items']) ) {
    return array();
  }
  $allowed = array();
  foreach ( $manifest['items'] as $item ) {
    if ( ! is_array($item) || ($item['type'] ?? '') !== 'post' ) { continue; }
    // Managed rewrites have been explicitly selected for the editorial refresh.
    $slug = (string) ($item['slug'] ?? '');
    if ( ($item['file'] ?? '') === '' || ! preg_match('/^[a-z0-9-]+$/', $slug) ) { continue; }
    $allowed[] = $slug;
  }
  // Explicitly retain existing GSC near-wins not yet in the managed rewrite
  // manifest, until their editorial refresh is reviewed. Do not lose links
  // just because an article has not yet moved to Git-first publishing.
  $gsc_protected = array(
    'vrt-pro-tepelne-cerpadlo',
    'proc-jsou-tepelna-cerpadla-tak-draha',
    'castecne-zastineni-a-solarni-panely',
  );
  return array_values(array_unique(array_merge($allowed, $gsc_protected)));
}

function solar_expert_filter_curated_category_archives($query) {
  if ( is_admin() || ! $query->is_main_query() || $query->is_feed() ) { return; }
  if ( ! $query->is_category(array('solarni-panely', 'tepelna-cerpadla')) ) { return; }

  $slugs = solar_expert_curated_archive_post_slugs();
  // Manifest missing/truncated? Fail open instead of accidentally emptying
  // a live archive (and creating unnecessary indexation churn).
  if ( count($slugs) < 15 ) { return; }
  $query->set('post_name__in', $slugs);
}
add_action('pre_get_posts', 'solar_expert_filter_curated_category_archives');
