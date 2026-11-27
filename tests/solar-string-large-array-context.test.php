<?php
class WP_Post {public string $post_name;function __construct($s){$this->post_name=$s;}}
function is_admin(){return false;} function is_singular($t){return $t==='post';}
function in_the_loop(){return true;} function is_main_query(){return true;}
function get_queried_object(){return $GLOBALS['post'];}
function add_filter($a,$b,$c){}
eval(file_get_contents(__DIR__.'/../content/snippets/string-large-array-guide-v1.php'));
$f='solar_expert_string_large_array_v1';
function ok($x){if(!$x)throw new Exception('scope or content failure');}
$old='Současná veřejná verze kalkulačky ještě automaticky nekontroluje celkový Isc paralelních stringů.';
$body='<p>'.$old.'</p><a href="/mppt-kalkulacka/">MPPT</a>';
$GLOBALS['post']=new WP_Post('jak-zapojit-solarni-panely');$r=$f($body);
ok(strpos($r,$old)===false && substr_count($r,'data-se-wiring-isc-v1')===1 && $f($r)===$r);
$GLOBALS['post']=new WP_Post('kolik-panelu-je-potreba-na-jeden-string');
$body='<h2>Co ještě kromě napětí zkontrolovat</h2><p>Původní text</p>';$r=$f($body);
ok(substr_count($r,'data-se-large-array-guide-v1')===1 && strpos($r,'164,64 V')!==false && strpos($r,'Původní text')!==false && $f($r)===$r);
$GLOBALS['post']=new WP_Post('other');ok($f($body)===$body);
echo "PASS two scoped article edits\n";
