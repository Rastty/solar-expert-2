<?php
/** Financial data must come from a verified affiliate network, never clicks. */
function assert_financial($condition, $message) {
  if ( ! $condition ) { throw new RuntimeException($message); }
}

$source = file_get_contents(dirname(__DIR__) . '/inc/core.php');
$from = strpos($source, 'function solar_expert_affiliate_financial_outcomes(');
$to = strpos($source, 'function solar_expert_record_funnel_event(', $from);
assert_financial($from !== false && $to > $from, 'Missing financial evidence contract');
eval(substr($source, $from, $to - $from));

$value = solar_expert_affiliate_financial_outcomes();
assert_financial($value['schema_version'] === 1 && $value['status'] === 'not_connected',
  'No external network connector means financial outcomes are unavailable');
assert_financial($value['source_of_truth'] === 'affiliate_network_transaction_report' &&
  $value['attribution_scope'] === 'unavailable', 'Source must be a verified merchant-network report');
foreach (array('confirmed_orders','approved_commission_amount','paid_commission_amount',
  'currency','network_verified_at_utc','commission_reporting_period') as $field) {
  assert_financial(array_key_exists($field, $value) && $value[$field] === null,
    'Missing external evidence must remain null, not invented zero: ' . $field);
}
assert_financial($value['derived_from_clicks'] === false,
  'Click and offer exposure counts must never become financial transactions');
assert_financial(strpos($source, "'affiliate_financial_outcomes' => solar_expert_affiliate_financial_outcomes()") !== false,
  'Prometheus health endpoint must expose explicit unknown financial state');
assert_financial(strpos($source, 'Schválené a vyplacené provize jsou neznámé (nikoli 0 Kč)') !== false,
  'Admin must distinguish no report from genuine zero commissions');

echo "PASS: affiliate financial outcomes are explicitly unavailable without verified network evidence\n";
