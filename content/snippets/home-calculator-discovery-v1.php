/** Homepage-only addition of two existing calculators. Preserve Builder and theme. */
function solar_expert_home_calculator_discovery_v1_render($html,$phase=PHP_OUTPUT_HANDLER_FINAL) {
    // Refuse to alter partial, compressed, already edited or unexpected responses.
    static $partial=false;
    if(($phase & PHP_OUTPUT_HANDLER_FINAL)===0) { $partial=true; return $html; }
    if($partial || !is_string($html) || strlen($html)>1500000 ||
        stripos($html,'</body>')===false || stripos($html,'</html>')===false ||
        strpos($html,'data-se-home-calculator-discovery-v1=')!==false) return $html;
    $pattern='~<h2 class="se-title">Samostatné nástroje pro konkrétní rozhodnutí\.</h2>\s*<div class="se-tools">~u';
    if(preg_match_all($pattern,$html,$m,PREG_OFFSET_CAPTURE)!==1) return $html;
    $cards=<<<'SE_HOME_CALCULATORS'
<a class="se-tool" data-se-home-calculator-discovery-v1="battery-payback" href="/kdy-ma-smysl-fotovoltaika/#se-bic-title"><span class="se-chip">Ekonomika FVE</span><h3>Návratnost baterie k fotovoltaice</h3><p>Má příplatek za baterii smysl? Spočítejte roční přínos, ušlý výkup přetoků a maximální cenu při vlastní cílové návratnosti.</p></a>
<a class="se-tool" data-se-home-calculator-discovery-v1="heating-backup" href="/zalozni-zdroj-pro-obehove-cerpadlo/#se-urc-title"><span class="se-chip">Záloha topení</span><h3>Výdrž záložního zdroje a baterie</h3><p>Kolik Ah potřebujete na 8, 12 nebo 24 hodin provozu čerpadla a kotle? Zohledněte klidový odběr UPS a stav baterie.</p></a>
SE_HOME_CALCULATORS;
    $offset=$m[0][0][1]+strlen($m[0][0][0]);
    return substr($html,0,$offset)."\n".$cards."\n".substr($html,$offset);
}
function solar_expert_home_calculator_discovery_v1_start() {
    if(is_admin() || !is_front_page() || is_feed() || is_preview() ||
       is_robots() || is_trackback() || wp_doing_ajax() ||
       (defined('REST_REQUEST') && REST_REQUEST) ||
       ($_SERVER['REQUEST_METHOD']??'')!=='GET') return;
    ob_start('solar_expert_home_calculator_discovery_v1_render');
}
add_action('template_redirect','solar_expert_home_calculator_discovery_v1_start',99);
