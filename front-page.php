<?php get_header(); ?>
<main>
<section class="se-hero se-gridbg">
  <div class="se-wrap se-hero-grid">
    <div>
      <div class="se-kicker">CZ decision engine · bez prodejního tlaku</div>
      <h1 class="se-h1">Solár, který sedí vám.</h1>
      <p class="se-lead">Pro chatu, ostrovní systém nebo zálohu při výpadku: vyberte běžné spotřebiče, upravte jejich provoz a zjistěte potřebné panely, baterii, měnič a MPPT.</p>
      <p class="se-muted">Plánujete klasickou síťovou FVE na rodinném domě? Začněte <a href="/kolik-stoji-fotovoltaika/">průvodcem výběrem a cenou fotovoltaiky</a>.</p>
      <div class="se-actions"><a class="se-btn se-btn-primary" href="#builder">Navrhnout sestavu zdarma →</a><a class="se-btn" href="#jak">Jak to funguje</a></div>
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
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('vyber-baterii')); ?>"><span class="se-chip">P1</span><h3>Battery Selector</h3><p>Napětí, energie, vybíjecí výkon a reálný fit k měniči.</p></a>
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('mppt-kalkulacka')); ?>"><span class="se-chip">P1</span><h3>MPPT Selector</h3><p>PV výkon, nabíjecí proud, Voc a podporované napětí baterie.</p></a>
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('vyber-menice')); ?>"><span class="se-chip">P1</span><h3>Inverter Selector</h3><p>Trvalý výkon, surge, 12/24/48 V a integrovaný MPPT.</p></a>
      <a class="se-tool" href="<?php echo esc_url(solar_expert_public_url('quote-checker')); ?>"><span class="se-chip">NEW</span><h3>Quote Checker</h3><p>Prověřte nabídku pro ostrovní nebo záložní napájení. Nejde o kontrolu celé síťové FVE.</p></a>
    </div>
  </div>
</section>
</main>
<?php get_footer(); ?>
