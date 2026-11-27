/** Illustrative annual electricity model, no Samsung performance or current tariff claim. */
function solar_expert_samsung_annual_cost_v1($content) {
    if (is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() ||
        !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if (!($post instanceof WP_Post) ||
        $post->post_name!=='recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady') return $content;
    if (strpos($content,'data-se-samsung-annual-cost="v1"')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Pro koho bych Samsung zařadil do shortlistu\s*</h2>~u';
    if (preg_match_all($pattern,$content,$matches,PREG_OFFSET_CAPTURE)!==1) return $content;
    $offset=$matches[0][0][1];
    $html=<<<'SOLAR_SAMSUNG_ANNUAL_COST'
<section data-se-samsung-annual-cost="v1" class="se-note" aria-label="Model roční spotřeby elektřiny">
<h2>Samsung EHS: kolik elektřiny spotřebuje za rok?</h2>
<p>Pro předběžné porovnání nabídek vydělte roční potřebu dodaného tepla očekávaným sezónním faktorem celé soustavy (SPF). Jde o skutečnou sezónní účinnost soustavy, nikoli katalogový COP v jediném provozním bodě. Model níže předpokládá <strong>12 000 kWh tepla ročně pouze na vytápění</strong> a modelovou proměnnou cenu elektřiny 5 Kč/kWh včetně DPH. Nejde o aktuální tarif ani měření výrobku Samsung.</p>
<div style="overflow-x:auto"><table><thead><tr><th scope="col">Předpokládaný SPF</th><th scope="col">Elektřina za rok</th><th scope="col">Proměnný náklad za rok</th></tr></thead><tbody>
<tr><td>3,0</td><td>4 000 kWh</td><td>20 000 Kč</td></tr>
<tr><td>3,5</td><td>3 429 kWh</td><td>17 143 Kč</td></tr>
<tr><td>4,0</td><td>3 000 kWh</td><td>15 000 Kč</td></tr>
<tr><td>4,5</td><td>2 667 kWh</td><td>13 333 Kč</td></tr>
</tbody></table></div>
<p>Rozdíl mezi SPF 3,0 a 4,0 v tomto modelu znamená asi 5 000 Kč ročně. Tabulka nezahrnuje přípravu teplé vody, servis, fixní poplatky ani investici. Výsledný SPF musí vycházet z návrhu konkrétního domu a zahrnovat spotřebu pomocných zařízení, odmrazování a případného elektrického dohřevu pro vytápění. Úspora ani dosažení uvedených SPF nejsou garantovány.</p>
<h3>Co požadovat v nabídkách, aby šly porovnat</h3>
<ul><li>Přesné označení venkovní a vnitřní jednotky a výkon při návrhové venkovní teplotě a požadované teplotě vody.</li><li>Odhad roční spotřeby pro stejnou potřebu tepla, včetně pomocné elektřiny a dohřevu, s vysvětlením předpokladů.</li><li>Položkovou cenu celé instalace včetně DPH, hydrauliky, elektroinstalace, uvedení do provozu a podmínek servisu a záruky.</li></ul>
<p>Porovnejte především celkové náklady a parametry ve vašem domě, ne samotný katalogový výkon. Další souvislosti najdete v našem průvodci <a href="/tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji/">tepelným čerpadlem vzduch–voda</a>.</p>
</section>
SOLAR_SAMSUNG_ANNUAL_COST;
    return substr($content,0,$offset).$html.substr($content,$offset);
}
add_filter('the_content','solar_expert_samsung_annual_cost_v1',20);
