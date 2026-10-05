<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

function solar_expert_render_part($part) {
  ob_start();
  get_template_part('template-parts/'.$part);
  return ob_get_clean();
}

add_shortcode('solar_expert_builder', fn()=>solar_expert_render_part('solar-builder'));
add_shortcode('solar_expert_battery_selector', fn()=>solar_expert_render_part('battery-selector'));
add_shortcode('solar_expert_mppt_selector', fn()=>solar_expert_render_part('mppt-selector'));
add_shortcode('solar_expert_inverter_selector', fn()=>solar_expert_render_part('inverter-selector'));
add_shortcode('solar_expert_quote_checker', fn()=>solar_expert_render_part('quote-checker'));

function solar_expert_content_root() {
  return trailingslashit(get_template_directory()) . 'content/';
}

function solar_expert_load_manifest() {
  $path = solar_expert_content_root() . 'manifest.json';
  if ( ! file_exists($path) ) {
    return array('schemaVersion'=>'0','items'=>array());
  }

  $raw = file_get_contents($path);
  $data = json_decode($raw, true);

  if ( ! is_array($data) || ! isset($data['items']) || ! is_array($data['items']) ) {
    return array('schemaVersion'=>'0','items'=>array());
  }

  return $data;
}

function solar_expert_safe_content_file($relative_path) {
  $theme_root = realpath(get_template_directory());
  $candidate  = realpath(get_template_directory() . '/' . ltrim($relative_path, '/'));

  if ( ! $theme_root || ! $candidate || strpos($candidate, $theme_root) !== 0 || ! is_file($candidate) ) {
    return false;
  }

  return $candidate;
}

function solar_expert_manifest_fingerprint($manifest) {
  $ctx = hash_init('sha256');
  $manifest_path = solar_expert_content_root() . 'manifest.json';

  if ( file_exists($manifest_path) ) {
    hash_update_file($ctx, $manifest_path);
  }

  foreach ( $manifest['items'] as $item ) {
    if ( empty($item['file']) ) {
      continue;
    }

    $file = solar_expert_safe_content_file($item['file']);
    if ( $file ) {
      hash_update_file($ctx, $file);
    }
  }

  return hash_final($ctx);
}

function solar_expert_sync_managed_content($force = false) {
  $manifest = solar_expert_load_manifest();
  $fingerprint = solar_expert_manifest_fingerprint($manifest);
  $last = get_option('solar_expert_content_fingerprint', '');

  if ( ! $force && $fingerprint && hash_equals((string)$last, (string)$fingerprint) ) {
    return array('updated'=>0,'created'=>0,'skipped'=>0,'errors'=>array());
  }

  $result = array('updated'=>0,'created'=>0,'skipped'=>0,'errors'=>array());

  foreach ( $manifest['items'] as $item ) {
    $type = isset($item['type']) && in_array($item['type'], array('page','post'), true) ? $item['type'] : 'page';
    $slug = sanitize_title($item['slug'] ?? '');

    if ( ! $slug || empty($item['file']) ) {
      $result['errors'][] = 'Invalid manifest item';
      continue;
    }

    $file = solar_expert_safe_content_file($item['file']);
    if ( ! $file ) {
      $result['errors'][] = 'Missing content file: ' . $item['file'];
      continue;
    }

    $content = file_get_contents($file);
    $existing = get_page_by_path($slug, OBJECT, $type);

    if ( ! $existing && empty($item['create_if_missing']) ) {
      $result['skipped']++;
      continue;
    }

    $postarr = array(
      'post_type'    => $type,
      'post_name'    => $slug,
      'post_title'   => wp_strip_all_tags($item['title'] ?? $slug),
      'post_content' => $content,
    );

    if ( $existing ) {
      $postarr['ID'] = $existing->ID;
      $postarr['post_status'] = ! empty($item['preserve_status']) ? $existing->post_status : ($item['status'] ?? $existing->post_status);
      $id = wp_update_post(wp_slash($postarr), true);

      if ( is_wp_error($id) ) {
        $result['errors'][] = $slug . ': ' . $id->get_error_message();
        continue;
      }

      update_post_meta($id, '_solar_expert_managed', 1);
      update_post_meta($id, '_solar_expert_source_file', sanitize_text_field($item['file']));
      $result['updated']++;
    } else {
      $postarr['post_status'] = $item['status_if_new'] ?? 'draft';
      $id = wp_insert_post(wp_slash($postarr), true);

      if ( is_wp_error($id) ) {
        $result['errors'][] = $slug . ': ' . $id->get_error_message();
        continue;
      }

      update_post_meta($id, '_solar_expert_managed', 1);
      update_post_meta($id, '_solar_expert_source_file', sanitize_text_field($item['file']));
      $result['created']++;
    }
  }

  if ( empty($result['errors']) && $fingerprint ) {
    update_option('solar_expert_content_fingerprint', $fingerprint, false);
  }

  update_option('solar_expert_last_content_sync', array(
    'time'   => current_time('mysql', true),
    'result' => $result,
  ), false);

  return $result;
}

