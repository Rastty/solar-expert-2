<?php
/** Regression: ordinary WP lifecycle must not write managed posts by default. */
$hooks = array();
$writes = array();
$scheduled = array();
$state_calls = 0;
function check($condition, $message) {
  if (!$condition) throw new RuntimeException($message);
}
function add_action($hook, $callback, $priority=10, $accepted_args=1) {
  $GLOBALS['hooks'][$hook] = $callback;
}
function solar_expert_content_sync_state() {
  $GLOBALS['state_calls']++;
  return array('required'=>true);
}
function solar_expert_sync_managed_content($force=false) {
  $GLOBALS['writes'][] = array('sync', $force);
  return array('updated'=>0, 'created'=>0, 'errors'=>array());
}
function wp_next_scheduled($event) { return false; }
function wp_schedule_single_event($when, $event) {
  $GLOBALS['scheduled'][] = $event;
}
function get_transient($key) { return false; }
function set_transient($key, $value, $expiration) { return true; }
function delete_transient($key) { return true; }
define('MINUTE_IN_SECONDS', 60);

$code = file_get_contents(dirname(__DIR__).'/inc/core.php');
$from = strpos($code, 'function solar_expert_automatic_content_sync_enabled()');
$to = strpos($code, 'function solar_expert_sanitize_affiliate_map(', $from);
check($from !== false && $to > $from, 'Must find actual production automatic sync hooks');
eval(substr($code, $from, $to-$from));

foreach (array('init','solar_expert_async_content_sync','admin_init','after_switch_theme','upgrader_process_complete') as $hook) {
  check(isset($hooks[$hook]), 'Lifecycle hook missing: '.$hook);
}

check(solar_expert_automatic_content_sync_enabled() === false, 'Unconfigured automatic sync must default OFF');
$hooks['init']();
$hooks['solar_expert_async_content_sync']();
$hooks['admin_init']();
$hooks['after_switch_theme']();
$hooks['upgrader_process_complete'](null, array('type'=>'theme'));
check($state_calls === 0, 'Disabled hooks must not even examine manifest drift');
check(!$scheduled && !$writes, 'Default loading, cron and theme update must not write content');

// Explicit manual/admin/REST sync remains an independent authorized operation.
solar_expert_sync_managed_content(true);
check(count($writes)===1 && $writes[0][1]===true, 'Explicit manual sync must remain callable');
$writes = array();

// A documented site-owner wp-config opt-in retains the old self-healing route.
define('SOLAR_EXPERT_ENABLE_AUTOMATIC_CONTENT_SYNC', true);
check(solar_expert_automatic_content_sync_enabled() === true, 'Strict true opt-in required');
$hooks['init']();
check($scheduled===array('solar_expert_async_content_sync'), 'Opt-in schedules one cron');
$hooks['solar_expert_async_content_sync']();
$hooks['admin_init']();
$hooks['after_switch_theme']();
$hooks['upgrader_process_complete'](null, array('type'=>'plugin'));
$hooks['upgrader_process_complete'](null, array('type'=>'theme'));
check(count($writes)===4, 'Opt-in preserves cron, admin, theme switch and theme update sync');
check($writes[2][1]===true, 'Explicit after_switch_theme repair must remain forceful');
echo "Automatic managed-content sync is opt-in, explicit sync remains available.\n";
