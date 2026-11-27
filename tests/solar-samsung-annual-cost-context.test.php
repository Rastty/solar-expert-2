<?php
class WP_Post { public string $post_name; function __construct($slug){$this->post_name=$slug;} }
$GLOBALS['admin']=false;$GLOBALS['single']=true;$GLOBALS['loop']=true;$GLOBALS['main']=true;
$GLOBALS['post']=new WP_Post('recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady');
function is_admin(){return $GLOBALS['admin'];}
function is_singular($type){return $type==='post'&&$GLOBALS['single'];}
function in_the_loop(){return $GLOBALS['loop'];}
function is_main_query(){return $GLOBALS['main'];}
function get_queried_object(){return $GLOBALS['post'];}
function add_filter($name,$callback,$priority){if($name==='the_content'&&$priority===20)$GLOBALS['callback']=$callback;}
eval(file_get_contents(__DIR__.'/../content/snippets/samsung-annual-cost-v1.php'));
function eq($a,$b,$msg){if($a!==$b)throw new Exception($msg);}
$f=$GLOBALS['callback'];$marker='data-se-samsung-annual-cost="v1"';
$body='<p>Původní cena</p><h2 id="shortlist">Pro koho bych Samsung zařadil do shortlistu</h2><p>Původní text</p><a href="https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/">Nabídka</a>';
$out=$f($body);
eq(substr_count($out,$marker),1,'one marker');
eq(substr_count($out,'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/'),1,'original inquiry preserved');
eq($f($out),$out,'idempotence');
eq(strpos($out,$marker)<strpos($out,'<h2 id="shortlist">'),true,'insert before heading');
foreach([3.0,3.5,4.0,4.5] as $spf){
  $energy=number_format(round(12000/$spf),0,',',' ');
  $cost=number_format(round(12000/$spf*5),0,',',' ');
  eq(strpos($out,'<td>'.$energy.' kWh</td><td>'.$cost.' Kč</td>')!==false,true,'annual math');
}
foreach(['Nejde o aktuální tarif ani měření výrobku Samsung','Úspora ani dosažení uvedených SPF nejsou garantovány','případného elektrického dohřevu','přípravu teplé vody'] as $s)eq(strpos($out,$s)!==false,true,'caveats');
$GLOBALS['post']=new WP_Post('other');eq($f($body),$body,'other protected');
$GLOBALS['post']=new WP_Post('recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady');
foreach(['admin','single','loop','main'] as $k){$GLOBALS[$k]=!$GLOBALS[$k];eq($f($body),$body,'context scope');$GLOBALS[$k]=!$GLOBALS[$k];}
eq($f('<p>Unrecognized heading</p>'),'<p>Unrecognized heading</p>','unknown source fails closed');
eq($f($body.$body),$body.$body,'ambiguous insertion fails closed');
echo "PASS annual cost math, source scope, preserved offer, caveats, idempotency\n";
