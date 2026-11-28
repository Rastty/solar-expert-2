/** Scoped legacy FVE buyer paths, no title/post/catalog mutation. */
function solar_expert_legacy_fve_buyers_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post)) return $content;
    if($post->ID===1186 && $post->post_name==='kolik-se-usetri-s-fotovoltaikou') {
        $pattern='~<h3(?:\s[^>]*)?>\s*Výpočet úspor\s*</h3>~u';
        if(strpos($content,'data-se-savings-model-v1')!==false || preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
        $block=<<<'SE_SAVINGS'
<section class="se-note" data-se-savings-model-v1="1">
<h2>Model úspory: kolik z výroby skutečně využijete?</h2>
<p>Roční finanční přínos = vlastní spotřebované kWh × ušetřená variabilní cena nákupu + prodané kWh × čistá výkupní cena − roční provozní náklady. Fixní poplatky nepočítejte jako ušetřené. Následuje pouze citlivostní příklad, nikoli nabídka či prognóza.</p>
<div style="overflow-x:auto"><table><thead><tr><th>Vlastní využití z 5 000 kWh výroby</th><th>Ušetřený nákup při 5 Kč/kWh</th><th>Výkup při 1 Kč/kWh</th><th>Hrubý přínos za rok</th></tr></thead><tbody><tr><td>30 %</td><td>7 500 Kč</td><td>3 500 Kč</td><td>11 000 Kč</td></tr><tr><td>50 %</td><td>12 500 Kč</td><td>2 500 Kč</td><td>15 000 Kč</td></tr><tr><td>70 %</td><td>17 500 Kč</td><td>1 500 Kč</td><td>19 000 Kč</td></tr></tbody></table></div>
<p>Při hypotetické investici 300 000 Kč a ročních nákladech 2 000 Kč vychází ve středním scénáři jednoduchá návratnost přibližně 23 let. Nezohledňuje financování, degradaci, výměny zařízení ani budoucí ceny. Použijte vlastní fakturu, profil spotřeby a odhad výroby; úspora 50 % ani návratnost 7–10 let není univerzální.</p>
<p><a class="se-btn se-btn-primary" href="/kolik-stoji-fotovoltaika/">Porovnat aktuální ceny a nabídky FVE →</a> <a class="se-btn" href="/kolik-vyrobi-fotovoltaika-za-rok/">Odhadnout výrobu podle lokality →</a></p>
</section>
SE_SAVINGS;
        $offset=$m[0][0][1];
        $content=substr($content,0,$offset).$block.substr($content,$offset);
        $content=str_replace('Nicméně, odhaduje se, že průměrný rodinný dům s fotovoltaickými panely může ušetřit až 50 % nákladů na elektřinu.','Skutečnou úsporu určují zejména časový souběh spotřeby a výroby a ceny nákupu i výkupu.',$content);
        $content=str_replace('Obvykle se však počítá s dobou návratnosti kolem 7 až 10 let.','Návratnost nelze stanovit bez konkrétní investice a ročního čistého přínosu.',$content);
        return $content;
    }
    if($post->ID!==1190 || $post->post_name!=='jak-spravne-vybrat-fotovoltaiku' || strpos($content,'data-se-fve-choice-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*1\. Co je fotovoltaika\?\s*</h2>~iu';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_CHOICE'
<section class="se-note" data-se-fve-choice-v1="1">
<h2>Jak vybrat FVE podle toho, co potřebujete?</h2>
<p>Nejdříve vyberte typ systému, až potom panely, baterii a dodavatele.</p>
<div style="overflow-x:auto"><table><thead><tr><th>Situace</th><th>Co si připravit</th><th>Další krok</th></tr></thead><tbody><tr><td>Rodinný dům se sítí</td><td>Roční i denní odběr, střecha, přetoky, záloha</td><td><a href="/kolik-stoji-fotovoltaika/">Cena a kontrola nabídky FVE</a></td></tr><tr><td>Dům s tepelným čerpadlem</td><td>Tepelná ztráta, měsíční odběr, sezónní výroba</td><td><a href="/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/">Porovnání kombinace FVE a TČ</a></td></tr><tr><td>Chata bez sítě</td><td>Wh za den, špičkový příkon, dny autonomie</td><td><a href="/solarni-sestava-na-chatu/">Navrhnout ostrovní sestavu</a></td></tr></tbody></table></div>
<p><strong>Před podpisem nabídky:</strong> porovnejte stejný výkon panelů, využitelnou kapacitu baterie, výkon střídače, rozsah zálohy, montáž, revizi, servis a záruky. Roční výroba není totéž co vlastní spotřeba. Nechte odborně ověřit střechu a elektroinstalaci.</p>
<p><a class="se-btn se-btn-primary" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve">Zkontrolovat nabídku domovní FVE →</a></p>
</section>
SE_CHOICE;
    $offset=$m[0][0][1];
    $content=substr($content,0,$offset).$block.substr($content,$offset);
    return str_replace('Optimální orientace panelů je směr na jih a sklon ve směru rovnoběžném se zemským rovnoběžkem.','Vhodná orientace a sklon závisejí na lokalitě, zastínění a profilu spotřeby. Jih může maximalizovat roční výnos, východ a západ mohou lépe rozložit výrobu během dne.',$content);
}
add_filter('the_content','solar_expert_legacy_fve_buyers_v1',20);
