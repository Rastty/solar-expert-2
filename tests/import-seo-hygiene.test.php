<?php
define('ABSPATH', __DIR__ . '/');
class WP_Post {
  public $ID;
  public $post_name;
  public $post_status;
  public $post_type;
  function __construct($id,$slug,$type='post',$status='publish'){
    $this->ID=$id; $this->post_name=$slug; $this->post_type=$type; $this->post_status=$status;
  }
}
$GLOBALS['fixture_root'] = dirname(__DIR__);
$GLOBALS['fixture_admin'] = false;
$GLOBALS['fixture_singular'] = true;
$GLOBALS['fixture_object'] = new WP_Post(100,'dnes-v-energetice-us-energy-information-administration-eia-19');
$GLOBALS['fixture_posts'] = array();
$GLOBALS['calls'] = array();
function get_template_directory(){return $GLOBALS['fixture_root'];}
function is_admin(){return $GLOBALS['fixture_admin'];}
function is_singular($type){return $type==='post'&&$GLOBALS['fixture_singular'];}
function get_queried_object(){return $GLOBALS['fixture_object'];}
function get_post($id){return $GLOBALS['fixture_posts'][$id]??null;}
function get_posts($args){
  $GLOBALS['last_query']=$args;
  $selected=array();
  foreach($GLOBALS['fixture_posts'] as $id=>$post){
    if($post->post_type==='post'&&$post->post_status==='publish'&&in_array($post->post_name,$args['post_name__in'],true)){
      $selected[]=$id;
    }
  }
  return $selected;
}
function add_filter($hook,$name,$priority){$GLOBALS['calls'][]=array($hook,$name,$priority);}
function check($ok,$message){if(!$ok){throw new RuntimeException($message);}}
require dirname(__DIR__).'/inc/import-seo-hygiene.php';

$slugs=solar_expert_import_cleanup_slugs();
check(count($slugs)===29&&count(array_unique($slugs))===29,'Must be exactly 29 explicit pilot candidates');
check(in_array('dnes-v-energetice-us-energy-information-administration-eia-19',$slugs,true),
  'Observed duplicate EIA imports must be eligible');
check(!in_array('dnes-v-energetice-us-energy-information-administration-eia-20',$slugs,true),
  'Do not silently expand the series');
check(!in_array('kolik-panelu-je-potreba-na-jeden-string',$slugs,true),'Preserve GSC indexable near-wins');
$manifest=json_decode(file_get_contents(dirname(__DIR__).'/content/manifest.json'),true);
$managed=array_column($manifest['items'],'slug');
check(count(array_intersect($managed,$slugs))===0,'Pilot must never contain a managed URL');
check(in_array(array('wpseo_robots','solar_expert_low_value_import_robots',30),$GLOBALS['calls'],true),
  'Yoast noindex filter required');
check(in_array(array('wpseo_exclude_from_sitemap_by_post_ids','solar_expert_exclude_low_value_imports_from_sitemap',20),$GLOBALS['calls'],true),
  'Yoast sitemap suppression filter required');

$eia=$GLOBALS['fixture_object'];
check(solar_expert_is_low_value_import($eia),'Published EIA import should match');
check(solar_expert_low_value_import_robots('index, follow')==='noindex, follow','Public import must be noindexed');
$GLOBALS['fixture_object']=new WP_Post(101,'kolik-panelu-je-potreba-na-jeden-string');
check(solar_expert_low_value_import_robots('index, follow')==='index, follow','Indexed near-win must retain robots');
$GLOBALS['fixture_object']=new WP_Post(102,'dnes-v-energetice-us-energy-information-administration-eia-19','page');
check(solar_expert_low_value_import_robots('index, follow')==='index, follow','Do not touch Pages');
$GLOBALS['fixture_object']=new WP_Post(103,'dnes-v-energetice-us-energy-information-administration-eia-19','post','draft');
check(solar_expert_low_value_import_robots('index, follow')==='index, follow','Never affect drafts');
$GLOBALS['fixture_object']=$eia;
$GLOBALS['fixture_admin']=true;
check(solar_expert_low_value_import_robots('index, follow')==='index, follow','Do not touch admin');
$GLOBALS['fixture_admin']=false;
$GLOBALS['fixture_singular']=false;
check(solar_expert_low_value_import_robots('index, follow')==='index, follow','Do not touch archives');
$GLOBALS['fixture_singular']=true;

$GLOBALS['fixture_posts']=array(
  100=>$eia,
  110=>new WP_Post(110,'elektrina-v-usa-us-energy-information-administration-eia'),
  111=>new WP_Post(111,'kolik-panelu-je-potreba-na-jeden-string'),
  112=>new WP_Post(112,'dnes-v-energetice-us-energy-information-administration-eia-1','post','draft'),
);
$ids=solar_expert_exclude_low_value_imports_from_sitemap(array(7,100));
sort($ids);
check($ids===array(7,100,110),'Preserve prior exclusions and suppress only matching published import IDs');
check($GLOBALS['last_query']['post_name__in']===$slugs&&$GLOBALS['last_query']['posts_per_page']<=40,
  'Sitemap exclusion must use a bounded exact-name query');
check(solar_expert_exclude_low_value_imports_from_sitemap(array(7))===array(7,100,110),
  'Repeat calls should preserve stable identity');
$GLOBALS['fixture_root']='/unavailable-manifest';
check(!solar_expert_is_low_value_import($eia),'On manifest failure, fail open for robots');
check(solar_expert_exclude_low_value_imports_from_sitemap(array(7))===array(7),
  'On manifest failure, fail open for sitemap');
echo "PASS: 29 bounded foreign imports noindex/sitemap pilot, managed and GSC protection, original URLs preserved\n";
