<?php get_header(); ?>
<main>
<section class="se-hero se-gridbg">
  <div class="se-wrap se-hero-grid">
    <div>
      <div class="se-kicker">CZ / SK decision engine · bez prodejního tlaku</div>
      <h1 class="se-h1">Solár, který sedí vám.</h1>
      <p class="se-lead">Vyberte spotřebiče a způsob použití. Spočítáme panely, baterii, měnič a MPPT a ukážeme jen technicky odpovídající sestavy.</p>
      <div class="se-actions"><a class="se-btn se-btn-primary" href="#builder">Navrhnout sestavu zdarma →</a><a class="se-btn" href="#jak">Jak to funguje</a></div>
    </div>
    <div><?php echo do_shortcode('[solar_expert_builder]'); ?></div>
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
    <div class="se-kicker" style="color:var(--solar)">Decision tools</div>
    <h2 class="se-title">Samostatné nástroje pro konkrétní rozhodnutí.</h2>
    <div class="se-tools">
      <a class="se-tool" href="<?php echo esc_url(home_url('/vyber-baterii/')); ?>"><span class="se-chip">P1</span><h3>Battery Selector</h3><p>Napětí, energie, vybíjecí výkon a reálný fit k měniči.</p></a>
      <a class="se-tool" href="<?php echo esc_url(home_url('/mppt-kalkulacka/')); ?>"><span class="se-chip">P1</span><h3>MPPT Selector</h3><p>PV výkon, nabíjecí proud, Voc a podporované napětí baterie.</p></a>
      <a class="se-tool" href="<?php echo esc_url(home_url('/vyber-menice/')); ?>"><span class="se-chip">P1</span><h3>Inverter Selector</h3><p>Trvalý výkon, surge, 12/24/48 V a integrovaný MPPT.</p></a>
      <a class="se-tool" href="<?php echo esc_url(home_url('/quote-checker/')); ?>"><span class="se-chip">NEW</span><h3>Quote Checker</h3><p>Prověřte sizing konkrétní nabídky a odhalte poddimenzované komponenty.</p></a>
    </div>
  </div>
</section>
</main>
<?php get_footer(); ?>
