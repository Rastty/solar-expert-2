<?php
/**
 * Real PHP managed-content sync regression with fake in-memory WP posts.
 * No WordPress, network, DB, or live publishing credentials.
 */
define('OBJECT', 'OBJECT');
class WP_Error {
  private $msg;
  function __construct($code, $message) { $this->msg = $message; }
  function get_error_message() { return $this->msg; }
}
function is_wp_error($value) { return $value instanceof WP_Error; }
function verify($condition, $message) {
  if (!$condition) throw new RuntimeException($message);
}
$GLOBALS['posts'] = array();
$GLOBALS['options'] = array();
$GLOBALS['meta'] = array();
$GLOBALS['cats'] = array();
$GLOBALS['post_writes'] = array();
$GLOBALS['category_writes'] = 0;
$GLOBALS['manifest'] = array('items'=>array());
$GLOBALS['src'] = tempnam(sys_get_temp_dir(), 'solar-native-editorial-');
file_put_contents($GLOBALS['src'], '<h2>Old Git text which must NOT overwrite new native WordPress content</h2>');
register_shutdown_function(function() { @unlink($GLOBALS['src']); });

function solar_expert_load_manifest() { return $GLOBALS['manifest']; }
function solar_expert_manifest_fingerprint($m) { return hash('sha256', json_encode($m)); }
function get_option($key, $default='') { return $GLOBALS['options'][$key] ?? $default; }
function update_option($key, $value, $autoload=false) { $GLOBALS['options'][$key] = $value; return true; }
function current_time($format, $gmt=false) { return '2026-11-08 12:34:56'; }
function sanitize_title($title) { return preg_replace('/[^a-z0-9-]/', '', strtolower($title)); }
function sanitize_text_field($str) { return (string)$str; }
function solar_expert_safe_content_file($relative) {
  return $relative === 'content/rewrites/test-native-post.html' ? $GLOBALS['src'] : false;
}
function get_page_by_path($slug,$output,$type) {
  return $GLOBALS['posts'][$type.':'.$slug] ?? null;
}
function wp_strip_all_tags($str) { return strip_tags($str); }
function wp_slash($arr) { return $arr; }
function wp_update_post($arr, $error) {
  $GLOBALS['post_writes'][] = array('op'=>'update','args'=>$arr);
  foreach ($GLOBALS['posts'] as $p) {
    if ($p->ID === ($arr['ID'] ?? null)) {
      $p->post_title = $arr['post_title'];
      $p->post_content = $arr['post_content'];
      $p->post_status = $arr['post_status'];
      return $p->ID;
    }
  }
  return new WP_Error('missing','No post');
}
function wp_insert_post($arr, $error) {
  $GLOBALS['post_writes'][] = array('op'=>'insert','args'=>$arr);
  return 123456;
}
function solar_expert_ensure_managed_category($id,$slug) {
  $old = $GLOBALS['cats'][$id] ?? array();
  if (in_array($slug, $old, true)) return false;
  $GLOBALS['cats'][$id][] = $slug;
  $GLOBALS['category_writes']++;
  return true;
}
function solar_expert_update_post_meta_if_changed($id,$key,$value) {
  if (($GLOBALS['meta'][$id][$key] ?? null) === $value) return false;
  $GLOBALS['meta'][$id][$key] = $value;
  return true;
}
function solar_expert_seo_meta($slug) {
  return array('title'=>'Reviewed SEO title', 'description'=>'Reviewed SEO description');
}

$code = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($code, 'function solar_expert_sync_managed_content(');
$to = strpos($code, 'function solar_expert_content_sync_state(', $from);
verify($from !== false && $to > $from, 'Production sync function was not found');
eval(substr($code, $from, $to - $from));

