<?php
/**
 * Exercise the actual production per-tool attribution PHP against synthetic,
 * privacy-safe aggregated events. No WordPress bootstrap, network or writes.
 */
define('DAY_IN_SECONDS', 86400);

function sanitize_key($value) {
  $value = strtolower((string) $value);
  return preg_replace('/[^a-z0-9_\\-]/', '', $value);
}
function get_option($name, $default = array()) {
  return $name === 'solar_expert_funnel_daily' ? $GLOBALS['se_funnel'] : $default;
}
function check($condition, $message) {
  if (!$condition) { throw new RuntimeException($message); }
}

$source = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($source, 'function solar_expert_funnel_infer_tool(');
$to = strpos($source, 'function solar_expert_funnel_page_breakdown(', $from);
check($from !== false && $to !== false && $to > $from, 'Cannot isolate production attribution helpers');
eval(substr($source, $from, $to - $from));

check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'page'=>'home', 'placement'=>'builder-mppt-best'
)) === 'builder', 'Homepage Builder product outbound must belong to Builder');
check(solar_expert_funnel_infer_tool('bundle_deal_click', array(
  'page'=>'home', 'placement'=>'builder-best'
)) === 'builder', 'Homepage Builder bundle deal must belong to Builder');
check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'page'=>'home', 'placement'=>'battery-selector'
)) === 'battery', 'Embedded Battery Selector merchant click must belong to Battery');
check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'page'=>'home', 'placement'=>'mppt-selector'
)) === 'mppt', 'Embedded MPPT Selector merchant click must belong to MPPT');
check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'page'=>'home', 'placement'=>'inverter-selector'
)) === 'inverter', 'Embedded Inverter Selector merchant click must belong to Inverter');
check(solar_expert_funnel_infer_tool('lead_click', array(
  'page'=>'home', 'placement'=>'quote_checker_result_warn'
)) === 'quote', 'Embedded Quote Checker result lead must belong to Quote Checker');
check(solar_expert_funnel_infer_tool('lead_click', array(
  'page'=>'polohovani-solarnich-panelu', 'placement'=>'eon-solar-post'
)) === '', 'Editorial lead must remain unassigned, never fabricate tool attribution');
check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'page'=>'home', 'placement'=>'unrecognized'
)) === '', 'Unknown placement must not be assigned to Homepage Builder');
check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'tool'=>'quote','page'=>'home', 'placement'=>'builder-best'
)) === 'quote', 'Explicit existing tool dimension must take precedence');
check(solar_expert_funnel_infer_tool('solar_builder_complete', array(
  'page'=>'home'
)) === 'builder', 'Historical Builder completions must preserve their attribution');
check(solar_expert_funnel_infer_tool('selector_engaged', array(
  'selector'=>'battery', 'page'=>'home'
)) === 'battery', 'Selector engagements must preserve their selector mapping');
check(solar_expert_funnel_infer_tool('affiliate_click', array(
  'page'=>'vyber-baterii', 'placement'=>'unrecognized'
)) === 'battery', 'Legacy selector landing-page fallback must remain');

$today = gmdate('Y-m-d');
$GLOBALS['se_funnel'] = array(
  $today => array(
    'tool_view|page=home|tool=builder' => 10,
    'tool_exposure|page=home|tool=builder' => 8,
    'tool_activation|page=home|tool=builder' => 4,
    'solar_builder_complete|page=home' => 2,
    'affiliate_click|merchant=battery-cz|page=home|placement=builder-mppt-best|productid=mppt-victron-100-50' => 1,
    'bundle_deal_click|page=home|placement=builder-best' => 1,
    'affiliate_click|page=home|placement=battery-selector' => 2,
    'affiliate_click|page=home|placement=mppt-selector' => 1,
    'affiliate_click|page=home|placement=inverter-selector' => 1,
    'lead_click|page=home|placement=quote_checker_result_pass' => 1,
    'lead_click|page=polohovani-solarnich-panelu|placement=eon-solar-post' => 1,
    'affiliate_click|page=home|placement=unrecognized' => 1,
    'affiliate_click|page=vyber-baterii|placement=unrecognized' => 1,
  ),
);
$tools = solar_expert_funnel_tool_breakdown(28);
check(($tools['builder']['views'] ?? -1) === 10, 'Builder view baseline must remain unchanged');
check(($tools['builder']['activations'] ?? -1) === 4, 'Builder activation baseline must remain unchanged');
check(($tools['builder']['outcome_events'] ?? -1) === 2, 'Builder real completions must remain unchanged');
check(($tools['builder']['outbound_clicks'] ?? -1) === 2, 'Builder product+bundle must contribute exactly two outbound clicks');
check(($tools['builder']['outbound_clicks_per_100_views'] ?? -1) === 20.0, 'Builder conversion denominator must remain views');
check(($tools['battery']['outbound_clicks'] ?? -1) === 3, 'Embedded and dedicated Battery clicks must be attributed');
check(($tools['mppt']['outbound_clicks'] ?? -1) === 1, 'MPPT outbound click must be attributed');
check(($tools['inverter']['outbound_clicks'] ?? -1) === 1, 'Inverter outbound click must be attributed');
check(($tools['quote']['outbound_clicks'] ?? -1) === 1, 'Quote result lead must be attributed');
check(count($tools) === 5, 'Unattributed editorial and unknown placements must never create fake tools');
echo "PASS: outbound placement attribution, legacy buckets, and unassigned editorial clicks\\n";
