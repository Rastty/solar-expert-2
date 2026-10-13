<?php
/** Regression for curation of broad category archive discovery only. */
define('ABSPATH', __DIR__ . '/');
$GLOBALS['se_test_root'] = dirname(__DIR__);
$GLOBALS['se_test_admin'] = false;
$GLOBALS['se_hooks'] = array();
function get_template_directory() { return $GLOBALS['se_test_root']; }
function is_admin() { return $GLOBALS['se_test_admin']; }
function add_action($hook, $callback) { $GLOBALS['se_hooks'][$hook] = $callback; }
function check($ok, $reason) { if (!$ok) { throw new RuntimeException($reason); } }
class TestArchiveQuery {
  private $slug;
  private $main;
  private $feed;
  public $values = array();
  function __construct($slug, $main = true, $feed = false) {
    $this->slug = $slug; $this->main = $main; $this->feed = $feed;
  }
  function is_main_query() { return $this->main; }
  function is_feed() { return $this->feed; }
  function is_category($categories) { return in_array($this->slug, $categories, true); }
  function set($key, $value) { $this->values[$key] = $value; }
}
require dirname(__DIR__) . '/inc/curated-archives.php';
check(($GLOBALS['se_hooks']['pre_get_posts'] ?? null) === 'solar_expert_filter_curated_category_archives',
  'Must only register the main-query category filter');

$manifest = json_decode(file_get_contents(dirname(__DIR__) . '/content/manifest.json'), true);
$managed = array_values(array_map(fn($x) => $x['slug'], array_filter($manifest['items'], fn($x) => ($x['type'] ?? '') === 'post')));
$selected = solar_expert_curated_archive_post_slugs();
check(count($managed) >= 40 && count($selected) >= 40, 'Expected editorial review manifest to contain dozens of posts');
foreach ($managed as $slug) {
  check(in_array($slug, $selected, true), 'Every reviewed managed post must remain discoverable: ' . $slug);
}
foreach (array('vrt-pro-tepelne-cerpadlo', 'proc-jsou-tepelna-cerpadla-tak-draha', 'castecne-zastineni-a-solarni-panely') as $slug) {
  check(in_array($slug, $selected, true), 'Protect known GSC ranking opportunity: ' . $slug);
}
foreach (array('dnes-v-energetice-us-energy-information-administration-eia',
               'solarni-energie-klady-a-zapory-forbes-home') as $slug) {
  check(!in_array($slug, $selected, true), 'Unreviewed syndicated content must not dominate archive: ' . $slug);
}
foreach (array('solarni-panely', 'tepelna-cerpadla') as $category) {
  $query = new TestArchiveQuery($category);
  solar_expert_filter_curated_category_archives($query);
  check(($query->values['post_name__in'] ?? null) === $selected, 'Curated query must use only reviewed and protected slugs');
  check(count($query->values) === 1, 'Do not change canonical, pagination, post state, or arbitrary query fields');
}
foreach (array(new TestArchiveQuery('baterie'), new TestArchiveQuery('solarni-panely',false),
               new TestArchiveQuery('solarni-panely',true,true)) as $query) {
  solar_expert_filter_curated_category_archives($query);
  check($query->values === array(), 'Other categories, feeds and non-main queries must be unchanged');
}
$GLOBALS['se_test_admin'] = true;
$query = new TestArchiveQuery('tepelna-cerpadla');
solar_expert_filter_curated_category_archives($query);
check($query->values === array(), 'Never filter wp-admin');
$GLOBALS['se_test_admin'] = false;
$GLOBALS['se_test_root'] = '/nonexistent-solar-theme-root';
$query = new TestArchiveQuery('solarni-panely');
solar_expert_filter_curated_category_archives($query);
check($query->values === array(), 'Missing manifest must fail open');
echo 'PASS: reviewed Solar Expert category archives, GSC preservation and safe fail-open scope'.PHP_EOL;
