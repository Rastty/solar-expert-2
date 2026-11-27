<?php
class WP_Post { public string $post_name; function __construct($slug){$this->post_name=$slug;} }
$GLOBALS['admin']=false;$GLOBALS['single']=true;$GLOBALS['loop']=true;$GLOBALS['main']=true;
$GLOBALS['post']=new WP_Post('co-je-1-kwp');
function is_admin(){return $GLOBALS['admin'];}
function is_singular($type){return $type==='post'&&$GLOBALS['single'];}
function in_the_loop(){return $GLOBALS['loop'];}
function is_main_query(){return $GLOBALS['main'];}
function get_queried_object(){return $GLOBALS['post'];}
function add_filter($name,$callback,$priority){if($name==='the_content'&&$priority===20)$GLOBALS['callback']=$callback;}
eval(file_get_contents(__DIR__.'/../content/snippets/kwp-cabin-balance-v1.php'));
function eq($a,$b,$msg){if($a!==$b)throw new Exception($msg);}
$f=$GLOBALS['callback'];$marker='data-se-kwp-cabin-balance="v1"';
$body='<p>Původní vysvětlení</p><h2 id="chata">Je 1 kWp dost pro chatu?</h2><p>Původní text</p><a href="/solarni-sestava-na-chatu/">Builder</a>';
$out=$f($body);
eq(substr_count($out,$marker),1,'one marker');
eq(substr_count($out,'href="/solarni-sestava-na-chatu/"'),1,'original Builder preserved');
eq($f($out),$out,'idempotence');
eq(strpos($out,$marker)<strpos($out,'<h2 id="chata">'),true,'insert before heading');
foreach([1,3,5] as $h){
  $energy=$h*.75;$balance=$energy-1.5;
  $en=number_format($energy,2,',',' ');
  $bal=($balance<0?'−':'+').number_format(abs($balance),2,',',' ');
  eq(strpos($out,'<td>'.$h.' h</td><td>'.$en.' kWh</td><td>'.$bal.' kWh</td>')!==false,true,'energy math');
}
foreach([1,2] as $days){
  $cap=number_format(1.5*$days/(.8*.9),2,',',' ');
  eq(strpos($out,$cap.' kWh')!==false,true,'battery math');
}
foreach(['nikoli předpověď českého počasí','Nejde o garantovanou autonomii','klidový odběr','/vyber-baterii/','/jakou-baterii-a-mppt-k-solarnim-panelum-800w/'] as $s)eq(strpos($out,$s)!==false,true,'caveats and paths');
$GLOBALS['post']=new WP_Post('other');eq($f($body),$body,'other protected');
$GLOBALS['post']=new WP_Post('co-je-1-kwp');
foreach(['admin','single','loop','main'] as $k){$GLOBALS[$k]=!$GLOBALS[$k];eq($f($body),$body,'context scope');$GLOBALS[$k]=!$GLOBALS[$k];}
eq($f('<p>Unrecognized heading</p>'),'<p>Unrecognized heading</p>','unknown source fails closed');
eq($f($body.$body),$body.$body,'ambiguous insertion fails closed');
echo "PASS daily energy and autonomy math, source scope, preserved Builder, caveats, idempotency\n";
