<?php
/** Source-bound privacy-safe offer exposure -> click aggregation regression.
 * No WordPress, merchant network requests, live tracking or storage writes.
 */
define('DAY_IN_SECONDS', 86400);
function sanitize_key($value) {
  return preg_replace('/[^a-z0-9_\\-]/', '', strtolower((string) $value));
}
function get_option($name, $default = array()) {
  return $name === 'solar_expert_funnel_daily' ? $GLOBALS['se_offer_events'] : $default;
}
function must($condition, $message) {
  if (!$condition) { throw new RuntimeException($message); }
}

$source = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($source, 'function solar_expert_funnel_offer_breakdown(');
$to = strpos($source, 'function solar_expert_funnel_outcome_summary(', $from);
must($from !== false && $to > $from, 'Cannot find deployed offer aggregation implementation');
eval(substr($source, $from, $to - $from));

$today = gmdate('Y-m-d');
$previous = gmdate('Y-m-d', time() - 3 * DAY_IN_SECONDS);
$expired = gmdate('Y-m-d', time() - 34 * DAY_IN_SECONDS);

$GLOBALS['se_offer_events'] = array(
  $today => array(
    'offer_exposure|merchant=battery-cz|placement=builder-battery-best|productid=bat-a' => 10,
    'affiliate_click|merchant=battery-cz|placement=builder-battery-best|productid=bat-a' => 2,
    'offer_exposure|merchant=solar-import-cz|placement=builder-battery-best|productid=bat-a' => 7,
    'affiliate_click|merchant=solar-import-cz|placement=builder-battery-best|productid=bat-a' => 1,
    'offer_exposure|merchant=battery-cz|placement=mppt-selector|productid=mppt-a' => 5,
    'affiliate_click|merchant=battery-cz|placement=mppt-selector|productid=mppt-a' => 1,
    // Lead and bundle-deal outbound clicks have no comparable product exposure.
    'lead_click|merchant=eon-cz|placement=eon-solar-post' => 30,
    'bundle_deal_click|merchant=battery-cz|placement=builder-best' => 20,
    // Legacy events without complete offer identity must not inflate denominator.
    'affiliate_click|placement=unknown' => 80,
  ),
  $previous => array(
    'offer_exposure|merchant=battery-cz|placement=builder-battery-best|productid=bat-a' => 3,
    'affiliate_click|merchant=battery-cz|placement=builder-battery-best|productid=bat-a' => 1,
    // Can have clicks but zero recorded impressions on legacy data.
    'affiliate_click|merchant=battery-cz|placement=inverter-selector|productid=inv-a' => 2,
  ),
  $expired => array(
    'offer_exposure|merchant=battery-cz|placement=mppt-selector|productid=old' => 999,
  ),
);
$r = solar_expert_funnel_offer_breakdown(7);
must($r['total_exposures'] === 25, 'Count only 25 comparable offer impressions');
must($r['total_clicks'] === 7, 'Exclude leads, bundles and unaffiliated clicks');
must(count($r['by_placement']) === 3, 'Three actual placement groups');
must($r['by_placement']['builder-battery-best']['exposures'] === 20, 'Group across product and merchant');
must($r['by_placement']['builder-battery-best']['clicks'] === 4, 'Compare direct product clicks only');
must($r['by_placement']['builder-battery-best']['clicks_per_100_exposures'] === 20.0, 'Event-rate arithmetic');
must($r['by_placement']['inverter-selector']['clicks_per_100_exposures'] === null, 'Missing historical exposure must show dash, never fake 0%');
must(!isset($r['by_placement']['eon-solar-post']), 'Keep unexposed lead lane out of offer metric');
must(array_key_first($r['by_placement']) === 'builder-battery-best', 'Order most-visible placement first');
$short = solar_expert_funnel_offer_breakdown(1);
must($short['total_exposures'] === 22 && $short['total_clicks'] === 4, 'Respect reporting window');

echo "PASS: product-only exposure and click aggregation by placement, missing-denominator handling, 7/28d boundaries\\n";
