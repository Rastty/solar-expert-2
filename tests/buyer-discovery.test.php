<?php
// Regression: explicit indexed-guide bridges, but never arbitrary HTML/page edits.
define('ABSPATH', __DIR__ . '/');
$GLOBALS['test_post_slug'] = 'kolik-panelu-je-potreba-na-jeden-string';
$GLOBALS['test_admin'] = false;
$GLOBALS['test_main'] = true;
$GLOBALS['test_singular'] = true;
$GLOBALS['test_loop'] = true;
$GLOBALS['test_feed'] = false;
$GLOBALS['test_hooks'] = array();
function is_admin() { return $GLOBALS['test_admin']; }
function is_singular($type) { return $type === 'post' && $GLOBALS['test_singular']; }
function in_the_loop() { return $GLOBALS['test_loop']; }
function is_main_query() { return $GLOBALS['test_main']; }
function is_feed() { return $GLOBALS['test_feed']; }
function get_queried_object() { return (object) array('post_name'=>$GLOBALS['test_post_slug']); }
function home_url($p) { return 'https://solar-expert.cz' . $p; }
function esc_url($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function add_filter($name,$callback,$priority) { $GLOBALS['test_hooks'][]=array($name,$callback,$priority); }
function verify($condition,$message) { if (!$condition) { throw new RuntimeException($message); } }

require dirname(__DIR__) . '/inc/buyer-discovery.php';
verify(in_array(array('the_content','solar_expert_append_buyer_bridge',22),$GLOBALS['test_hooks'],true),'Render-phase link hook required');
$manifest = json_decode(file_get_contents(dirname(__DIR__) . '/content/manifest.json'),true);
$slugs = array_column($manifest['items'],'slug');
$map=solar_expert_buyer_bridge_map();
verify(count($map)===7,'Seven explicitly intent-matched articles, never sitewide spam');
foreach ($map as $source=>$bridge) {
  verify(in_array($source,$slugs,true),'Source must be editorially managed: '.$source);
  verify(in_array($bridge['guide_slug'],$slugs,true),'Target must be source-controlled: '.$source);
  verify(in_array($bridge['tool_slug'],$slugs,true),'Next-step article or calculator must be managed: '.$source);
  verify($source!==$bridge['guide_slug'] && $source!==$bridge['tool_slug'],'No self-links');
  $GLOBALS['test_post_slug']=$source;
  $rendered=solar_expert_append_buyer_bridge('<p>Evergreen post body</p>');
  verify(strpos($rendered,'<p>Evergreen post body</p>')===0,'Original content must stay untouched');
  verify(substr_count($rendered,'data-se-buyer-bridge=')===1,'Render one related block');
  verify(strpos($rendered,'href="https://solar-expert.cz/'.$bridge['guide_slug'].'/"')!==false,
    'Direct server-rendered buying guide link');
  verify(strpos($rendered,'href="https://solar-expert.cz/'.$bridge['tool_slug'].'/"')!==false,
    'Direct server-rendered calculator link');
  verify(!str_contains($rendered,'ehub.cz')&&!str_contains($rendered,'desturl='),
    'Editorial links never expose private merchant redirects');
  verify(solar_expert_append_buyer_bridge($rendered)===$rendered,'Do not duplicate related blocks');
  $present='<p>Existing copy <a href="/'.$bridge['guide_slug'].'/">guide</a></p>';
  verify(solar_expert_append_buyer_bridge($present)===$present,'Respect pre-existing editorial links');
}
foreach (array('fotovoltaika-na-eternitovou-strechu','nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu','solarni-sestava-na-chatu-pro-lednici') as $slug) {
  $GLOBALS['test_post_slug']=$slug;
  verify(solar_expert_append_buyer_bridge('Base')==='Base','Never inject off-topic CTA: '.$slug);
}
$GLOBALS['test_post_slug']='kolik-panelu-je-potreba-na-jeden-string';
foreach (array('test_admin','test_feed') as $flag) {
  $GLOBALS[$flag]=true;
  verify(solar_expert_append_buyer_bridge('Base')==='Base','No injection in '.$flag);
  $GLOBALS[$flag]=false;
}
foreach (array('test_loop','test_main','test_singular') as $flag) {
  $GLOBALS[$flag]=false;
  verify(solar_expert_append_buyer_bridge('Base')==='Base','Only primary public post content: '.$flag);
  $GLOBALS[$flag]=true;
}
echo "PASS: seven intent-matched article-to-buyer paths, no off-topic links, no duplicates or metadata edits\n";
