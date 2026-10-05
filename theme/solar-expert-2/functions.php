<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function solar_expert_2_assets() {
  $dir = get_stylesheet_directory();
  $uri = get_stylesheet_directory_uri();

  wp_enqueue_script('solar-expert-product-matcher',$uri.'/assets/js/product-matcher.js',array(),filemtime($dir.'/assets/js/product-matcher.js'),true);
  wp_enqueue_script('solar-expert-bundle-composer',$uri.'/assets/js/bundle-composer.js',array('solar-expert-product-matcher'),filemtime($dir.'/assets/js/bundle-composer.js'),true);
  wp_enqueue_script('solar-expert-builder',$uri.'/assets/js/builder.js',array('solar-expert-bundle-composer'),filemtime($dir.'/assets/js/builder.js'),true);
  wp_enqueue_script('solar-expert-selectors',$uri.'/assets/js/selectors.js',array('solar-expert-builder'),filemtime($dir.'/assets/js/selectors.js'),true);

  wp_localize_script('solar-expert-builder','SolarExpertConfig',array(
    'catalogUrl'=>$uri.'/assets/data/product-seed.json',
  ));
}
add_action('wp_enqueue_scripts','solar_expert_2_assets');

function solar_expert_builder_shortcode(){ ob_start(); get_template_part('template-parts/solar-builder'); return ob_get_clean(); }
function solar_expert_battery_selector_shortcode(){ ob_start(); get_template_part('template-parts/battery-selector'); return ob_get_clean(); }
function solar_expert_mppt_selector_shortcode(){ ob_start(); get_template_part('template-parts/mppt-selector'); return ob_get_clean(); }

add_shortcode('solar_expert_builder','solar_expert_builder_shortcode');
add_shortcode('solar_expert_battery_selector','solar_expert_battery_selector_shortcode');
add_shortcode('solar_expert_mppt_selector','solar_expert_mppt_selector_shortcode');
