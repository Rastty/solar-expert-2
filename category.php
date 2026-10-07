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
