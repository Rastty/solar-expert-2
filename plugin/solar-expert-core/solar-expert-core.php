<?php
/**
 * Plugin Name: Solar Expert Core
 * Description: Domain logic and content sync for Solar Expert 2.0.
 * Version: 0.1.0
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

function solar_expert_core_register_settings() {
    register_setting( 'solar_expert_core', 'solar_expert_affiliate_map', array(
        'type' => 'object',
        'sanitize_callback' => function( $value ) { return is_array( $value ) ? $value : array(); },
        'default' => array(),
    ) );
}
add_action( 'admin_init', 'solar_expert_core_register_settings' );
