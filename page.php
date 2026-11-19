<?php get_header(); ?>
<main>
  <?php while ( have_posts() ) : the_post(); ?>
    <?php
    // Only the canonical Builder landing page gets a direct, one-click sample.
    // Other tool pages and arbitrary Builder embeds retain their original UX.
    $is_builder_page = is_page('solarni-sestava-na-chatu')
      && has_shortcode((string) get_the_content(null, false, get_the_ID()), 'solar_expert_builder');
    ?>
    <article class="se-content<?php echo $is_builder_page ? ' se-content-builder' : ''; ?>">
      <div class="se-kicker">Solar Expert nástroj / průvodce</div>
      <h1><?php the_title(); ?></h1>
      <?php if ( $is_builder_page ) : ?>
        <div class="se-actions se-page-builder-actions">
          <a class="se-btn se-btn-primary se-demo-cta" href="#builder"
             x-data="{}" @click.prevent="$dispatch('solar-expert-open-demo')"
             aria-label="Zobrazit vzorovou solární sestavu bez vyplňování">
            Ukázat vzorovou sestavu →
          </a>
          <a class="se-btn" href="#builder">Spočítat vlastní spotřebu ↓</a>
        </div>
        <p class="se-page-builder-hint">Nejprve si prohlédněte modelovou sestavu. Potom ji můžete upravit podle své chaty.</p>
      <?php endif; ?>
      <?php the_content(); ?>
    </article>
  <?php endwhile; ?>
</main>
<?php get_footer(); ?>
