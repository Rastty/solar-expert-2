<?php
class WP_Post { public string $post_name; function __construct($slug){$this->post_name=$slug;} }
$GLOBALS['admin']=false;$GLOBALS['single']=true;$GLOBALS['loop']=true;$GLOBALS['main']=true;
$GLOBALS['post']=new WP_Post('umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda');
function is_admin(){return $GLOBALS['admin'];}
function is_singular($type){return $type==='post'&&$GLOBALS['single'];}
function in_the_loop(){return $GLOBALS['loop'];}
function is_main_query(){return $GLOBALS['main'];}
function get_queried_object(){return $GLOBALS['post'];}
function add_filter($name,$callback,$priority){if($name==='the_content'&&$priority===20)$GLOBALS['callback']=$callback;}
eval(file_get_contents(__DIR__.'/../content/snippets/heatpump-boundary-distance-example-v1.php'));
function eq($a,$b,$msg){if($a!==$b)throw new Exception($msg);}
$f=$GLOBALS['callback'];$marker='data-se-boundary-distance-example="v1"';
$body='<p>Původní odstup</p><h2 id="placement">Kam venkovní jednotku raději nedávat</h2><p>Původní text</p><a href="https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/">Nabídka</a>';
$out=$f($body);
eq(substr_count($out,$marker),1,'one marker');
eq(substr_count($out,'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/'),1,'original inquiry preserved');
eq($f($out),$out,'idempotence');
eq(strpos($out,$marker)<strpos($out,'<h2 id="placement">'),true,'insert before heading');
foreach([2,4,6,8] as $r){$expected=-20*log10($r/2);if(abs($expected-([2=>0,4=>-6,6=>-9.5,8=>-12][$r]))>0.06)throw new Exception('bad math');}
foreach(['−6 dB','−9,5 dB','−12 dB','Tabulka neslouží k určení bezpečné vzdálenosti','nikoli hluk konkrétního čerpadla','2 m nejsou doporučený'] as $s)eq(strpos($out,$s)!==false,true,'caveats and math');
$GLOBALS['post']=new WP_Post('other');eq($f($body),$body,'other protected');
$GLOBALS['post']=new WP_Post('umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda');
foreach(['admin','single','loop','main'] as $k){$GLOBALS[$k]=!$GLOBALS[$k];eq($f($body),$body,'context scope');$GLOBALS[$k]=!$GLOBALS[$k];}
eq($f('<p>Unrecognized heading</p>'),'<p>Unrecognized heading</p>','unknown source fails closed');
eq($f($body.$body),$body.$body,'ambiguous insertion fails closed');
echo "PASS exact scope, preserved offer, relative math, idempotency, caveats\n";
