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
);
$categorized = array();
foreach ($manifest['items'] as $item) {
  if (isset($item['category_slug'])) {
    check(($item['type'] ?? null) === 'post', 'Only posts may receive the category directive');
    $categorized[$item['slug']] = $item['category_slug'];
  }
}
check($categorized === $expected || count(array_diff_assoc($expected,$categorized))===0 && count($categorized)===count($expected),
  'Only the five supported new published guides should carry taxonomy directives');
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
echo "PASS: five manifest categories, append-only taxonomy, idempotence and fail-closed lookup\n";
