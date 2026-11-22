<?php
/* Pure WordPress context stubs: test exact content filter without HTTP or WP mutation. */
class WP_Post { public string $post_name; function __construct($slug){$this->post_name=$slug;} }
$GLOBALS['is_admin']=false;
$GLOBALS['single']=true;
$GLOBALS['in_loop']=true;
$GLOBALS['main_query']=true;
$GLOBALS['post']=new WP_Post('tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji');
$GLOBALS['callback']=null;
function is_admin(){return $GLOBALS['is_admin'];}
function is_singular($type){return $type==='post'&&$GLOBALS['single'];}
function in_the_loop(){return $GLOBALS['in_loop'];}
function is_main_query(){return $GLOBALS['main_query'];}
function get_queried_object(){return $GLOBALS['post'];}
function add_filter($name,$callback,$priority){if($name==='the_content'&&$priority===20)$GLOBALS['callback']=$callback;}
$src=file_get_contents(__DIR__.'/../content/snippets/heatpump-airwater-intro-eon-v1.php');
if(!$src || strpos($src,'<?php')!==false)throw new Exception('Source must be Code Snippets PHP without opening tag');
eval($src);
if(!is_callable($GLOBALS['callback']))throw new Exception('Filter not registered');
$merchant='https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/';
$body='<p>Intro pro čtenáře s radiátory.</p><h2>Technika</h2><p>Počítejte se ztrátou.</p><a href="'.$merchant.'">E.ON na konci</a>';
$filtered=($GLOBALS['callback'])($body);
function eq($a,$b,$msg){if($a!==$b)throw new Exception($msg.': '.var_export([$a,$b],true));}
eq(substr_count($filtered,'data-se-heatpump-intro-offer="v1"'),1,'Exactly one contextual CTA');
eq(substr_count($filtered,'data-se-lead-id="eon-heat-pump"'),1,'Exactly one new correctly tagged lead link');
eq(substr_count($filtered,$merchant),3,'Two new merchant attrs and old original link intact');
if(strpos($filtered,'Intro pro čtenáře')>strpos($filtered,'data-se-heatpump-intro-offer'))throw new Exception('Must appear AFTER intro');
if(strpos($filtered,'data-se-heatpump-intro-offer')>strpos($filtered,'<h2>Technika'))throw new Exception('Must appear before heading');
if(strpos($filtered,'E.ON na konci')===false)throw new Exception('Existing original lower CTA was overwritten');
eq(($GLOBALS['callback'])($filtered),$filtered,'Idempotency');
$GLOBALS['post']=new WP_Post('recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady');
eq(($GLOBALS['callback'])($body),$body,'Other post protected');
$GLOBALS['post']=new WP_Post('tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji');
$GLOBALS['is_admin']=true;eq(($GLOBALS['callback'])($body),$body,'No admin injection');
$GLOBALS['is_admin']=false;$GLOBALS['in_loop']=false;eq(($GLOBALS['callback'])($body),$body,'No secondary loop');
$GLOBALS['in_loop']=true;$GLOBALS['main_query']=false;eq(($GLOBALS['callback'])($body),$body,'No nonmain query');
$GLOBALS['main_query']=true;eq(($GLOBALS['callback'])('<p>No offer</p>'),'<p>No offer</p>','Changed article fail closed');
eq(($GLOBALS['callback'])('<h2>No introductory paragraph</h2><a href="'.$merchant.'">CTA</a>'),'<h2>No introductory paragraph</h2><a href="'.$merchant.'">CTA</a>','No qualifying paragraph fail closed');
echo "PASS heatpump early offer context, truth-in-affiliate, old lead preserved, exact post only\n";
