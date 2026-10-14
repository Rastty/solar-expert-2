<?php get_header(); ?>
<main>
<section class="se-hero se-gridbg">
  <div class="se-wrap se-hero-grid">
    <div>
      <div class="se-kicker">Praktický solární poradce · bez prodejního tlaku</div>
      <h1 class="se-h1">Solár, který sedí vám.</h1>
      <p class="se-lead">Pro chatu, ostrovní systém nebo zálohu při výpadku: vyberte běžné spotřebiče, upravte jejich provoz a zjistěte potřebné panely, baterii, měnič a MPPT.</p>
      <p class="se-muted">Plánujete klasickou síťovou FVE na rodinném domě? Začněte <a href="/kolik-stoji-fotovoltaika/">průvodcem výběrem a cenou fotovoltaiky</a>.</p>
      <div class="se-actions se-hero-actions">
        <a class="se-btn se-btn-primary se-demo-cta" href="#builder" x-data="{}" @click.prevent="$dispatch('solar-expert-open-demo')" data-se-home-demo="builder-preview" aria-label="Zobrazit modelovou solární sestavu pro chatu bez vyplňování">Zobrazit ukázkovou sestavu zdarma →</a>
        <a class="se-btn" href="#builder">Spočítat vlastní sestavu →</a>
      </div>
      <p class="se-hero-sample-hint"><strong>Bez registrace a bez zadávání:</strong> ukážeme modelovou sestavu na chatu s lednicí, světly, notebookem a Wi-Fi. Výsledek snadno přepočítáte podle vlastní spotřeby. <a href="#jak">Jak to funguje?</a></p>
    </div>
    <div><?php echo do_shortcode('[solar_expert_builder]'); ?></div>
  </div>
</section>

<section class="se-section se-path-section" aria-labelledby="se-path-heading">
  <div class="se-wrap">
    <div class="se-kicker">Začněte správnou otázkou</div>
    <h2 class="se-title" id="se-path-heading">Jakou energii potřebujete řešit?</h2>
    <p class="se-muted se-path-intro">Jiné rozhodování vyžaduje fotovoltaika připojená k síti, jiné samostatná sestava pro chatu a jiné tepelné čerpadlo. Vyberte svůj případ a pokračujte do správného průvodce.</p>
    <div class="se-path-grid">
      <article class="se-path-card">
        <span class="se-chip">Rodinný dům</span>
        <h3>Domovní fotovoltaika</h3>
        <p>Chcete porovnat nabídku na panely, baterii, měnič, montáž a připojení k síti?</p>
        <a class="se-btn se-btn-primary" href="<?php echo esc_url(home_url('/kolik-stoji-fotovoltaika/')); ?>">Cena a kontrola nabídky FVE →</a>
      </article>
      <article class="se-path-card">
        <span class="se-chip">Chata a záloha</span>
        <h3>Ostrovní solární sestava</h3>
        <p>Potřebujete spočítat spotřebiče, baterii, panely a měnič bez běžného připojení do sítě?</p>
        <a class="se-btn se-btn-primary" href="<?php echo esc_url(solar_expert_public_url('solarni-sestava-na-chatu','/solarni-sestava-na-chatu/')); ?>">Otevřít Solar Setup Builder →</a>
      </article>
      <article class="se-path-card">
        <span class="se-chip">Vytápění domu</span>
        <h3>Tepelné čerpadlo</h3>
        <p>Rozhodujete mezi typy, hlučností, provozními náklady a konkrétním návrhem pro dům?</p>
        <a class="se-btn se-btn-primary" href="<?php echo esc_url(home_url('/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/')); ?>">Jak vybrat tepelné čerpadlo →</a>
      </article>
    </div>
  </div>
</section>

<!-- Direct crawl paths from the recently recrawled homepage to four new
     published editorial guides still awaiting first Google discovery.
     The fifth new guide, household FVE prices, is already featured above. -->
