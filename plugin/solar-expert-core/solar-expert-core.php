<?php
/**
 * Plugin Name: Solar Expert Core
 * Description: Optional fallback settings layer for Solar Expert 2.0. The active 2.0 theme owns the current domain logic.
 * Version: 0.2.0
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

function solar_expert_core_register_settings() {
    // The Solar Expert 2.0 theme registers this option with stricter validation.
    // Never override that registration when the theme core is active.
    if ( function_exists( 'solar_expert_register_settings' ) ) {
        return;
    }

    register_setting( 'solar_expert_core', 'solar_expert_affiliate_map', array(
        'type' => 'object',
        'sanitize_callback' => function( $value ) { return is_array( $value ) ? $value : array(); },
        'default' => array( 'products' => array(), 'leads' => array() ),
    ) );
}
add_action( 'admin_init', 'solar_expert_core_register_settings', 5 );
