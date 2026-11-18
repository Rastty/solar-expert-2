<?php
/** Test real site aggregation; do not touch WordPress or record live events. */
define('DAY_IN_SECONDS', 86400);
function sanitize_key($value) { return preg_replace('/[^a-z0-9_\\-]/', '', strtolower((string) $value)); }
function get_option($name, $default = array()) {
  return $name === 'solar_expert_funnel_daily' ? $GLOBALS['se_gap_events'] : $default;
}
function must_gap($condition, $message) { if ( ! $condition ) { throw new RuntimeException($message); } }

$source = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($source, 'function solar_expert_funnel_gap_statuses(');
$to = strpos($source, 'function solar_expert_funnel_outcome_summary(', $from);
must_gap($from !== false && $to > $from, 'Missing real WP offer-gap aggregation');
eval(substr($source, $from, $to - $from));
must_gap(strpos($source, "'buyer_offer_gap',") !== false, 'Browser event must be server-supported');
must_gap(strpos($source, "'buyer_offer_gaps' => solar_expert_funnel_offer_gap_breakdown(\$days)") !== false,
  'Prometheus health scoreboard must include actual offer gaps');
must_gap(strpos($source, "'solar_expert_gap'") !== false, 'Untrusted status/tool pair must be rejected');

$today = gmdate('Y-m-d');
$four = gmdate('Y-m-d', time() - 4*DAY_IN_SECONDS);
$older = gmdate('Y-m-d', time() - 30*DAY_IN_SECONDS);
$GLOBALS['se_gap_events'] = array(
  $today => array(
    'buyer_offer_gap|matchcount=3|page=vyber-baterii|status=no_actionable_shortlist_offer|tool=battery'=>4,
    'buyer_offer_gap|matchcount=0|page=vyber-menice|status=no_compatible_products|tool=inverter'=>2,
    'buyer_offer_gap|status=no_complete_shopping_list|tool=builder'=>1,
    'buyer_offer_gap|status=bogus_reason|tool=mppt'=>900,
    'buyer_offer_gap|status=no_compatible_products|tool=bogus'=>900,
    'affiliate_click|merchant=battery-cz|placement=builder-battery'=>99,
  ),
  $four => array('buyer_offer_gap|status=no_complete_bundle|tool=builder'=>3),
  $older => array('buyer_offer_gap|status=no_complete_bundle|tool=builder'=>100)
);
$seven = solar_expert_funnel_offer_gap_breakdown(7);
must_gap($seven['total_events'] === 10, 'Only valid buyer gaps within 7 days');
must_gap($seven['by_tool']['builder'] === 4 && $seven['by_tool']['battery'] === 4 &&
  $seven['by_tool']['inverter'] === 2, 'Group buyer gaps by real tool');
must_gap($seven['by_reason']['no_complete_shopping_list'] === 1 &&
  $seven['by_reason']['no_complete_bundle'] === 3, 'Differentiate modeled from buyable results');
must_gap(count($seven['by_tool_reason']) === 4, 'Never count malformed or irrelevant events');
$short = solar_expert_funnel_offer_gap_breakdown(1);
must_gap($short['total_events'] === 7 && !isset($short['by_reason']['no_complete_bundle']),
  'One-day window excludes older measured gaps');
$month = solar_expert_funnel_offer_gap_breakdown(28);
must_gap($month['total_events'] === 10, '30-day-old buckets excluded from 28-day report');
echo "PASS: real buyer gap events aggregated by tool/reason without guessing lost orders\n";
