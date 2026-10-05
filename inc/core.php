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

function solar_expert_public_url($slug, $fallback = '/#builder') {
  $post = get_page_by_path(sanitize_title($slug), OBJECT, 'page');
  if ( $post && $post->post_status === 'publish' ) {
    return get_permalink($post);
  }
  return home_url($fallback);
}

function solar_expert_public_page_exists($slug) {
  $post = get_page_by_path(sanitize_title($slug), OBJECT, 'page');
  return (bool) ($post && $post->post_status === 'publish');
}

function solar_expert_load_catalog() {
  $path = trailingslashit(get_template_directory()) . 'assets/data/product-seed.json';
  if ( ! file_exists($path) ) {
    return array('schemaVersion'=>'0','products'=>array());
  }
  $decoded = json_decode(file_get_contents($path), true);
  if ( ! is_array($decoded) || ! isset($decoded['products']) || ! is_array($decoded['products']) ) {
    return array('schemaVersion'=>'0','products'=>array());
  }
  return $decoded;
}

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
      $id = strtolower(trim((string)$key));
      $valid_key = (bool) preg_match('/^[a-z0-9_-]+(?:@[a-z0-9_-]+)?$/', $id);
      $safe = esc_url_raw($url, array('http','https'));
      if ( $valid_key && $safe ) {
        $clean[$bucket][$id] = $safe;
      }
    }
  }

  return $clean;
}

function solar_expert_sanitize_affiliate_bases($input) {
  $existing = get_option('solar_expert_affiliate_bases', array());
  if ( is_string($input) ) {
    $decoded = json_decode(wp_unslash($input), true);
    if ( ! is_array($decoded) ) {
      add_settings_error('solar_expert_affiliate_bases','invalid_bases_json','Affiliate base odkazy nebyly uloženy: JSON není platný.','error');
      return is_array($existing) ? $existing : array();
    }
    $input = $decoded;
  }
  if ( ! is_array($input) ) { return array(); }

  $clean = array();
  foreach ( $input as $merchant => $url ) {
    $merchant_id = sanitize_key($merchant);
    $safe = esc_url_raw($url, array('http','https'));
    if ( $merchant_id && $safe ) {
      $clean[$merchant_id] = $safe;
    }
  }
  return $clean;
}

function solar_expert_register_settings() {
  register_setting('solar_expert_settings','solar_expert_affiliate_map',array(
    'sanitize_callback'=>'solar_expert_sanitize_affiliate_map',
    'default'=>array('products'=>array(),'leads'=>array()),
  ));
  register_setting('solar_expert_settings','solar_expert_affiliate_bases',array(
    'sanitize_callback'=>'solar_expert_sanitize_affiliate_bases',
    'default'=>array(),
  ));
}
add_action('admin_init','solar_expert_register_settings');

function solar_expert_handle_settings_save() {
  if ( ! current_user_can('edit_theme_options') ) {
    wp_die(esc_html__('Nemáte oprávnění spravovat nastavení Solar Expert.', 'solar-expert-2'));
  }

  check_admin_referer('solar_expert_save_settings');

  $map_input = isset($_POST['solar_expert_affiliate_map']) ? wp_unslash($_POST['solar_expert_affiliate_map']) : '';
  $bases_input = isset($_POST['solar_expert_affiliate_bases']) ? wp_unslash($_POST['solar_expert_affiliate_bases']) : '';

  $clean_map = solar_expert_sanitize_affiliate_map($map_input);
  $clean_bases = solar_expert_sanitize_affiliate_bases($bases_input);

  update_option('solar_expert_affiliate_map', $clean_map, false);
  update_option('solar_expert_affiliate_bases', $clean_bases, false);

  $redirect = add_query_arg(
    array('page'=>'solar-expert-settings','solar_expert_saved'=>'1'),
    admin_url('themes.php')
  );
  wp_safe_redirect($redirect);
  exit;
}
add_action('admin_post_solar_expert_save_settings', 'solar_expert_handle_settings_save');

function solar_expert_settings_menu() {
  add_options_page('Solar Expert','Solar Expert','edit_theme_options','solar-expert-settings','solar_expert_settings_page');
  add_theme_page('Solar Expert','Solar Expert','edit_theme_options','solar-expert-settings','solar_expert_settings_page');
}
add_action('admin_menu','solar_expert_settings_menu');

