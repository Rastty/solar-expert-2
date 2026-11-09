<?php get_header(); ?>
<main>
  <?php while(have_posts()):the_post(); ?>
    <article class="se-content">
      <div class="se-kicker">Poradna</div>
      <h1><?php the_title(); ?></h1>
      <p class="se-content-meta">Aktualizováno <?php echo esc_html(get_the_modified_date('j. n. Y')); ?></p>
      <?php the_content(); ?>
      <?php $se_next_step = solar_expert_article_next_step(get_post_field('post_name', get_the_ID())); ?>
      <aside class="se-panel se-post-next" data-se-decision-path="<?php echo esc_attr($se_next_step['scope']); ?>" aria-label="Další krok podle tématu">
        <strong><?php echo esc_html($se_next_step['heading']); ?></strong>
        <p class="se-muted"><?php echo esc_html($se_next_step['description']); ?></p>
        <div class="se-actions">
          <a class="se-btn se-btn-primary" href="<?php echo esc_url($se_next_step['primary_url']); ?>"><?php echo esc_html($se_next_step['primary_label']); ?></a>
          <a class="se-btn" href="<?php echo esc_url($se_next_step['secondary_url']); ?>"><?php echo esc_html($se_next_step['secondary_label']); ?> →</a>
        </div>
      </aside>
    </article>
  <?php endwhile; ?>
</main>
<?php get_footer(); ?>
