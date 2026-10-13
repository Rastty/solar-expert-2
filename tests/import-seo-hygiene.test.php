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
  return array_slice($selected,0,(int)$args['posts_per_page']);
}
function add_filter($hook,$name,$priority){$GLOBALS['calls'][]=array($hook,$name,$priority);}
function check($ok,$message){if(!$ok){throw new RuntimeException($message);}}
require dirname(__DIR__).'/inc/import-seo-hygiene.php';

$slugs=solar_expert_import_cleanup_slugs();
check(count($slugs)===66&&count(array_unique($slugs))===66,'Exactly 66 verified imported candidate slugs; never bulk category blanket');
check(in_array('solarni-energie-v-queenslandu-informace-statistiky-a-zdroje',$slugs,true),'Australian news should be in expanded exact inventory');
check(in_array('solar-for-all-ministerstvo-obchodu-statu-washington',$slugs,true),'US state subsidy news should be in expanded inventory');
check(in_array('prumerna-denni-vyroba-solarnich-fotovoltaickych-clanku-v-australii',$slugs,true),'Exact Australian production report should be in expanded inventory');
check(!in_array('kolik-zalohy-byste-meli-zaplatit-abyste-zajistili-svou-solarni-instalaci',$slugs,true),'Keep potentially relevant Czech buyer guidance for editorial decision');
check(in_array('dnes-v-energetice-us-energy-information-administration-eia-19',$slugs,true),
  'Observed duplicate EIA imports must be eligible');
check(!in_array('dnes-v-energetice-us-energy-information-administration-eia-20',$slugs,true),
  'Do not silently expand the series');
check(!in_array('kolik-panelu-je-potreba-na-jeden-string',$slugs,true),'Preserve GSC indexable near-wins');
$gscProtected=solar_expert_import_gsc_protected_slugs();
check(count($gscProtected)===26,'Protect all 26 13 Oct GSC near-win and query owner slugs');
check(count(array_intersect($slugs,$gscProtected))===0,'Never noindex any GSC proven near-win or query owner');
check(in_array('nataceni-solarnich-panelu-za-sluncem',$gscProtected,true),'Protect clicked high-ranking tracker guide');
check(in_array('proc-se-solarni-panely-neprehrivaji',$gscProtected,true),'Protect top-position cooling guide');
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
check($GLOBALS['last_query']['post_name__in']===$slugs&&$GLOBALS['last_query']['posts_per_page']===count($slugs)&&count($slugs)<100,
  'Sitemap exclusion must cover EVERY candidate with a bounded exact-name query');
check(solar_expert_exclude_low_value_imports_from_sitemap(array(7))===array(7,100,110),
  'Repeat calls should preserve stable identity');
// Regression for the original 40-post cap: a batch >40 must actually
// disappear from XML sitemap eligibility, not merely get per-page robots.
$GLOBALS['fixture_posts']=array();
foreach ($slugs as $i=>$slug) {
  $id=200+$i;
  $GLOBALS['fixture_posts'][$id]=new WP_Post($id,$slug);
}
$GLOBALS['fixture_posts'][999]=new WP_Post(999,'kolik-panelu-je-potreba-na-jeden-string');
$bulkIds=solar_expert_exclude_low_value_imports_from_sitemap(array(7));
check(count($bulkIds)===67,'All 66 matching import IDs plus preserved preexisting exclusion must survive sitemap cap');
check(!in_array(999,$bulkIds,true),'GSC near-win should never be suppressed by sitemap cleanup');
check(count(array_unique($bulkIds))===count($bulkIds),'No duplicate sitemap IDs');
check(solar_expert_is_low_value_import(new WP_Post(1001,'solarni-energie-v-queenslandu-informace-statistiky-a-zdroje')),
  'Expanded Australian imports must carry public noindex');
check(!solar_expert_is_low_value_import(new WP_Post(1002,'nataceni-solarnich-panelu-za-sluncem')),
  'GSC top ranking guide must never be noindexed');

$GLOBALS['fixture_root']='/unavailable-manifest';
check(!solar_expert_is_low_value_import($eia),'On manifest failure, fail open for robots');
check(solar_expert_exclude_low_value_imports_from_sitemap(array(7))===array(7),
  'On manifest failure, fail open for sitemap');
echo "PASS: 66 verified foreign imports, all XML sitemap exclusions, 26 GSC near-win protections, 0 WP content mutations\n";
