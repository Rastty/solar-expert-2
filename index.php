<?php get_header(); ?>
<main>
  <div class="se-content">
    <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
      <article>
        <h1><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h1>
        <?php the_excerpt(); ?>
      </article>
    <?php endwhile; else : ?>
      <p>Nic nebylo nalezeno.</p>
    <?php endif; ?>
  </div>
</main>
<?php get_footer(); ?>
