<?php get_header(); ?>
<main>
  <div class="se-content">
    <?php if ( is_category('baterie') ) : ?>
      <div class="se-kicker">Solar Expert · baterie</div>
      <h1>Solární baterie: výběr, kapacita a kompatibilita</h1>
      <p class="se-lead">Baterii nevybírejte jen podle Ah. Pro správný návrh potřebujete systémové napětí, energii v kWh, limit BMS a vazbu na výkon měniče. Začněte technickým výběrem a potom si projděte články k jednotlivým tématům.</p>

      <div class="se-panel" style="margin:28px 0 38px">
        <h2>Vyberte baterii podle skutečné potřeby</h2>
        <p>Battery Selector porovná 12/24/48 V, potřebnou energii a limit BMS proti požadovanému výkonu měniče.</p>
        <a class="se-btn se-btn-primary" href="<?php echo esc_url(solar_expert_public_url('vyber-baterii')); ?>">Spustit Battery Selector →</a>
      </div>

      <h2>Články o bateriích</h2>
    <?php elseif ( is_category('solarni-panely') ) : ?>
      <div class="se-kicker">Solar Expert · solární panely</div>
      <h1>Solární panely: výběr, výkon a správný návrh</h1>
      <p class="se-lead">Nejdřív zjistěte, kolik panelů potřebujete, jakou mají skutečnou výrobu a zda dávají smysl pro střechu a způsob zapojení. Nabídku domácí fotovoltaiky kontrolujte jinak než ostrovní systém na chatu.</p>
      <section class="se-category-hub" aria-labelledby="se-solar-guide-heading" data-se-category-hub="solar-panels">
        <h2 id="se-solar-guide-heading">Začněte ověřenými průvodci</h2>
        <p class="se-muted">Vybrané návody řadíme podle rozhodnutí, která je potřeba udělat před podpisem nabídky nebo nákupem komponent.</p>
        <div class="se-category-curated-grid">
          <a class="se-category-guide se-category-guide-primary" href="<?php echo esc_url(home_url('/kolik-stoji-fotovoltaika/')); ?>"><strong>Domovní FVE: cena a kontrola nabídky</strong><span>Co má být součástí ceny, výkon systému, montáž a podmínky připojení →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/fve-panely-na-strechu/')); ?>"><strong>Panely na střechu</strong><span>Počet panelů, orientace, stínění, využitelná plocha a statika →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/kolik-panelu-je-potreba-na-jeden-string/')); ?>"><strong>Kolik panelů do stringu?</strong><span>Vmp, Voc za chladu, limity měniče a bezpečné zapojení →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/fotovoltaika-vykon-na-m2/')); ?>"><strong>Jaký výkon na m²?</strong><span>Rozdíl mezi Wp, kWp, plochou a skutečnou výrobou →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/castecne-zastineni-a-solarni-panely/')); ?>"><strong>Částečné zastínění panelů</strong><span>Jak stín ovlivní výkon stringu a kdy řešit optimizéry →</span></a>
        </div>
        <p class="se-category-alternative">Potřebujete systém pro chatu bez připojení k síti? Použijte zvlášť <a href="<?php echo esc_url(solar_expert_public_url('solarni-sestava-na-chatu','/solarni-sestava-na-chatu/')); ?>">Solar Setup Builder</a>; nenahrazuje návrh domácí síťové FVE.</p>
      </section>
      <h2 class="se-category-archive-title">Další články z archivu solárních panelů</h2>
      <p class="se-muted">Následuje původní archiv. Starší publikované informace vždy porovnejte s aktuálním datasheetem a platnými pravidly.</p>
    <?php elseif ( is_category('tepelna-cerpadla') ) : ?>
      <div class="se-kicker">Solar Expert · tepelná čerpadla</div>
      <h1>Tepelná čerpadla: výběr, spotřeba a nabídka</h1>
      <p class="se-lead">Dobré tepelné čerpadlo musí odpovídat domu, tepelné ztrátě a otopné soustavě. Nejdřív prověřte typ systému, výkon v mrazu, SCOP, hlučnost a servis; až potom cenu konkrétního modelu.</p>
      <section class="se-category-hub" aria-labelledby="se-heat-pump-guide-heading" data-se-category-hub="heat-pumps">
        <h2 id="se-heat-pump-guide-heading">Průvodci pro správné rozhodnutí</h2>
        <p class="se-muted">Ověřte technické požadavky a vhodnost pro dům ještě před porovnáním cenových nabídek.</p>
        <div class="se-category-curated-grid">
          <a class="se-category-guide se-category-guide-primary" href="<?php echo esc_url(home_url('/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/')); ?>"><strong>Jak vybrat tepelné čerpadlo</strong><span>Vzduch–voda, radiátory, hlučnost, provoz v mrazu a servis →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/prumerna-spotreba-tepelneho-cerpadla/')); ?>"><strong>Spotřeba a provozní náklady</strong><span>Roční kWh, SCOP a proč samotný katalogový COP nestačí →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda/')); ?>"><strong>Umístění jednotky u souseda</strong><span>Hlučnost, odstupy, okolní podmínky a co vyjasnit před montáží →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady/')); ?>"><strong>Samsung: technická recenze</strong><span>Konkrétní produktová řada, omezení a body k ověření u dodavatele →</span></a>
          <a class="se-category-guide" href="<?php echo esc_url(home_url('/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/')); ?>"><strong>Fotovoltaika a tepelné čerpadlo</strong><span>Jak hodnotit kombinaci, spotřebu, souběh a investici →</span></a>
        </div>
        <p class="se-category-alternative">Zvažujete vrt pro systém země–voda? Začněte samostatným <a href="<?php echo esc_url(home_url('/vrt-pro-tepelne-cerpadlo/')); ?>">průvodcem vrty</a>. Parametry vzduchových jednotek se na vrty nepřenášejí.</p>
      </section>
      <h2 class="se-category-archive-title">Další články z archivu tepelných čerpadel</h2>
      <p class="se-muted">Následuje původní archiv, včetně starších článků. Ověřujte rok publikace a aktuálnost technických tvrzení.</p>
    <?php else : ?>
      <div class="se-kicker">Solar Expert · poradna</div>
      <h1><?php single_cat_title(); ?></h1>
      <?php if ( category_description() ) : ?>
        <div class="se-lead"><?php echo wp_kses_post(category_description()); ?></div>
      <?php endif; ?>
    <?php endif; ?>

    <div class="se-archive-list">
      <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
        <article class="se-archive-card">
          <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
          <?php the_excerpt(); ?>
          <a class="se-archive-more" href="<?php the_permalink(); ?>">Přečíst článek →</a>
        </article>
      <?php endwhile; else : ?>
        <p>Nic nebylo nalezeno.</p>
      <?php endif; ?>
    </div>

    <?php the_posts_pagination(array(
      'mid_size' => 1,
      'prev_text' => '← Novější',
      'next_text' => 'Starší →',
    )); ?>
  </div>
</main>
<?php get_footer(); ?>