function solar_expert_settings_capability() {
  return 'edit_theme_options';
}
add_filter('option_page_capability_solar_expert_settings','solar_expert_settings_capability');

function solar_expert_settings_page() {
  if ( ! current_user_can('edit_theme_options') ) {
    wp_die(esc_html__('Nemáte oprávnění spravovat nastavení Solar Expert.', 'solar-expert-2'));
  }

  $map = get_option('solar_expert_affiliate_map', array('products'=>array(),'leads'=>array()));
  if ( ! is_array($map) ) {
    $map = array('products'=>array(),'leads'=>array());
  }
  $bases = get_option('solar_expert_affiliate_bases', array());
  if ( ! is_array($bases) ) { $bases = array(); }
  $json = wp_json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $bases = get_option('solar_expert_affiliate_bases', array());
  if ( ! is_array($bases) ) { $bases = array(); }
  $bases_json = wp_json_encode($bases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  ?>
  <div class="wrap">
    <h1>Solar Expert</h1>
    <p>Affiliate deeplinky jsou uložené ve WordPress databázi a nejsou součástí veřejného GitHub repozitáře.</p>
    <?php settings_errors('solar_expert_affiliate_map'); ?>
    <?php if ( ! empty($_GET['solar_expert_saved']) ) : ?>
      <div class="notice notice-success is-dismissible"><p>Nastavení Solar Expert bylo uloženo.</p></div>
    <?php endif; ?>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
      <input type="hidden" name="action" value="solar_expert_save_settings">
      <?php wp_nonce_field('solar_expert_save_settings'); ?>
      <h2>Affiliate base odkazy</h2>
      <p>Sem stačí uložit defaultní partnerský odkaz obchodníka. Pro konkrétní produkt se automaticky doplní <code>desturl</code>. Produktová mapa níže slouží jako přesnější override.</p>
      <textarea name="solar_expert_affiliate_bases" rows="8" class="large-text code"><?php echo esc_textarea($bases_json); ?></textarea>

      <h2>Affiliate mapa</h2>
      <p>Klíč v <code>products</code> může být buď ID produktu (např. <code>mppt-victron-100-50</code>), nebo přesná kombinace produktu a obchodu (např. <code>mppt-victron-100-50@battery-cz</code>). Varianta s obchodem má přednost před automatickým deeplinkem. <code>leads</code> je určené pro lead-gen odkazy.</p>
      <textarea name="solar_expert_affiliate_map" rows="22" class="large-text code"><?php echo esc_textarea($json); ?></textarea>
      <?php submit_button('Uložit affiliate mapu'); ?>
    </form>

    <?php
    $catalog = solar_expert_load_catalog();
    $product_map = isset($map['products']) && is_array($map['products']) ? $map['products'] : array();
    $coverage_rows = array();
    $mapped_count = 0;

    foreach ( $catalog['products'] as $product ) {
      $offers = ! empty($product['offers']) && is_array($product['offers'])
        ? $product['offers']
        : array(array(
            'merchant' => $product['merchant'] ?? '',
            'price_czk' => $product['price_czk'] ?? null,
            'availability' => $product['availability'] ?? null,
          ));

      foreach ( $offers as $offer ) {
        $merchant = sanitize_key($offer['merchant'] ?? '');
        if ( ! $merchant ) { continue; }
        $exact_key = ($product['id'] ?? '') . '@' . $merchant;
        $legacy_key = $product['id'] ?? '';
        $mapped = isset($product_map[$exact_key]) || (
          ($product['merchant'] ?? '') === $merchant && isset($product_map[$legacy_key])
        ) || isset($bases[$merchant]);
        if ( $mapped ) { $mapped_count++; }

        $coverage_rows[] = array(
          'product' => $product['name'] ?? $product['id'],
          'merchant' => $merchant,
          'key' => $exact_key,
          'availability' => $offer['availability'] ?? $product['availability'] ?? '',
          'price' => $offer['price_czk'] ?? $product['price_czk'] ?? null,
          'mapped' => $mapped,
        );
      }
    }
    $coverage_total = count($coverage_rows);
    ?>
    <hr>
    <h2>Affiliate coverage</h2>
    <p><strong><?php echo esc_html($mapped_count); ?> / <?php echo esc_html($coverage_total); ?></strong> produktových nabídek má affiliate mapování. Nezmapované nabídky bezpečně používají ověřený zdrojový odkaz.</p>
    <table class="widefat striped">
      <thead><tr><th>Produkt</th><th>Obchod</th><th>Klíč</th><th>Dostupnost</th><th>Cena</th><th>Affiliate</th></tr></thead>
      <tbody>
      <?php foreach ( $coverage_rows as $row ) : ?>
        <tr>
          <td><?php echo esc_html($row['product']); ?></td>
          <td><code><?php echo esc_html($row['merchant']); ?></code></td>
          <td><code><?php echo esc_html($row['key']); ?></code></td>
          <td><?php echo esc_html($row['availability']); ?></td>
          <td><?php echo $row['price'] ? esc_html(number_format_i18n((float)$row['price'], 0) . ' Kč') : '—'; ?></td>
          <td><?php echo $row['mapped'] ? '<strong style="color:#16733b">ANO</strong>' : '<span style="color:#8a5b00">zdrojový odkaz</span>'; ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>

    <?php
    $manifest = solar_expert_load_manifest();
    ?>
    <h2 style="margin-top:28px">Managed content</h2>
    <table class="widefat striped">
      <thead><tr><th>Obsah</th><th>Typ</th><th>WordPress stav</th><th>Manifest</th></tr></thead>
      <tbody>
      <?php foreach ( $manifest['items'] as $item ) :
        $type = isset($item['type']) && in_array($item['type'], array('page','post'), true) ? $item['type'] : 'page';
        $post = get_page_by_path(sanitize_title($item['slug'] ?? ''), OBJECT, $type);
      ?>
        <tr>
          <td><code><?php echo esc_html($item['slug'] ?? ''); ?></code></td>
          <td><?php echo esc_html($type); ?></td>
          <td><?php echo esc_html($post ? $post->post_status : 'nenalezeno'); ?></td>
          <td><?php echo ! empty($item['preserve_status']) ? 'preserve' : esc_html($item['status'] ?? $item['status_if_new'] ?? 'draft'); ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php
}


function solar_expert_health_payload() {
  $catalog = solar_expert_load_catalog();

  $manifest = solar_expert_load_manifest();
  $map = get_option('solar_expert_affiliate_map', array('products'=>array(),'leads'=>array()));
  if ( ! is_array($map) ) {
    $map = array('products'=>array(),'leads'=>array());
  }
  $bases = get_option('solar_expert_affiliate_bases', array());
  if ( ! is_array($bases) ) {
    $bases = array();
  }

  $theme = wp_get_theme();
  $last_sync = get_option('solar_expert_last_content_sync', array());

  return array(
    'status' => 'ok',
    'build_marker' => 'dev-rc-0.5.6',
    'theme_version' => (string) $theme->get('Version'),
    'catalog_schema_version' => (string) ($catalog['schemaVersion'] ?? '0'),
    'catalog_products' => isset($catalog['products']) && is_array($catalog['products']) ? count($catalog['products']) : 0,
    'manifest_schema_version' => (string) ($manifest['schemaVersion'] ?? '0'),
    'managed_content_items' => isset($manifest['items']) && is_array($manifest['items']) ? count($manifest['items']) : 0,
    'affiliate_product_mappings' => isset($map['products']) && is_array($map['products']) ? count($map['products']) : 0,
    'affiliate_merchant_bases' => count($bases),
    'affiliate_lead_mappings' => isset($map['leads']) && is_array($map['leads']) ? count($map['leads']) : 0,
    'last_content_sync_utc' => isset($last_sync['time']) ? (string) $last_sync['time'] : null,
  );
}

function solar_expert_register_health_route() {
  register_rest_route('solar-expert/v1', '/health', array(
    'methods' => 'GET',
    'callback' => function(){ return rest_ensure_response(solar_expert_health_payload()); },
    'permission_callback' => '__return_true',
  ));
}
add_action('rest_api_init', 'solar_expert_register_health_route');
