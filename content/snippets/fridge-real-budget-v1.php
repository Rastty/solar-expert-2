/** Fridge-specific real energy budget, verified product comparison, existing post only. */
function solar_expert_fridge_real_budget_v1($content) {
    if(is_admin() || !is_singular('post') || !in_the_loop() || !is_main_query() || !is_string($content) || strlen($content)>600000) return $content;
    $post=get_queried_object();
    if(!($post instanceof WP_Post) || (int)$post->ID!==1613 || $post->post_name!=='solarni-sestava-na-chatu-pro-lednici' || strpos($content,'data-se-fridge-real-budget-v1')!==false) return $content;
    $pattern='~<h2(?:\s[^>]*)?>\s*Jak velkou LiFePO₄ baterii potřebujete\s*</h2>~u';
    if(preg_match_all($pattern,$content,$m,PREG_OFFSET_CAPTURE)!==1) return $content;
    $block=<<<'SE_FRIDGE_BUDGET'
<section data-se-fridge-real-budget-v1="1" aria-labelledby="se-fridge-budget-heading" style="margin:22px 0;line-height:1.6">
<div style="padding:clamp(16px,4vw,26px);border:1px solid #c9ddd9;border-radius:16px;background:#eff8f5;color:#142e2b">
<p style="margin:0;color:#205d53;font-weight:700;font-size:.85em;text-transform:uppercase;letter-spacing:.04em">Návrh na celý víkend</p>
<h2 id="se-fridge-budget-heading" style="margin:8px 0;color:#142e2b">Jak velká baterie na lednici na dva dny bez slunce?</h2>
<p><strong>Při denní spotřebě 850 Wh na straně 230 V vychází v našem modelu nejméně 2,72 kWh jmenovité kapacity nové baterie.</strong> Na rozdíl od jednoduchého výpočtu započítáváme měnič při provozu i nečinnosti. 25,6V/100Ah baterie má 2,56 kWh, a v tomto konkrétním modelu tedy nedosáhne plných dvou dnů. Pro rezervu zvažte další kapacitní stupeň.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,165px),1fr));gap:10px">
<div style="padding:14px;border:1px solid #c9ddd9;background:#fff;border-radius:12px"><strong>50 Ah · 25,6 V</strong><span style="display:block;font-size:1.6rem;color:#205d53;font-weight:700">0,94 dne</span><small>1,28 kWh nominálně</small></div>
<div style="padding:14px;border:1px solid #c9ddd9;background:#fff;border-radius:12px"><strong>100 Ah · 25,6 V</strong><span style="display:block;font-size:1.6rem;color:#205d53;font-weight:700">1,88 dne</span><small>2,56 kWh nominálně</small></div>
<div style="padding:14px;border:2px solid #287b66;background:#fff;border-radius:12px"><strong>150 Ah · 25,6 V</strong><span style="display:block;font-size:1.6rem;color:#205d53;font-weight:700">2,82 dne</span><small>3,84 kWh nominálně</small></div>
</div>
<p style="font-size:.9em;margin:10px 0">Všechny hodnoty jsou modelové, při plném počátečním nabití, 80 % dostupné kapacity, nové baterii, bez dobíjení a se stejnou zátěží. Nejde o schválenou kombinaci konkrétních výrobků.</p>
<p style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:0"><a class="se-btn se-btn-primary" href="/vyber-baterii/">Porovnat baterie podle kWh →</a><a class="se-btn" href="/solarni-sestava-na-chatu/">Navrhnout celou sestavu →</a></p>
</div>
<h3>Tři scénáře podle skutečné spotřeby lednice a chaty</h3>
<p>Pro názornost předpokládáme 90% účinnost měniče při zátěži, 18 hodin bez zátěže při 8 W klidového DC příkonu (144 Wh/den) a 80 % dostupné kapacity baterie. Skutečná délka nečinnosti, účinnost při malém odběru a příkon v pohotovosti závisí na zařízení; měření DC energie na baterii je přesnější. Ztráty v době provozu nezapočítáváme podruhé.</p>
<div role="region" aria-label="Modely spotřeby a baterie" tabindex="0" style="overflow-x:auto;border:1px solid #d5dfdc;border-radius:10px"><table style="width:100%;min-width:470px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Odběr spotřebičů 230 V</th><th scope="col">Odběr z baterie za den</th><th scope="col">Jmenovitá baterie na 2 dny</th></tr></thead><tbody><tr><th scope="row">450 Wh</th><td>0,64 kWh</td><td>1,61 kWh</td></tr><tr style="background:#eff8f5;color:#142e2b"><th scope="row">850 Wh</th><td>1,09 kWh</td><td>2,72 kWh</td></tr><tr><th scope="row">1 300 Wh</th><td>1,59 kWh</td><td>3,97 kWh</td></tr></tbody></table></div>
<p>Výpočet pro střední řádek: 850 ÷ 0,9 + 8 × 18 = 1 088,4 Wh denně z baterie. Na dva dny 1 088,4 × 2 ÷ 0,8 = 2 721,1 Wh. Pro starší baterii s 80 % původní kapacity by stejný požadavek vycházel asi na 3,40 kWh jmenovitě. Zaokrouhlujte podle dostupných kompatibilních modulů, zohledněte ztráty, teplotu a skutečné chování BMS.</p>
<h3>Měnič na lednici: 500, 800 nebo 1 200 W?</h3>
<p>Modely Victron VE.Direct 230 V HW15 ukazují, proč číslo v názvu nelze zaměnit za trvalý výkon. Všechny níže uvedené hodnoty platí pro tuto konkrétní dokumentaci a 24V variantu. Starší revize mohou mít jiné údaje.</p>
<div role="region" aria-label="Porovnání měničů Victron" tabindex="0" style="overflow-x:auto;border:1px solid #d5dfdc;border-radius:10px"><table style="width:100%;min-width:530px;margin:0"><thead><tr style="background:#205d53;color:#fff"><th scope="col">Model</th><th scope="col">Trvale 25 °C / 40 °C</th><th scope="col">Špička / doba</th><th scope="col">Bez zátěže</th></tr></thead><tbody><tr><th scope="row">24/500</th><td>450 / 380 W</td><td>750 W / 3 s</td><td>8 W</td></tr><tr><th scope="row">24/800</th><td>800 / 650 W</td><td>1 200 W / 15 s</td><td>8 W</td></tr><tr><th scope="row">24/1200</th><td>1 150 / 1 000 W</td><td>1 600 W / 15 s</td><td>11 W</td></tr></tbody></table></div>
<p>Například pokud skutečně naměřená rozběhová zátěž překračuje 750 W, nestačí vybrat první model podle uvedené špičky. I vyšší model je pouze kandidát: ověřte zdánlivý výkon a charakter motorové zátěže, délku špičky, teplotu, další současné spotřebiče a proudový limit baterie. Pro 1 200 W a 24 V s ilustrační účinností 90 % je DC odběr přibližně 55,6 A; při nižším napětí a rozběhu může být vyšší. V režimu ECO musí měnič spolehlivě rozpoznat požadavek lednice na spuštění. Bez ověření nenechávejte potraviny závislé na tomto režimu.</p>
<p>Zdroj: <a href="https://www.victronenergy.com/media/pg/Inverter_VE.Direct_230V_-_HW15/en/technical-specifications.html" rel="noopener">Victron VE.Direct 230 V HW15 – technická specifikace</a>. <a class="se-btn se-btn-primary" href="/vyber-menice/">Vybrat měnič podle výkonu a rozběhu →</a></p>
<h3>Stačí jeden 400Wp panel, nebo raději dva?</h3>
<p>Pokud počítáme 75% koeficient výroby od panelů po DC energii k baterii, 400Wp pole při 3 ekvivalentních hodinách dodá 0,90 kWh a 800Wp pole 1,80 kWh. Při jediné hodině jen 0,30 a 0,60 kWh. Střední scénář přitom vyžaduje 1,09 kWh denně z baterie. Jediný panel v prvním modelu nepokryje celý odběr, dvojice může pokrýt běžný den, nikoli garantovat provoz při zatažení. Ještě je nutné doplnit ztráty nabíjení a obnovu rezervy po nepříznivých dnech, pokud nejsou v koeficientu zahrnuté.</p>
<p>Pro 800 Wp/24 V výrobce uvádí u SmartSolar 100/30 nominální FV výkon 880 Wp. Dva panely však nesmějí překročit 100 V Voc ani v mrazu a musí vyhovět návrhovému Isc a startovacímu Vmp. <a href="https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html" rel="noopener">Oficiální technické údaje regulátoru</a> a <a href="/mppt-kalkulacka/">MPPT kalkulačka</a> pomohou s předběžnou kontrolou. Nejde o montážní návod.</p>
<div style="border-left:4px solid #287b66;background:#eff8f5;color:#142e2b;border-radius:8px;padding:14px"><strong>Před objednáním si připravte:</strong> skutečné Wh/den lednice, rozběh kompresoru, DC spotřebu měniče, počet dní bez výroby, sezónu a konkrétní modely baterie, panelu a regulátoru. Požadujte ověřenou kompatibilitu, jištění, kabely, konstrukci, montáž a záruky. <a href="/quote-checker/">Zkontrolovat nabídku dodavatele →</a></div>
</section>
SE_FRIDGE_BUDGET;
    $offset=$m[0][0][1];
    return substr($content,0,$offset).$block.substr($content,$offset);
}
add_filter('the_content','solar_expert_fridge_real_budget_v1',20);
