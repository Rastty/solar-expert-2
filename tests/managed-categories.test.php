<?php
/**
 * Deterministic taxonomy regression for new managed guides. Exercises the
 * production category helper with stubbed WordPress state, no external writes.
 */
class WP_Error {
  private $message;
  function __construct($code, $message) { $this->message = $message; }
  function get_error_message() { return $this->message; }
}
function is_wp_error($value) { return $value instanceof WP_Error; }
function sanitize_title($value) { return preg_replace('/[^a-z0-9-]/', '', strtolower((string)$value)); }
$GLOBALS['terms'] = array(
  'solarni-panely' => (object) array('term_id' => 4),
  'tepelna-cerpadla' => (object) array('term_id' => 9),
);
$GLOBALS['categories'] = array(
  100 => array(1),  // Legacy editorial category preserved.
  101 => array(4),
  102 => array(1,9), // Another category preserved.
);
$GLOBALS['writes'] = 0;
if (!defined('OBJECT')) define('OBJECT', 'OBJECT');
class WP_Post {
  public $ID;
  public $post_status;
  function __construct($id,$status='publish') { $this->ID=$id; $this->post_status=$status; }
}
$GLOBALS['post_by_slug'] = array(
  'kolik-stoji-fotovoltaika' => new WP_Post(100),
  'fotovoltaika-na-pozemku' => new WP_Post(104),
  'pruhledne-solarni-panely' => new WP_Post(105),
  'tepelne-cerpadlo-vzduch-vzduch' => new WP_Post(102),
  'tepelne-cerpadlo-monoblok' => new WP_Post(106),
  'solarni-sestava-na-chatu-pro-lednici' => new WP_Post(107),
  'jak-vybrat-mppt-regulator-pro-400w-panel' => new WP_Post(108),
);
function get_page_by_path($slug,$output,$type) {
  return $type === 'post' ? ($GLOBALS['post_by_slug'][$slug] ?? null) : null;
}
function get_category_by_slug($slug) { return $GLOBALS['terms'][$slug] ?? false; }
function wp_get_post_categories($id) { return $GLOBALS['categories'][$id] ?? array(); }
function wp_set_post_categories($id, $categories, $append) {
  if (!$append) { return new WP_Error('replace', 'Must always append categories'); }
  $GLOBALS['writes']++;
  $GLOBALS['categories'][$id] = array_values(array_unique(array_merge($GLOBALS['categories'][$id] ?? array(), $categories)));
  return $GLOBALS['categories'][$id];
}
function check($ok, $msg) { if (!$ok) { throw new RuntimeException($msg); } }
$manifest = json_decode(file_get_contents(dirname(__DIR__) . '/content/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
$expected = array(
  'kolik-stoji-fotovoltaika' => 'solarni-panely',
  'fotovoltaika-na-pozemku' => 'solarni-panely',
  'pruhledne-solarni-panely' => 'solarni-panely',
  'tepelne-cerpadlo-vzduch-vzduch' => 'tepelna-cerpadla',
  'tepelne-cerpadlo-monoblok' => 'tepelna-cerpadla',
  'solarni-sestava-na-chatu-pro-lednici' => 'solarni-panely',
  'jak-vybrat-mppt-regulator-pro-400w-panel' => 'solarni-panely',
);
$categorized = array();
foreach ($manifest['items'] as $item) {
  if (isset($item['category_slug'])) {
    check(($item['type'] ?? null) === 'post', 'Only posts may receive the category directive');
    $categorized[$item['slug']] = $item['category_slug'];
  }
}
check($categorized === $expected || count(array_diff_assoc($expected,$categorized))===0 && count($categorized)===count($expected),
  'Only the seven supported new published guides should carry taxonomy directives');
$source = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($source, 'function solar_expert_ensure_managed_category(');
$to = strpos($source, 'function solar_expert_sync_managed_content(', $from);
check($from !== false && $to > $from, 'Production taxonomy helper must be extractable');
eval(substr($source, $from, $to-$from));

check(solar_expert_ensure_managed_category(100,'solarni-panely') === true,'Missing solar category must be appended');
check($GLOBALS['categories'][100] === array(1,4),'Existing editorial category must not be removed');
check(solar_expert_ensure_managed_category(100,'solarni-panely') === false,'Same taxonomy sync must be no-op');
check(solar_expert_ensure_managed_category(101,'solarni-panely') === false,'Already assigned category must remain unchanged');
check(solar_expert_ensure_managed_category(102,'tepelna-cerpadla') === false,'Existing heat-pump category must remain');
check($GLOBALS['writes'] === 1,'Idempotent taxonomy sync should create exactly one write');
check(is_wp_error(solar_expert_ensure_managed_category(103,'nonexistent-category')),'Missing taxonomy must fail closed');
check(!isset($GLOBALS['categories'][103]),'Missing taxonomy must not write arbitrary terms');
check(strpos($source,'wp_set_post_categories')>=0,'Production helper must use WP taxonomy API');

$before = solar_expert_managed_category_state($manifest);
check($before['targets'] === 7 && $before['ready'] === 2 && $before['errors'] === 5,
  'Read-only taxonomy audit must discover five remaining missing assignments');
$previousWrites=$GLOBALS['writes'];
$repaired = solar_expert_reconcile_managed_categories($manifest);
check($repaired['updated'] === 5 && !$repaired['errors'], 'Taxonomy-only repair must add five missing categories');
check($GLOBALS['writes'] === $previousWrites + 5, 'Taxonomy-only reconciliation should not re-write existing terms');
check($GLOBALS['categories'][102] === array(1,9), 'Existing editorial term preserved after reconciliation');
$after = solar_expert_managed_category_state($manifest);
check($after['ready'] === 7 && $after['errors'] === 0, 'Every declared managed post category must be ready');
check(solar_expert_reconcile_managed_categories($manifest)['updated'] === 0,
  'Reconciliation must be fully idempotent even when the manifest fingerprint is current');
echo "PASS: seven manifest categories, append-only taxonomy, idempotence and fail-closed lookup\n";