function solar_expert_maybe_sync_content() {
  solar_expert_sync_managed_content(false);
}
add_action('admin_init', 'solar_expert_maybe_sync_content');
add_action('after_switch_theme', function(){ solar_expert_sync_managed_content(true); });

function solar_expert_sync_after_theme_update($upgrader, $options) {
  if ( empty($options['type']) || $options['type'] !== 'theme' ) {
    return;
  }

  solar_expert_sync_managed_content(false);
}
add_action('upgrader_process_complete', 'solar_expert_sync_after_theme_update', 20, 2);

function solar_expert_sanitize_affiliate_map($input) {
  $existing = get_option('solar_expert_affiliate_map', array());

  if ( is_string($input) ) {
    $decoded = json_decode(wp_unslash($input), true);
    if ( ! is_array($decoded) ) {
      add_settings_error('solar_expert_affiliate_map','invalid_json','Affiliate mapa nebyla uložena: JSON není platný.','error');
      return is_array($existing) ? $existing : array();
    }
    $input = $decoded;
  }

  if ( ! is_array($input) ) {
    return array();
  }

  $clean = array('products'=>array(),'leads'=>array());
  foreach ( array('products','leads') as $bucket ) {
    if ( empty($input[$bucket]) || ! is_array($input[$bucket]) ) {
      continue;
    }
    foreach ( $input[$bucket] as $key => $url ) {
      $id = sanitize_key($key);
      $safe = esc_url_raw($url, array('http','https'));
      if ( $id && $safe ) {
        $clean[$bucket][$id] = $safe;
      }
    }
  }

  return $clean;
}

function solar_expert_register_settings() {
  register_setting('solar_expert_settings','solar_expert_affiliate_map',array(
    'sanitize_callback'=>'solar_expert_sanitize_affiliate_map',
    'default'=>array('products'=>array(),'leads'=>array()),
  ));
}
add_action('admin_init','solar_expert_register_settings');

function solar_expert_settings_menu() {
  add_options_page('Solar Expert','Solar Expert','manage_options','solar-expert-settings','solar_expert_settings_page');
}
add_action('admin_menu','solar_expert_settings_menu');

function solar_expert_settings_page() {
  if ( ! current_user_can('manage_options') ) {
    return;
  }

  $map = get_option('solar_expert_affiliate_map', array('products'=>array(),'leads'=>array()));
  if ( ! is_array($map) ) {
    $map = array('products'=>array(),'leads'=>array());
  }
  $json = wp_json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  ?>
  <div class="wrap">
    <h1>Solar Expert</h1>
    <p>Affiliate deeplinky jsou uložené ve WordPress databázi a nejsou součástí veřejného GitHub repozitáře.</p>
    <?php settings_errors('solar_expert_affiliate_map'); ?>
    <form method="post" action="options.php">
      <?php settings_fields('solar_expert_settings'); ?>
      <h2>Affiliate mapa</h2>
      <p>Klíč v <code>products</code> musí odpovídat ID produktu v katalogu. <code>leads</code> je určené pro lead-gen odkazy.</p>
      <textarea name="solar_expert_affiliate_map" rows="22" class="large-text code"><?php echo esc_textarea($json); ?></textarea>
      <?php submit_button('Uložit affiliate mapu'); ?>
    </form>
  </div>
  <?php
}
