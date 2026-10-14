<?php
/**
 * Execute the production WebApplication schema functions against WordPress
 * fixtures; do not bootstrap WordPress or write to a live site.
 */
class WP_Post {
  public $post_type;
  public $post_status;
  public $post_name;
  public function __construct($slug, $type='page', $status='publish') {
    $this->post_name=$slug; $this->post_type=$type; $this->post_status=$status;
  }
}
$GLOBALS['current_schema_post']=null;
function add_filter($hook,$callback,$priority=10) {
  $GLOBALS['schema_filter']=array($hook,$callback,$priority);
}
function is_singular($type) {
  return $GLOBALS['current_schema_post'] instanceof WP_Post &&
    $GLOBALS['current_schema_post']->post_type===$type;
}
function get_queried_object() { return $GLOBALS['current_schema_post']; }
function get_permalink($post) { return 'https://solar-expert.cz/'.$post->post_name.'/'; }
function get_the_title($post) { return 'Title: '.$post->post_name; }
function home_url($path='/') { return 'https://solar-expert.cz'.$path; }
function solar_expert_seo_meta($slug='') {
  return array('description'=>'Technický výběr: '.$slug);
}
function check($condition,$message) {
  if(!$condition)throw new RuntimeException($message);
}
$source=file_get_contents(dirname(__DIR__).'/inc/core.php');
$begin=strpos($source,'function solar_expert_tool_web_application_schema(');
$end=strpos($source,'function solar_expert_schema_graph()', $begin);
check($begin!==false && $end>$begin,'Cannot extract production Yoast schema helper');
eval(substr($source,$begin,$end-$begin));

check(($GLOBALS['schema_filter'] ?? null)===array('wpseo_schema_graph','solar_expert_add_tool_to_yoast_schema_graph',25),
  'Schema must integrate with Yoast graph filter rather than echoing a second WebSite/Organization graph');

$slugs=array(
  'solarni-sestava-na-chatu',
  'vyber-baterii',
  'mppt-kalkulacka',
  'vyber-menice',
  'quote-checker',
);
foreach($slugs as $slug) {
  $GLOBALS['current_schema_post']=new WP_Post($slug);
  $app=solar_expert_tool_web_application_schema(get_queried_object());
  check(($app['@type'] ?? '')==='WebApplication','Missing WebApplication type for '.$slug);
  check($app['url']==='https://solar-expert.cz/'.$slug.'/','Canonical app URL mismatch: '.$slug);
  check($app['@id']===$app['url'].'#app','Unique app @id mismatch: '.$slug);
  check(($app['offers']['price'] ?? -1)===0 && $app['offers']['priceCurrency']==='CZK',
    'Offer must describe a free-to-use tool, not affiliate product prices');
  check(($app['isAccessibleForFree'] ?? false)===true,'Free flag mismatch');
  check(!isset($app['review'])&&!isset($app['aggregateRating']),
    'Never fake structured reviews or star ratings');
  check(strpos($app['description'],$slug)!==false,'Missing on-page technical description');
  $yoastGraph=array(
    array('@type'=>'WebSite','@id'=>'https://solar-expert.cz/#website'),
    array('@type'=>'WebPage','@id'=>$app['url'].'#webpage'),
  );
  $actual=solar_expert_add_tool_to_yoast_schema_graph($yoastGraph);
  check(count($actual)===3,'Only one app node must be appended to retained Yoast graph: '.$slug);
  check($actual[0]===$yoastGraph[0]&&$actual[1]===$yoastGraph[1],
    'Yoast core graph must not be replaced or modified');
  check($actual[2]===$app,'App graph data must exactly match production helper');
  check(count(solar_expert_add_tool_to_yoast_schema_graph($actual))===3,
    'Appending the app twice must be idempotent');
  $existing=$yoastGraph;
  $existing[]=array('@type'=>array('Thing','WebApplication'),'url'=>$app['url'],'@id'=>'different-plugin-id');
  check(count(solar_expert_add_tool_to_yoast_schema_graph($existing))===3,
    'Do not duplicate app schema provided by another schema plugin');
}

foreach(array(
  new WP_Post('kolik-stoji-fotovoltaika','post'),
  new WP_Post('mppt-kalkulacka','page','draft'),
  new WP_Post('some-editorial-page'),
) as $post){
  $GLOBALS['current_schema_post']=$post;
  check(solar_expert_tool_web_application_schema($post)===null,
    'Never claim draft, article or editorial page is a working software application');
  $base=array(array('@type'=>'WebPage'));
  check(solar_expert_add_tool_to_yoast_schema_graph($base)===$base,
    'Unrelated graph must not change');
}
$GLOBALS['current_schema_post']=null;
check(solar_expert_add_tool_to_yoast_schema_graph(array())===array(),
  'Archives and uninitialized requests must remain unchanged');
check(solar_expert_add_tool_to_yoast_schema_graph(null)===null,
  'Invalid graph must be returned unmodified');

echo "PASS: five legitimate free tools, Yoast graph preservation and duplicate suppression\n";