function item($overrides=array()) {
  return array_replace(array(
    'type'=>'post', 'slug'=>'test-native-post', 'title'=>'OLD THEME TITLE',
    'file'=>'content/rewrites/test-native-post.html',
    'create_if_missing'=>false, 'preserve_status'=>true,
    'native_editorial_owned'=>true, 'category_slug'=>'solarni-panely',
    'indexable'=>true
  ), $overrides);
}
function reset_state() {
  $GLOBALS['posts'] = array();
  $GLOBALS['options'] = array();
  $GLOBALS['meta'] = array();
  $GLOBALS['cats'] = array();
  $GLOBALS['post_writes'] = array();
  $GLOBALS['category_writes'] = 0;
}
function live_post($status='publish') {
  $p = (object)array(
    'ID'=>1618, 'post_title'=>'LIVE WP TITLE',
    'post_content'=>'LIVE NATIVE ARTICLE BODY WITH EDITOR UPDATES',
    'post_status'=>$status
  );
  $GLOBALS['posts']['post:test-native-post'] = $p;
  return $p;
}

reset_state();
$p = live_post();
$GLOBALS['manifest'] = array('items'=>array(item()));
$result = solar_expert_sync_managed_content(true);
verify($result['created'] === 0 && $result['updated'] === 0, 'Native posts are not theme-created/rewritten');
verify(!$GLOBALS['post_writes'], 'No body/title/status update or insert permitted for native post');
verify($p->post_title === 'LIVE WP TITLE', 'Native WordPress title preserved');
verify($p->post_content === 'LIVE NATIVE ARTICLE BODY WITH EDITOR UPDATES', 'Native WordPress body preserved');
verify($p->post_status === 'publish', 'Native WordPress publication state preserved');
verify($GLOBALS['cats'][1618] === array('solarni-panely'), 'Taxonomy may be reconciled append-only');
verify($GLOBALS['meta'][1618]['_yoast_wpseo_title'] === 'Reviewed SEO title', 'SEO may be updated');
verify($GLOBALS['meta'][1618]['_solar_expert_source_file'] === 'content/rewrites/test-native-post.html', 'Source attribution remains available');
solar_expert_sync_managed_content(true);
verify(!$GLOBALS['post_writes'] && $GLOBALS['category_writes']===1, 'Repeated native sync is idempotent');

reset_state();
$GLOBALS['manifest'] = array('items'=>array(item()));
$result = solar_expert_sync_managed_content(true);
verify($result['skipped'] === 1 && $result['created'] === 0, 'Absent native post is skipped, never recreated');
verify(!$GLOBALS['post_writes'] && !$GLOBALS['meta'], 'No WordPress writes for absent native post');

foreach (array(
  array('create_if_missing'=>true),
  array('preserve_status'=>false),
  array('type'=>'page'),
  array('create_if_missing'=>null),
  array('create_if_missing'=>1),
) as $bad) {
  reset_state();
  $p = live_post();
  $GLOBALS['manifest'] = array('items'=>array(item($bad)));
  $result = solar_expert_sync_managed_content(true);
  verify(count($result['errors']) === 1 && str_contains($result['errors'][0], ':invalid-native-editorial-contract'),
    'Unsafe native editorial manifest must fail closed: '.json_encode($bad));
  verify(!$GLOBALS['post_writes'] && !$GLOBALS['meta'], 'Unsafe native entry must not mutate any WP data');
  verify(!array_key_exists('solar_expert_content_fingerprint',$GLOBALS['options']),
    'Manifest fingerprint must not converge while contract is invalid');
}

reset_state();
$p = live_post('draft');
$GLOBALS['manifest'] = array('items'=>array(item()));
solar_expert_sync_managed_content(true);
verify($p->post_status === 'draft' && !$GLOBALS['post_writes'],
  'Native editorial status must remain draft if existing draft not yet released');

reset_state();
$p = live_post();
$GLOBALS['manifest'] = array('items'=>array(item(array('native_editorial_owned'=>false,
                                                         'create_if_missing'=>true,
                                                         'preserve_status'=>false))));
$result = solar_expert_sync_managed_content(true);
verify($result['updated'] === 1 && count($GLOBALS['post_writes']) === 1,
  'Existing normal theme-managed content must still update');
verify($p->post_content === '<h2>Old Git text which must NOT overwrite new native WordPress content</h2>',
  'Normal managed source sync still owns its content');

echo "PASS: exact production managed-content sync never overwrites native publisher posts; contract rejects unsafe directives\n";
