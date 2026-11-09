<?php
/**
 * Simulate the WordPress script queue for every public page type without
 * booting WordPress or modifying production state.
 */
class WP_Post {
  public $post_name;
  public $post_content;
  function __construct($slug, $content='') { $this->post_name=$slug; $this->post_content=$content; }
}
$GLOBALS['se_page']=array();
$GLOBALS['se_scripts']=array();
$GLOBALS['se_localized']=array();

function is_front_page(){ return !empty($GLOBALS['se_page']['front']); }
function is_singular($types){ return !empty($GLOBALS['se_page']['singular']); }
function get_queried_object(){ return $GLOBALS['se_page']['post'] ?? null; }
function has_shortcode($body,$tag){ return strpos($body, '['.$tag) !== false; }
function get_template_directory(){ return dirname(__DIR__); }
function get_template_directory_uri(){ return 'https://solar-expert.cz/wp-content/themes/solar-expert-2'; }
function get_stylesheet_uri(){ return get_template_directory_uri().'/style.css'; }
function wp_enqueue_style($handle,$src,$deps,$version){ }
function wp_enqueue_script($handle,$src,$deps,$version,$footer){
  $GLOBALS['se_scripts'][$handle]=array('deps'=>$deps,'url'=>$src);
}
function wp_script_add_data($handle,$key,$value){ }
function get_option($key,$default){ return $key==='solar_expert_affiliate_bases' ? array('eon-cz'=>'private-stub-base') : $default; }
function esc_url_raw($url){ return $url; }
function rest_url($path){ return 'https://solar-expert.cz/wp-json/'.$path; }
function home_url($path){ return 'https://solar-expert.cz'.$path; }
function wp_localize_script($handle,$name,$data){ $GLOBALS['se_localized'][$name]=array('handle'=>$handle,'data'=>$data); }

$source=file_get_contents(dirname(__DIR__).'/functions.php');
$from=strpos($source,'function solar_expert_tool_runtime_requirements() {');
$to=strpos($source,"add_action('wp_enqueue_scripts','solar_expert_assets');",$from);
if($from===false||$to===false){ throw new RuntimeException('Missing asset-router boundaries'); }
eval(substr($source,$from,$to-$from));

function check($condition,$message){ if(!$condition){ throw new RuntimeException($message); } }
function runCase($label,$page,$expected,$forbidden){
  $GLOBALS['se_page']=$page; $GLOBALS['se_scripts']=array(); $GLOBALS['se_localized']=array();
  solar_expert_assets();
  $scripts=$GLOBALS['se_scripts'];
  foreach($expected as $handle){ check(isset($scripts[$handle]),$label.' missing '.$handle); }
  foreach($forbidden as $handle){ check(!isset($scripts[$handle]),$label.' unnecessarily loads '.$handle); }
  // Every queued dependency must be present, including multi-tool shortcodes.
  foreach($scripts as $handle=>$script){
    foreach($script['deps'] as $dep){ check(isset($scripts[$dep]),$label.' unresolved '.$handle.' dependency '.$dep); }
  }
  check(($GLOBALS['se_localized']['SolarExpertConfig']['handle']??'')==='solar-expert-affiliate',
        $label.' merchant data must remain available before visitors click lead CTAs');
  check(($GLOBALS['se_localized']['SolarExpertConfig']['data']['affiliateBases']['eon-cz']??'')==='private-stub-base',
        $label.' merchant config must be preserved for existing E.ON lead runtime');
  check(($GLOBALS['se_localized']['SolarExpertAnalyticsConfig']['handle']??'')==='solar-expert-analytics',
        $label.' outcome event collector must stay registered');
  echo "PASS: ".$label." (".implode(', ',array_keys($scripts)).")\n";
}

$base=array('solar-expert-analytics','solar-expert-affiliate','solar-expert-leads');
$heavy=array('solar-expert-matcher','solar-expert-bundles','solar-expert-builder',
  'solar-expert-selectors','solar-expert-quote-checker','alpine');

runCase('ordinary article',array('singular'=>true,'post'=>new WP_Post('fve-panely-na-strechu')),
  $base,$heavy);
runCase('category archive',array('singular'=>false),$base,$heavy);
runCase('homepage Builder',array('front'=>true),
  array_merge($base,array('solar-expert-matcher','solar-expert-bundles','solar-expert-builder','alpine')),
  array('solar-expert-selectors','solar-expert-quote-checker'));
runCase('Builder landing',array('singular'=>true,'post'=>new WP_Post('solarni-sestava-na-chatu','[solar_expert_builder]')),
  array_merge($base,array('solar-expert-matcher','solar-expert-bundles','solar-expert-builder','alpine')),
  array('solar-expert-selectors','solar-expert-quote-checker'));
foreach(array('vyber-baterii','mppt-kalkulacka','vyber-menice') as $slug){
  runCase('Selector landing '.$slug,array('singular'=>true,'post'=>new WP_Post($slug)),
    array_merge($base,array('solar-expert-matcher','solar-expert-selectors','alpine')),
    array('solar-expert-builder','solar-expert-bundles','solar-expert-quote-checker'));
}
runCase('Quote Checker landing',array('singular'=>true,'post'=>new WP_Post('quote-checker')),
  array_merge($base,array('solar-expert-quote-checker','alpine')),
  array('solar-expert-builder','solar-expert-bundles','solar-expert-matcher','solar-expert-selectors'));
runCase('embedded selector shortcode',array('singular'=>true,'post'=>new WP_Post('custom-guide','[solar_expert_mppt_selector]')),
  array_merge($base,array('solar-expert-matcher','solar-expert-selectors','alpine')),
  array('solar-expert-builder','solar-expert-bundles','solar-expert-quote-checker'));
runCase('embedded mixed tools',array('singular'=>true,'post'=>new WP_Post('multi-tool','[solar_expert_builder][solar_expert_battery_selector][solar_expert_quote_checker]')),
  array_merge($base,$heavy),array());
runCase('unknown post',array('singular'=>true),$base,$heavy);
echo "All conditional script routing and merchant attribution cases passed.\n";
