<?php
/**
 * Live production helper fixture: storefront brands vs independent operators.
 * Does not bootstrap WordPress and never reads WP affiliate secrets.
 */
function sanitize_key($value) {
  return preg_replace('/[^a-z0-9_-]/', '', strtolower((string)$value));
}
function check($condition,$message) {
  if (!$condition) throw new RuntimeException($message);
}
$source=file_get_contents(dirname(__DIR__).'/inc/core.php');
$from=strpos($source,'function solar_expert_merchant_operator_id(');
$to=strpos($source,'function solar_expert_lead_coverage(', $from);
check($from!==false&&$to>$from,'Cannot isolate audited production affiliate coverage');
eval(substr($source,$from,$to-$from));

check(solar_expert_merchant_operator_id('battery-cz')==='efteria-cz','Battery.cz ownership');
check(solar_expert_merchant_operator_id('solar-import-cz')==='efteria-cz','Solar-Import.cz ownership');
check(solar_expert_merchant_operator_id('ampul-eu')==='ampul-eu','Unrelated seller remains independent');
check(solar_expert_merchant_operator_id('vselektro-eu')==='vselektro-eu','VS Elektro legal entity is different from Efteria');

$catalog=array('products'=>array(
  array('id'=>'battery-demo','type'=>'battery','merchant'=>'battery-cz','availability'=>'in_stock','offers'=>array(
    array('merchant'=>'battery-cz','availability'=>'in_stock'),
    array('merchant'=>'solar-import-cz','availability'=>'in_stock')
  ))
));
$bases=array(
  'battery-cz'=>'https://ehub.cz/approved-battery',
  'solar-import-cz'=>'https://ehub.cz/approved-solar',
);
$result=solar_expert_affiliate_coverage($catalog,array('products'=>array()),$bases);
check($result['monetized_merchants']===2,'Two valid affiliate storefronts should remain counted');
check($result['monetized_operators']===1,'Two Etteria storefronts must count as one operator');
check($result['recommendable_offer_coverage_pct']===100.0,'Affiliate coverage should remain unchanged');
check($result['active_offer_coverage_pct']===100.0,'No offer destinations should be removed');

$catalog['products'][0]['offers'][]=array('merchant'=>'ampul-eu','availability'=>'in_stock');
$bases['ampul-eu']='https://approved-network.example/ampul';
$expanded=solar_expert_affiliate_coverage($catalog,array('products'=>array()),$bases);
check($expanded['monetized_merchants']===3,'New independent brand counted');
check($expanded['monetized_operators']===2,'New independent operator counted');

unset($bases['ampul-eu']);
$partial=solar_expert_affiliate_coverage($catalog,array('products'=>array()),$bases);
check($partial['monetized_merchants']===2&&$partial['monetized_operators']===1,'Unmonetized independent merchant must not inflate operator count');
check($partial['recommendable_offer_coverage_pct']===66.7,'Coverage calculation remains honest');

echo "PASS: 2 approved sites / 1 real seller; new independent merchants reported separately\n";
