<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

require_once get_template_directory() . '/inc/core.php';

function solar_expert_setup() {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('html5', array('search-form','gallery','caption','style','script'));
}
add_action('after_setup_theme','solar_expert_setup');

function solar_expert_assets() {
  $dir=get_template_directory(); $uri=get_template_directory_uri();
  wp_enqueue_style('solar-expert-style', get_stylesheet_uri(), array(), filemtime($dir.'/style.css'));
  wp_enqueue_script('solar-expert-affiliate',$uri.'/assets/js/affiliate-adapter.js',array(),filemtime($dir.'/assets/js/affiliate-adapter.js'),true);
  wp_enqueue_script('solar-expert-matcher',$uri.'/assets/js/product-matcher.js',array('solar-expert-affiliate'),filemtime($dir.'/assets/js/product-matcher.js'),true);
  wp_enqueue_script('solar-expert-bundles',$uri.'/assets/js/bundle-composer.js',array('solar-expert-matcher'),filemtime($dir.'/assets/js/bundle-composer.js'),true);
  wp_enqueue_script('solar-expert-builder',$uri.'/assets/js/builder.js',array('solar-expert-bundles'),filemtime($dir.'/assets/js/builder.js'),true);
  wp_enqueue_script('solar-expert-selectors',$uri.'/assets/js/selectors.js',array('solar-expert-builder'),filemtime($dir.'/assets/js/selectors.js'),true);
  wp_enqueue_script('solar-expert-quote-checker',$uri.'/assets/js/quote-checker.js',array(),filemtime($dir.'/assets/js/quote-checker.js'),true);
  wp_enqueue_script('alpine','https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js',array('solar-expert-selectors','solar-expert-quote-checker'),'3.14.9',true);
  wp_script_add_data('alpine','defer',true);
  $affiliate_map = get_option('solar_expert_affiliate_map', array());
  if ( ! is_array($affiliate_map) ) {
    $affiliate_map = array();
  }

  wp_localize_script('solar-expert-builder','SolarExpertConfig',array(
    'catalogUrl'=>$uri.'/assets/data/product-seed.json',
    'homeUrl'=>home_url('/'),
    'affiliateMap'=>$affiliate_map,
  ));
}
add_action('wp_enqueue_scripts','solar_expert_assets');
