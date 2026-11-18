<?php
/**
 * Audit the production outbound attribution function without WordPress,
 * cookies, network access, merchant tracking URLs or fabricated sales.
 */
define('DAY_IN_SECONDS', 86400);
function sanitize_key($value) {
  return preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $value));
}
function check($condition, $message) {
  if ( ! $condition ) { throw new RuntimeException($message); }
}

$today = gmdate('Y-m-d');
$older = gmdate('Y-m-d', time() - 20 * DAY_IN_SECONDS);
$expired = gmdate('Y-m-d', time() - 40 * DAY_IN_SECONDS);
$GLOBALS['se_funnel_fixture'] = array(
  $today => array(
    'affiliate_click|merchant=battery-cz|monetized=1|page=home|placement=builder-battery-best|productid=bat-a' => 3,
    'affiliate_click|merchant=battery-cz|monetized=0|page=home|placement=builder-battery-best|productid=bat-a' => 2,
    'affiliate_click|merchant=battery-cz|page=home|placement=builder-battery-best|productid=bat-a' => 4,
    'bundle_deal_click|merchant=solar-import-cz|monetized=1|page=home|placement=builder-bundle-deal' => 1,
    'lead_click|merchant=eon-cz|monetized=0|page=kolik-stoji-fotovoltaika|placement=fve_price_guide_compare' => 2,
    'lead_click|merchant=eon-cz|monetized=maybe|page=kolik-stoji-fotovoltaika|placement=fve_price_guide_compare' => 1,
    'offer_exposure|merchant=battery-cz|placement=builder-battery-best' => 100,
  ),
  $older => array(
    'lead_click|merchant=eon-cz|monetized=1|page=quote-checker|placement=quote_checker_result_ready' => 2,
  ),
  $expired => array(
    'affiliate_click|monetized=1|page=home|placement=builder-battery-best' => 99,
  ),
);
function get_option($name, $fallback = array()) {
  return $name === 'solar_expert_funnel_daily' ? $GLOBALS['se_funnel_fixture'] : $fallback;
}

$core = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($core, 'function solar_expert_funnel_outbound_route_breakdown(');
$to = strpos($core, 'function solar_expert_funnel_outcome_summary(', $from);
check($from !== false && $to > $from, 'Could not isolate production route attribution');
eval(substr($core, $from, $to - $from));

$week = solar_expert_funnel_outbound_route_breakdown(7);
check($week['total_clicks'] === 13, 'Product, bundle and lead clicks counted without exposures');
check($week['configured_affiliate_route_clicks'] === 4, 'Only explicit monetized=1 is a partner route');
check($week['direct_source_route_clicks'] === 4, 'Explicit monetized=0 is direct source only');
check($week['unknown_route_type_clicks'] === 5, 'Legacy and malformed attribution stays unknown');
check($week['by_event']['product']['total_clicks'] === 9, 'Product outbound split');
check($week['by_event']['bundle']['configured_affiliate_route_clicks'] === 1, 'Bundle partner click');
check($week['by_event']['lead']['direct_source_route_clicks'] === 2, 'Direct lead click');
check($week['by_placement']['builder-battery-best']['configured_affiliate_route_clicks'] === 3,
  'Rank actual configured partner routes by placement');
check($week['by_page']['kolik-stoji-fotovoltaika']['unknown_route_type_clicks'] === 1,
  'Unknown lead source remains visible by page');

$month = solar_expert_funnel_outbound_route_breakdown(28);
check($month['total_clicks'] === 15 && $month['configured_affiliate_route_clicks'] === 6,
  '28 days include older leads but never expired 40-day events');
check($month['direct_source_route_clicks'] === 4 && $month['unknown_route_type_clicks'] === 5,
  'Longer window preserves route classification');
check(array_sum(array($month['configured_affiliate_route_clicks'], $month['direct_source_route_clicks'],
  $month['unknown_route_type_clicks'])) === $month['total_clicks'],
  'No outbound click counted twice or dropped');

echo "PASS: outbound product, bundle and lead routes split into configured, direct and unknown without revenue claims\n";
