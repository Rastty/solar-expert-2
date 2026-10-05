<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width,initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="se-header">
  <div class="se-wrap se-nav">
    <a class="se-brand" href="<?php echo esc_url(home_url('/')); ?>"><span class="se-logo"></span><span>Solar Expert</span></a>
    <nav class="se-menu">
      <a href="<?php echo esc_url(home_url('/#builder')); ?>">Navrhnout sestavu</a>
      <a href="<?php echo esc_url(home_url('/vyber-baterii/')); ?>">Baterie</a>
      <a href="<?php echo esc_url(home_url('/mppt-kalkulacka/')); ?>">MPPT</a>
      <a href="<?php echo esc_url(home_url('/vyber-menice/')); ?>">Měnič</a>
    </nav>
    <a class="se-btn se-btn-primary" href="<?php echo esc_url(home_url('/#builder')); ?>">Spustit Builder</a>
  </div>
</header>
