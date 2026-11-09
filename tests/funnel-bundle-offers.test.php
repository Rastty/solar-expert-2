<?php
/**
 * Real first-party bundle impression -> click aggregation, without a WP
 * install, external networks, synthetic live events or cookies.
 */
define('DAY_IN_SECONDS', 86400);
function sanitize_key($value) {
  return preg_replace('/[^a-z0-9_\\-]/', '', strtolower((string) $value));
}
function get_option($name, $default = array()) {
  return $name === 'solar_expert_funnel_daily' ? $GLOBALS['bundle_events'] : $default;
}
function must($condition, $message) {
  if (!$condition) { throw new RuntimeException($message); }
}

$code = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$start = strpos($code, 'function solar_expert_funnel_bundle_offer_breakdown(');
$end = strpos($code, 'function solar_expert_funnel_outcome_summary(', $start);
must($start !== false && $end !== false && $end > $start, 'Bundle funnel implementation missing');
eval(substr($code, $start, $end - $start));

$today = gmdate('Y-m-d');
$previous = gmdate('Y-m-d', time() - 3 * DAY_IN_SECONDS);
$expired = gmdate('Y-m-d', time() - 34 * DAY_IN_SECONDS);
$GLOBALS['bundle_events'] = array(
  $today => array(
    'bundle_deal_exposure|dealid=deal-pusung-growatt|merchant=battery-cz|placement=builder-best|page=home' => 10,
    'bundle_deal_click|dealid=deal-pusung-growatt|merchant=battery-cz|placement=builder-best|page=home' => 2,
    'bundle_deal_exposure|dealid=deal-pusung-growatt|merchant=solar-import-cz|placement=builder-best|page=home' => 6,
    'bundle_deal_click|dealid=deal-pusung-growatt|merchant=solar-import-cz|placement=builder-best|page=home' => 1,
    'bundle_deal_exposure|dealid=deal-second|merchant=battery-cz|placement=builder-premium|page=home' => 2,
    // A newly-created deal with clicks but no exposure must show unknown rate.
    'bundle_deal_click|dealid=deal-legacy|merchant=battery-cz|placement=builder-budget|page=home' => 1,
    // Neither component product impressions nor leads belong to set rates.
    'offer_exposure|merchant=battery-cz|placement=builder-battery-best|productid=bat-a' => 100,
    'affiliate_click|merchant=battery-cz|placement=builder-battery-best|productid=bat-a' => 50,
    'lead_click|merchant=eon-cz|placement=builder-best' => 30,
    // Invalid/legacy incomplete deal identities are never comparable.
    'bundle_deal_exposure|merchant=battery-cz|placement=builder-best' => 99,
    'bundle_deal_click|placement=builder-best' => 99,
  ),
  $previous => array(
    'bundle_deal_exposure|dealid=deal-pusung-growatt|merchant=battery-cz|placement=builder-best|page=home' => 3,
    'bundle_deal_click|dealid=deal-pusung-growatt|merchant=battery-cz|placement=builder-best|page=home' => 1,
  ),
  $expired => array(
    'bundle_deal_exposure|dealid=deal-pusung-growatt|merchant=battery-cz|placement=builder-best|page=home' => 999,
  ),
);
$r = solar_expert_funnel_bundle_offer_breakdown(7);
must($r['total_exposures'] === 21, '21 visible seller-specific bundle impressions, not 100 product or 99 incomplete events');
must($r['total_clicks'] === 5, '5 bundle click events with complete deal/store/placement identity');
must(count($r['rows']) === 4, 'Four independent comparable deal/store/placement rows');
$a = $r['rows']['deal-pusung-growatt|battery-cz|builder-best'];
$b = $r['rows']['deal-pusung-growatt|solar-import-cz|builder-best'];
must($a['exposures'] === 13 && $a['clicks'] === 3, 'Do not merge different storefronts even when operator is shared');
must($a['clicks_per_100_exposures'] === 23.1, 'Correct 3 clicks / 13 impressions event rate');
must($b['exposures'] === 6 && $b['clicks'] === 1 && $b['clicks_per_100_exposures'] === 16.7,
  'Second merchant has its own denominator');
must($r['rows']['deal-second|battery-cz|builder-premium']['clicks_per_100_exposures'] === 0.0,
  'A rendered deal with zero clicks has true measured 0%');
must($r['rows']['deal-legacy|battery-cz|builder-budget']['clicks_per_100_exposures'] === null,
  'Missing older exposure means unknown, never fake zero percent');
$todayOnly = solar_expert_funnel_bundle_offer_breakdown(1);
must($todayOnly['total_exposures'] === 18 && $todayOnly['total_clicks'] === 4, 'Respect 1-day boundary');
echo "PASS: bundle-deal impressions, clicks, seller identity, unknown denominators and rolling windows\n";
