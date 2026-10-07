<?php get_header(); ?>
<main>
  <?php while(have_posts()):the_post(); ?>
    <article class="se-content">
      <div class="se-kicker">Poradna</div>
      <h1><?php the_title(); ?></h1>
      <p class="se-content-meta">Aktualizováno <?php echo esc_html(get_the_modified_date('j. n. Y')); ?></p>
      <?php the_content(); ?>
      <div class="se-panel" style="margin-top:40px">
        <strong>Převeďte informace na konkrétní sestavu.</strong>
        <p class="se-muted">Builder spočítá potřebu a následně vyfiltruje kompatibilní komponenty.</p>
        <a class="se-btn se-btn-primary" href="<?php echo esc_url(solar_expert_public_url('solarni-sestava-na-chatu','/#builder')); ?>">Spustit Builder →</a>
      </div>
    </article>
  <?php endwhile; ?>
</main>
<?php get_footer(); ?>