<section class="se-section se-home-discovery" aria-labelledby="se-home-discovery-title" data-se-home-discovery="managed-new-guides">
  <div class="se-wrap">
    <div class="se-kicker">Praktická poradna</div>
    <h2 class="se-title" id="se-home-discovery-title">Když řešíte konkrétní situaci.</h2>
    <p class="se-muted se-home-discovery-intro">Nemusíte začínat porovnáváním produktů. Vyberte technickou otázku, která ovlivní správný návrh, a ověřte možnosti dřív než budete poptávat montáž.</p>
    <div class="se-home-discovery-group">
      <h3>Fotovoltaika pro dům a další plochy</h3>
      <p class="se-muted">Řešíte elektrické vytápění? <a href="<?php echo esc_url(home_url('/fotovoltaika-a-elektrokotel/')); ?>">Fotovoltaika a elektrokotel: zimní výroba, spotřeba a skutečná ekonomika →</a></p>
      <div class="se-home-discovery-grid">
        <a class="se-home-guide" href="<?php echo esc_url(home_url('/fotovoltaika-na-pozemku/')); ?>">
          <strong>Fotovoltaika na pozemku <span aria-hidden="true">→</span></strong>
          <span>Když střecha není vhodná: konstrukce, stín, vedení kabelů a podmínky instalace na zahradě.</span>
        </a>
        <a class="se-home-guide" href="<?php echo esc_url(home_url('/pruhledne-solarni-panely/')); ?>">
          <strong>Průhledné solární panely <span aria-hidden="true">→</span></strong>
          <span>Kde dává smysl solární sklo a BIPV, co dnes zvládá a čím se liší od klasických FV panelů.</span>
        </a>
      </div>
    </div>
    <div class="se-home-discovery-group" data-se-home-offgrid-buying="guides">
      <h3>Chata bez elektřiny: jak vybrat a koupit správné komponenty</h3>
      <div class="se-home-discovery-grid">
        <a class="se-home-guide" href="<?php echo esc_url(home_url('/solarni-sestava-na-chatu-pro-lednici/')); ?>">
          <strong>Solár na chatu pro lednici 230 V <span aria-hidden="true">→</span></strong>
          <span>Modelová spotřeba, potřebná baterie LiFePO₄, rozběh měniče a jak se dostat ke konkrétnímu nákupnímu seznamu.</span>
        </a>
        <a class="se-home-guide" href="<?php echo esc_url(home_url('/jak-vybrat-mppt-regulator-pro-400w-panel/')); ?>">
          <strong>Jaký MPPT k 400W solárnímu panelu <span aria-hidden="true">→</span></strong>
          <span>12 nebo 24 V, srovnání Victron 100/20, 100/30 a 100/50 a kontrola před koupí.</span>
        </a>
      </div>
    </div>
    <div class="se-home-discovery-group">
      <h3>Jaký typ tepelného čerpadla potřebujete?</h3>
      <div class="se-home-discovery-grid">
        <a class="se-home-guide" href="<?php echo esc_url(home_url('/tepelne-cerpadlo-monoblok/')); ?>">
          <strong>Monoblok nebo split? <span aria-hidden="true">→</span></strong>
          <span>Rozdíly v montáži, ochraně před mrazem, chladivovém okruhu a požadavcích na servis.</span>
        </a>
        <a class="se-home-guide" href="<?php echo esc_url(home_url('/tepelne-cerpadlo-vzduch-vzduch/')); ?>">
          <strong>Tepelné čerpadlo vzduch–vzduch <span aria-hidden="true">→</span></strong>
          <span>Pro které domy a místnosti funguje vytápění vzduchem a proč samo neřeší teplou vodu.</span>
        </a>
      </div>
    </div>
    <p class="se-home-discovery-more">Další technická témata najdete v <a href="<?php echo esc_url(home_url('/category/solarni-panely/')); ?>">poradně solárních panelů</a> a v <a href="<?php echo esc_url(home_url('/category/tepelna-cerpadla/')); ?>">poradně tepelných čerpadel</a>.</p>
  </div>
</section>

<section id="jak" class="se-section">
  <div class="se-wrap">
    <div class="se-kicker">Nejdřív potřeba, potom produkt</div>
    <h2 class="se-title">Žádný generický Top 10. Komponenty musí fungovat spolu.</h2>
    <div class="se-cardgrid">
      <div class="se-card"><span class="se-chip">01</span><h3>Spotřeba</h3><p>Co poběží, kolik hodin a jaká je rozběhová špička.</p></div>
      <div class="se-card"><span class="se-chip">02</span><h3>Výpočet</h3><p>Panely, LiFePO₄, systémové napětí, měnič a MPPT.</p></div>
      <div class="se-card"><span class="se-chip">03</span><h3>Výběr</h3><p>Budget / Best Value / Premium jen z komponent, které projdou technickými pravidly.</p></div>
    </div>
  </div>
</section>

<section class="se-section se-section-dark">
  <div class="se-wrap">
    <div class="se-kicker" style="color:var(--solar)">Kalkulačky a výběr komponent</div>
    <h2 class="se-title">Samostatné nástroje pro konkrétní rozhodnutí.</h2>
    <div class="se-tools">
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('vyber-baterii')); ?>"><span class="se-chip">LiFePO₄</span><h3>Výběr baterie</h3><p>Napětí 12/24/48 V, energie v kWh a vybíjecí proud BMS pro zvolený měnič.</p></a>
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('mppt-kalkulacka')); ?>"><span class="se-chip">Regulátor</span><h3>Výběr MPPT regulátoru</h3><p>Výkon panelů, Voc za mrazu, startovní Vmp a nabíjecí proud.</p></a>
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('vyber-menice')); ?>"><span class="se-chip">12/24/48 V</span><h3>Výběr měniče</h3><p>Trvalý a špičkový výkon, napětí baterie a integrovaný MPPT.</p></a>
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('quote-checker')); ?>"><span class="se-chip">Kontrola sestavy</span><h3>Kontrola nabídky pro chatu</h3><p>Ověřte kompatibilitu komponent pro ostrovní nebo záložní napájení. Nejde o kontrolu celé síťové FVE.</p></a>
    </div>
  </div>
</section>
</main>
<?php get_footer(); ?>
