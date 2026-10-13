<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

require_once get_template_directory() . '/inc/core.php';
require_once get_template_directory() . '/inc/curated-archives.php';

function solar_expert_setup() {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('html5', array('search-form','gallery','caption','style','script'));
}
add_action('after_setup_theme','solar_expert_setup');

/**
 * Keep expensive calculators off non-tool pages.
 *
 * Homepage contains the Builder; published tool landing pages are selected by
 * slug, while embedded tools anywhere else are detected via shortcodes.
 * Ordinary articles and archives still load the first-party analytics and
 * approved affiliate/lead runtime.
 */
function solar_expert_tool_runtime_requirements() {
  $required = array('builder'=>false, 'selectors'=>false, 'quote'=>false);

  if ( is_front_page() ) {
    $required['builder'] = true;
    return $required;
  }
  if ( ! is_singular(array('page','post')) ) {
    return $required;
  }

  $post = get_queried_object();
  if ( ! ($post instanceof WP_Post) ) {
    return $required;
  }

  $slug = (string) $post->post_name;
  if ( $slug === 'solarni-sestava-na-chatu' ) {
    $required['builder'] = true;
  }
  if ( in_array($slug, array('vyber-baterii','mppt-kalkulacka','vyber-menice'), true) ) {
    $required['selectors'] = true;
  }
  if ( $slug === 'quote-checker' ) {
    $required['quote'] = true;
  }

  // Preserve arbitrary shortcode placements, not just managed landing pages.
  $body = (string) $post->post_content;
  if ( has_shortcode($body, 'solar_expert_builder') ) {
    $required['builder'] = true;
  }
  foreach ( array('solar_expert_battery_selector','solar_expert_mppt_selector','solar_expert_inverter_selector') as $tag ) {
    if ( has_shortcode($body, $tag) ) {
      $required['selectors'] = true;
    }
  }
  if ( has_shortcode($body, 'solar_expert_quote_checker') ) {
    $required['quote'] = true;
  }
  return $required;
}

function solar_expert_assets() {
  $dir=get_template_directory(); $uri=get_template_directory_uri();
  wp_enqueue_style('solar-expert-style', get_stylesheet_uri(), array(), filemtime($dir.'/style.css'));

  // Keep first-party outcomes and merchant/lead attribution on ALL pages.
  wp_enqueue_script('solar-expert-analytics',$uri.'/assets/js/analytics.js',array(),filemtime($dir.'/assets/js/analytics.js'),true);
  wp_enqueue_script('solar-expert-affiliate',$uri.'/assets/js/affiliate-adapter.js',array('solar-expert-analytics'),filemtime($dir.'/assets/js/affiliate-adapter.js'),true);
  wp_enqueue_script('solar-expert-leads',$uri.'/assets/js/lead-cta.js',array('solar-expert-affiliate'),filemtime($dir.'/assets/js/lead-cta.js'),true);

  $required=solar_expert_tool_runtime_requirements();
  $alpine_dependencies=array();

  if ( $required['builder'] || $required['selectors'] ) {
    wp_enqueue_script('solar-expert-matcher',$uri.'/assets/js/product-matcher.js',array('solar-expert-affiliate'),filemtime($dir.'/assets/js/product-matcher.js'),true);
  }
  if ( $required['builder'] ) {
    wp_enqueue_script('solar-expert-bundles',$uri.'/assets/js/bundle-composer.js',array('solar-expert-matcher'),filemtime($dir.'/assets/js/bundle-composer.js'),true);
    wp_enqueue_script('solar-expert-builder',$uri.'/assets/js/builder.js',array('solar-expert-bundles'),filemtime($dir.'/assets/js/builder.js'),true);
    $alpine_dependencies[]='solar-expert-builder';
  }
  if ( $required['selectors'] ) {
    wp_enqueue_script('solar-expert-selectors',$uri.'/assets/js/selectors.js',array('solar-expert-matcher'),filemtime($dir.'/assets/js/selectors.js'),true);
    $alpine_dependencies[]='solar-expert-selectors';
  }
  if ( $required['quote'] ) {
    wp_enqueue_script('solar-expert-quote-checker',$uri.'/assets/js/quote-checker.js',array('solar-expert-analytics'),filemtime($dir.'/assets/js/quote-checker.js'),true);
    $alpine_dependencies[]='solar-expert-quote-checker';
  }
  if ( ! empty($alpine_dependencies) ) {
    wp_enqueue_script('alpine','https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js',$alpine_dependencies,'3.14.9',true);
    wp_script_add_data('alpine','defer',true);
  }

  $affiliate_map = get_option('solar_expert_affiliate_map', array());
  if ( ! is_array($affiliate_map) ) {
    $affiliate_map = array();
  }
  $affiliate_bases = get_option('solar_expert_affiliate_bases', array());
  if ( ! is_array($affiliate_bases) ) {
    $affiliate_bases = array();
  }

  wp_localize_script('solar-expert-analytics','SolarExpertAnalyticsConfig',array(
    'endpoint'=>esc_url_raw(rest_url('solar-expert/v1/funnel-event')),
  ));

  // These merchant bases must remain available on editorial lead pages even
  // when Builder is intentionally not enqueued.
  wp_localize_script('solar-expert-affiliate','SolarExpertConfig',array(
    'catalogUrl'=>$uri.'/assets/data/product-seed.json',
    'homeUrl'=>home_url('/'),
    'affiliateMap'=>$affiliate_map,
    'affiliateBases'=>$affiliate_bases,
  ));
}
add_action('wp_enqueue_scripts','solar_expert_assets');
