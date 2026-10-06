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

function solar_expert_catalog_price_freshness($catalog, $max_days = 30) {
  $stats = array(
    'max_age_days' => (int) $max_days,
    'total' => 0,
    'fresh' => 0,
    'stale' => 0,
    'unknown' => 0,
  );

  $products = isset($catalog['products']) && is_array($catalog['products']) ? $catalog['products'] : array();
  $now = time();

  foreach ( $products as $product ) {
    if ( ($product['availability'] ?? '') === 'discontinued' ) {
      continue;
    }

    $offers = ! empty($product['offers']) && is_array($product['offers'])
      ? $product['offers']
      : array($product);

    foreach ( $offers as $snapshot ) {
      $price = isset($snapshot['price_czk']) ? (float) $snapshot['price_czk'] : 0;
      if ( $price <= 0 || ($snapshot['availability'] ?? $product['availability'] ?? '') === 'discontinued' ) {
        continue;
      }

      $stats['total']++;
      $verified_at = isset($snapshot['verified_at'])
        ? (string) $snapshot['verified_at']
        : (isset($product['verified_at']) ? (string) $product['verified_at'] : '');

      if ( ! $verified_at ) {
        $stats['unknown']++;
        continue;
      }

      $ts = strtotime($verified_at . ' 00:00:00 UTC');
      if ( ! $ts ) {
        $stats['unknown']++;
        continue;
      }

      $age_days = (int) floor(max(0, $now - $ts) / DAY_IN_SECONDS);
      if ( $age_days > (int) $max_days ) {
        $stats['stale']++;
      } else {
        $stats['fresh']++;
      }
    }
  }

  return $stats;
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
  hash_update($ctx, 'managed-content-sync-v2-yoast-meta');
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

    $seo_meta = solar_expert_seo_meta($slug);
    if ( is_array($seo_meta) ) {
      if ( ! empty($seo_meta['title']) ) {
        update_post_meta($id, '_yoast_wpseo_title', sanitize_text_field($seo_meta['title']));
      }
      if ( ! empty($seo_meta['description']) ) {
        update_post_meta($id, '_yoast_wpseo_metadesc', sanitize_text_field($seo_meta['description']));
      }
    }

    // Public managed pages are explicit SEO assets. Do not let an inherited
    // Yoast Page default accidentally keep tools/trust pages out of search.
    if ( ! empty($item['indexable']) ) {
      update_post_meta($id, '_yoast_wpseo_meta-robots-noindex', '2');
      update_post_meta($id, '_yoast_wpseo_meta-robots-nofollow', '0');
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

function solar_expert_content_sync_state() {
  $manifest = solar_expert_load_manifest();
  $current = solar_expert_manifest_fingerprint($manifest);
  $stored = (string) get_option('solar_expert_content_fingerprint', '');
  $last = get_option('solar_expert_last_content_sync', array());
  $errors = isset($last['result']['errors']) && is_array($last['result']['errors'])
    ? count($last['result']['errors'])
    : 0;

  if ( ! $current ) {
    return array('status'=>'error','required'=>true,'current'=>'','stored'=>$stored,'errors'=>1);
  }
  if ( $stored && hash_equals($stored, $current) ) {
    return array('status'=>'current','required'=>false,'current'=>$current,'stored'=>$stored,'errors'=>$errors);
  }
  return array(
    'status' => $errors > 0 ? 'error' : 'sync_required',
    'required' => true,
    'current' => $current,
    'stored' => $stored,
    'errors' => $errors,
  );
}

function solar_expert_schedule_content_sync() {
  $state = solar_expert_content_sync_state();
  if ( empty($state['required']) ) {
    return;
  }

  if ( ! wp_next_scheduled('solar_expert_async_content_sync') ) {
    wp_schedule_single_event(time() + 10, 'solar_expert_async_content_sync');
  }
}
add_action('init', 'solar_expert_schedule_content_sync', 50);

function solar_expert_run_async_content_sync() {
  $state = solar_expert_content_sync_state();
  if ( empty($state['required']) ) {
    return;
  }

  if ( get_transient('solar_expert_content_sync_lock') ) {
    return;
  }

  set_transient('solar_expert_content_sync_lock', 1, 5 * MINUTE_IN_SECONDS);
  solar_expert_sync_managed_content(false);
  delete_transient('solar_expert_content_sync_lock');
}
add_action('solar_expert_async_content_sync', 'solar_expert_run_async_content_sync');

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

function solar_expert_handle_content_sync() {
  if ( ! current_user_can('edit_theme_options') ) {
    wp_die(esc_html__('Nemáte oprávnění synchronizovat obsah Solar Expert.', 'solar-expert-2'));
  }

  check_admin_referer('solar_expert_sync_content');

  $result = solar_expert_sync_managed_content(true);
  $args = array(
    'page' => 'solar-expert-settings',
    'solar_expert_synced' => '1',
    'se_created' => (int) ($result['created'] ?? 0),
    'se_updated' => (int) ($result['updated'] ?? 0),
    'se_skipped' => (int) ($result['skipped'] ?? 0),
    'se_errors' => count($result['errors'] ?? array()),
  );

  wp_safe_redirect(add_query_arg($args, admin_url('themes.php')));
  exit;
}
add_action('admin_post_solar_expert_sync_content', 'solar_expert_handle_content_sync');

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
    <p><strong>Build <code>dev-rc-0.11.55</code></strong></p>
    <?php $content_sync_state = solar_expert_content_sync_state(); ?>
    <?php if ( ! empty($content_sync_state['required']) ) : ?>
      <div class="notice notice-warning"><p><strong>Managed content: <?php echo esc_html(strtoupper($content_sync_state['status'])); ?></strong> — nový manifest ještě není plně synchronizovaný. Automatický sync je naplánovaný; ruční tlačítko níže zůstává jako fallback.</p></div>
    <?php else : ?>
      <div class="notice notice-success"><p><strong>Managed content: CURRENT</strong> — WordPress obsah odpovídá aktuálnímu manifestu.</p></div>
    <?php endif; ?>
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
    $price_freshness = solar_expert_catalog_price_freshness($catalog, 30);
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
        $active = ! in_array(($offer['availability'] ?? $product['availability'] ?? ''), array('discontinued','unavailable'), true);
        if ( $mapped && $active ) { $mapped_count++; }

        $coverage_rows[] = array(
          'product' => $product['name'] ?? $product['id'],
          'merchant' => $merchant,
          'key' => $exact_key,
          'availability' => $offer['availability'] ?? $product['availability'] ?? '',
          'price' => $offer['price_czk'] ?? $product['price_czk'] ?? null,
          'mapped' => $mapped,
          'active' => $active,
        );
      }
    }
    $coverage_total = count(array_filter($coverage_rows, function($row){ return ! empty($row['active']); }));
    $affiliate_health = solar_expert_affiliate_coverage($catalog, $map, $bases);
    ?>
    <?php
      $funnel7 = solar_expert_funnel_summary(7);
      $funnel28 = solar_expert_funnel_summary(28);
      $funnel_rows = array(
        'tool_view' => 'Tool views',
        'tool_start' => 'Tool starts',
        'solar_builder_complete' => 'Builder completes',
        'selector_engaged' => 'Selector engagements',
        'quote_checker_complete' => 'Quote Checker completes',
        'affiliate_click' => 'Affiliate product clicks',
        'bundle_deal_click' => 'Bundle-deal clicks',
        'lead_click' => 'Lead clicks',
      );
    ?>
    <hr>
    <h2>Money funnel</h2>
    <p class="description">First-party agregované čítače bez ukládání IP, cookie ID nebo volného uživatelského textu. Uchovává se pouze posledních 35 dní.</p>
    <table class="widefat striped" style="max-width:720px">
      <thead><tr><th>Událost</th><th>7 dní</th><th>28 dní</th></tr></thead>
      <tbody>
      <?php foreach ( $funnel_rows as $event_key => $label ) : ?>
        <tr>
          <td><?php echo esc_html($label); ?></td>
          <td><?php echo esc_html((int) ($funnel7['events'][$event_key] ?? 0)); ?></td>
          <td><?php echo esc_html((int) ($funnel28['events'][$event_key] ?? 0)); ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>

    <?php
      $merchant_keys = array_values(array_unique(array_merge(array_keys($funnel7['merchants'] ?? array()), array_keys($funnel28['merchants'] ?? array()))));
      usort($merchant_keys, function($a, $b) use ($funnel28) {
        return (int) ($funnel28['merchants'][$b] ?? 0) <=> (int) ($funnel28['merchants'][$a] ?? 0);
      });
      $placement_keys = array_values(array_unique(array_merge(array_keys($funnel7['placements'] ?? array()), array_keys($funnel28['placements'] ?? array()))));
      usort($placement_keys, function($a, $b) use ($funnel28) {
        return (int) ($funnel28['placements'][$b] ?? 0) <=> (int) ($funnel28['placements'][$a] ?? 0);
      });
    ?>
    <?php if ( ! empty($merchant_keys) ) : ?>
      <h3>Outbound clicks by merchant</h3>
      <table class="widefat striped" style="max-width:720px">
        <thead><tr><th>Merchant</th><th>7 dní</th><th>28 dní</th></tr></thead>
        <tbody>
        <?php foreach ( $merchant_keys as $merchant_key ) : ?>
          <tr><td><code><?php echo esc_html($merchant_key); ?></code></td><td><?php echo esc_html((int) ($funnel7['merchants'][$merchant_key] ?? 0)); ?></td><td><?php echo esc_html((int) ($funnel28['merchants'][$merchant_key] ?? 0)); ?></td></tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>

    <?php if ( ! empty($placement_keys) ) : ?>
      <h3>Outbound clicks by placement</h3>
      <table class="widefat striped" style="max-width:720px">
        <thead><tr><th>Placement</th><th>7 dní</th><th>28 dní</th></tr></thead>
        <tbody>
        <?php foreach ( $placement_keys as $placement_key ) : ?>
          <tr><td><code><?php echo esc_html($placement_key); ?></code></td><td><?php echo esc_html((int) ($funnel7['placements'][$placement_key] ?? 0)); ?></td><td><?php echo esc_html((int) ($funnel28['placements'][$placement_key] ?? 0)); ?></td></tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>

    <hr>
    <h2>Price freshness</h2>
    <p>
      Okno: <strong><?php echo esc_html($price_freshness['max_age_days']); ?> dní</strong> ·
      fresh <strong style="color:#16733b"><?php echo esc_html($price_freshness['fresh']); ?></strong> ·
      stale <strong style="color:#b32d2e"><?php echo esc_html($price_freshness['stale']); ?></strong> ·
      verification unknown <strong style="color:#8a5b00"><?php echo esc_html($price_freshness['unknown']); ?></strong>
      / <?php echo esc_html($price_freshness['total']); ?> cenových snapshotů.
    </p>
    <p class="description">Známě starší snapshot než 30 dní se nesmí použít pro cenové pořadí. Odkaz může zůstat dostupný, ale cena se návštěvníkovi nezobrazuje, dokud není znovu ověřena.</p>

    <hr>
    <h2>Lead-gen coverage</h2>
    <?php
      $lead_map = isset($map['leads']) && is_array($map['leads']) ? $map['leads'] : array();
      $eon_heat_pump_mapped = ! empty($lead_map['eon-heat-pump']) || ! empty($bases['eon-cz']);
    ?>
    <p><code>eon-heat-pump</code>: <?php echo $eon_heat_pump_mapped ? '<strong style="color:#16733b">AFFILIATE AKTIVNÍ</strong>' : '<span style="color:#8a5b00">veřejný E.ON fallback</span>'; ?></p>
    <?php $eon_solar_mapped = ! empty($lead_map['eon-solar']) || ! empty($bases['eon-cz']); ?>
    <p><code>eon-solar</code>: <?php echo $eon_solar_mapped ? '<strong style="color:#16733b">AFFILIATE AKTIVNÍ</strong>' : '<span style="color:#8a5b00">veřejný E.ON fallback</span>'; ?></p>
    <p class="description">Nejjednodušší je vložit jeden E.ON partnerský base link jako <code>eon-cz</code> do Affiliate base odkazů. Solar Expert z něj automaticky vytvoří deeplink pro FVE i tepelné čerpadlo. Přesné hodnoty v <code>leads</code> zůstávají jako override.</p>

    <hr>
    <h2>Affiliate coverage</h2>
    <p><strong><?php echo esc_html($mapped_count); ?> / <?php echo esc_html($coverage_total); ?></strong> aktivních produktových nabídek má affiliate mapování. Nezmapované nabídky bezpečně používají ověřený zdrojový odkaz.</p>
    <p class="description">Doporučitelné nabídky: <strong><?php echo esc_html((int) ($affiliate_health['monetized_recommendable_offers'] ?? 0)); ?> / <?php echo esc_html((int) ($affiliate_health['recommendable_offers'] ?? 0)); ?></strong> monetizovaných (<?php echo esc_html((float) ($affiliate_health['recommendable_offer_coverage_pct'] ?? 0)); ?> %); produkty s alespoň jednou monetizovanou doporučitelnou nabídkou: <strong><?php echo esc_html((int) ($affiliate_health['monetized_recommendable_products'] ?? 0)); ?> / <?php echo esc_html((int) ($affiliate_health['recommendable_products'] ?? 0)); ?></strong>.</p>
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
          <td><?php
            if ( empty($row['active']) ) {
              echo '<span style="color:#777">NEAKTIVNÍ</span>';
            } else {
              echo $row['mapped'] ? '<strong style="color:#16733b">ANO</strong>' : '<span style="color:#8a5b00">zdrojový odkaz</span>';
            }
          ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>

    <?php
    $manifest = solar_expert_load_manifest();
    ?>
    <h2 style="margin-top:28px">Managed content</h2>
    <p>Po aktualizaci tématu lze vynutit synchronizaci manifestu a WordPress stránek ručně.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:12px 0 18px">
      <input type="hidden" name="action" value="solar_expert_sync_content">
      <?php wp_nonce_field('solar_expert_sync_content'); ?>
      <?php submit_button('Synchronizovat obsah teď', 'secondary', 'submit', false); ?>
    </form>
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


function solar_expert_funnel_allowed_events() {
  return array(
    'tool_view',
    'tool_start',
    'solar_builder_complete',
    'selector_engaged',
    'quote_checker_complete',
    'affiliate_click',
    'bundle_deal_click',
    'lead_click',
  );
}

function solar_expert_funnel_summary($days = 28) {
  $days = max(1, min(35, (int) $days));
  $data = get_option('solar_expert_funnel_daily', array());
  if ( ! is_array($data) ) { $data = array(); }

  $cutoff = gmdate('Y-m-d', time() - (($days - 1) * DAY_IN_SECONDS));
  $events = array();
  $tools = array();
  $merchants = array();
  $placements = array();

  foreach ( $data as $date => $buckets ) {
    if ( (string) $date < $cutoff || ! is_array($buckets) ) { continue; }
    foreach ( $buckets as $bucket => $count ) {
      $count = max(0, (int) $count);
      if ( ! $count ) { continue; }
      $parts = explode('|', (string) $bucket);
      $event = sanitize_key(array_shift($parts));
      if ( ! $event ) { continue; }
      $events[$event] = ($events[$event] ?? 0) + $count;
      foreach ( $parts as $part ) {
        if ( strpos($part, 'tool=') === 0 ) {
          $tool = sanitize_key(substr($part, 5));
          if ( $tool ) { $tools[$tool] = ($tools[$tool] ?? 0) + $count; }
        } elseif ( strpos($part, 'merchant=') === 0 ) {
          $merchant = sanitize_key(substr($part, 9));
          if ( $merchant ) { $merchants[$merchant] = ($merchants[$merchant] ?? 0) + $count; }
        } elseif ( strpos($part, 'placement=') === 0 ) {
          $placement = sanitize_key(substr($part, 10));
          if ( $placement ) { $placements[$placement] = ($placements[$placement] ?? 0) + $count; }
        }
      }
    }
  }

  arsort($merchants);
  arsort($placements);
  return array('events'=>$events, 'tools'=>$tools, 'merchants'=>$merchants, 'placements'=>$placements);
}

function solar_expert_record_funnel_event(WP_REST_Request $request) {
  $origin = (string) $request->get_header('origin');
  if ( $origin ) {
    $origin_host = strtolower((string) wp_parse_url($origin, PHP_URL_HOST));
    $home_host = strtolower((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
    if ( $origin_host && $home_host && $origin_host !== $home_host ) {
      return new WP_Error('solar_expert_origin', 'Invalid event origin.', array('status'=>403));
    }
  }

  $payload = $request->get_json_params();
  if ( ! is_array($payload) ) { $payload = array(); }

  $event = sanitize_key($payload['event'] ?? '');
  if ( ! in_array($event, solar_expert_funnel_allowed_events(), true) ) {
    return new WP_Error('solar_expert_event', 'Unsupported event.', array('status'=>400));
  }

  $dimensions = array();
  foreach ( array('tool','selector','status','merchant','placement','scenario','productId','leadId','dealId') as $field ) {
    if ( ! isset($payload[$field]) || ! is_scalar($payload[$field]) ) { continue; }
    $value = sanitize_key((string) $payload[$field]);
    if ( $value ) { $dimensions[$field] = substr($value, 0, 80); }
  }
  if ( isset($payload['monetized']) ) {
    $dimensions['monetized'] = ! empty($payload['monetized']) ? '1' : '0';
  }
  if ( isset($payload['matchCount']) ) {
    $dimensions['matchCount'] = (string) max(0, min(50, (int) $payload['matchCount']));
  }

  ksort($dimensions);
  $bucket = $event;
  foreach ( $dimensions as $key => $value ) {
    $bucket .= '|' . sanitize_key($key) . '=' . $value;
  }

  $day = gmdate('Y-m-d');
  $data = get_option('solar_expert_funnel_daily', array());
  if ( ! is_array($data) ) { $data = array(); }

  $cutoff = gmdate('Y-m-d', time() - (34 * DAY_IN_SECONDS));
  foreach ( array_keys($data) as $date ) {
    if ( (string) $date < $cutoff ) { unset($data[$date]); }
  }

  if ( empty($data[$day]) || ! is_array($data[$day]) ) { $data[$day] = array(); }
  $data[$day][$bucket] = min(1000000000, ((int) ($data[$day][$bucket] ?? 0)) + 1);
  update_option('solar_expert_funnel_daily', $data, false);

  return rest_ensure_response(array('ok'=>true));
}

function solar_expert_register_funnel_route() {
  register_rest_route('solar-expert/v1', '/funnel-event', array(
    'methods' => 'POST',
    'callback' => 'solar_expert_record_funnel_event',
    'permission_callback' => '__return_true',
  ));
}
add_action('rest_api_init', 'solar_expert_register_funnel_route');


function solar_expert_affiliate_coverage($catalog, $map, $bases) {
  $products = isset($catalog['products']) && is_array($catalog['products']) ? $catalog['products'] : array();
  $product_map = isset($map['products']) && is_array($map['products']) ? $map['products'] : array();
  $bases = is_array($bases) ? $bases : array();

  $active_offers = 0;
  $monetized_active_offers = 0;
  $recommendable_offers = 0;
  $monetized_recommendable_offers = 0;
  $recommendable_products = 0;
  $monetized_recommendable_products = 0;
  $monetized_merchants = array();

  foreach ( $products as $product ) {
    $offers = ! empty($product['offers']) && is_array($product['offers'])
      ? $product['offers']
      : array(array(
          'merchant' => $product['merchant'] ?? '',
          'availability' => $product['availability'] ?? '',
        ));

    $product_recommendable = false;
    $product_monetized = false;

    foreach ( $offers as $offer ) {
      $merchant = sanitize_key($offer['merchant'] ?? '');
      if ( ! $merchant ) { continue; }

      $availability = (string) ($offer['availability'] ?? $product['availability'] ?? '');
      $active = ! in_array($availability, array('discontinued','unavailable'), true);
      $recommendable = in_array($availability, array('in_stock','usually_in_stock'), true);

      $exact_key = ($product['id'] ?? '') . '@' . $merchant;
      $legacy_key = $product['id'] ?? '';
      $mapped = isset($product_map[$exact_key]) || (
        ($product['merchant'] ?? '') === $merchant && isset($product_map[$legacy_key])
      ) || isset($bases[$merchant]);

      if ( $active ) {
        $active_offers++;
        if ( $mapped ) {
          $monetized_active_offers++;
          $monetized_merchants[$merchant] = true;
        }
      }

      if ( $recommendable ) {
        $recommendable_offers++;
        $product_recommendable = true;
        if ( $mapped ) {
          $monetized_recommendable_offers++;
          $product_monetized = true;
          $monetized_merchants[$merchant] = true;
        }
      }
    }

    if ( $product_recommendable ) { $recommendable_products++; }
    if ( $product_monetized ) { $monetized_recommendable_products++; }
  }

  return array(
    'active_offers' => $active_offers,
    'monetized_active_offers' => $monetized_active_offers,
    'active_offer_coverage_pct' => $active_offers ? round(($monetized_active_offers / $active_offers) * 100, 1) : 0,
    'recommendable_offers' => $recommendable_offers,
    'monetized_recommendable_offers' => $monetized_recommendable_offers,
    'recommendable_offer_coverage_pct' => $recommendable_offers ? round(($monetized_recommendable_offers / $recommendable_offers) * 100, 1) : 0,
    'recommendable_products' => $recommendable_products,
    'monetized_recommendable_products' => $monetized_recommendable_products,
    'recommendable_product_coverage_pct' => $recommendable_products ? round(($monetized_recommendable_products / $recommendable_products) * 100, 1) : 0,
    'monetized_merchants' => count($monetized_merchants),
  );
}

function solar_expert_lead_coverage($map, $bases) {
  $lead_map = isset($map['leads']) && is_array($map['leads']) ? $map['leads'] : array();
  $bases = is_array($bases) ? $bases : array();
  $targets = array(
    'eon-solar' => 'eon-cz',
    'eon-heat-pump' => 'eon-cz',
  );

  $monetized = 0;
  foreach ( $targets as $lead_id => $merchant_id ) {
    if ( ! empty($lead_map[$lead_id]) || ! empty($bases[$merchant_id]) ) {
      $monetized++;
    }
  }

  $total = count($targets);
  return array(
    'targets' => $total,
    'monetized_targets' => $monetized,
    'coverage_pct' => $total ? round(($monetized / $total) * 100, 1) : 0,
  );
}

function solar_expert_deployed_theme_version() {
  $theme_version = '';
  $style_file = trailingslashit(get_template_directory()) . 'style.css';

  if ( file_exists($style_file) ) {
    $style_headers = get_file_data($style_file, array('Version'=>'Version'), 'theme');
    $theme_version = isset($style_headers['Version']) ? trim((string) $style_headers['Version']) : '';
  }

  if ( ! $theme_version ) {
    $theme_version = (string) wp_get_theme()->get('Version');
  }

  return $theme_version;
}

function solar_expert_managed_indexability_state($manifest) {
  $state = array(
    'targets' => 0,
    'ready' => 0,
    'errors' => 0,
    'issues' => array(),
  );

  $items = isset($manifest['items']) && is_array($manifest['items']) ? $manifest['items'] : array();
  foreach ( $items as $item ) {
    if ( empty($item['indexable']) ) {
      continue;
    }

    $state['targets']++;
    $type = isset($item['type']) && in_array($item['type'], array('page','post'), true) ? $item['type'] : 'page';
    $slug = sanitize_title($item['slug'] ?? '');
    $post = $slug ? get_page_by_path($slug, OBJECT, $type) : null;

    if ( ! $post || $post->post_status !== 'publish' ) {
      $state['errors']++;
      $state['issues'][] = $slug ? $slug . ':not-published' : 'invalid-slug';
      continue;
    }

    $noindex = (string) get_post_meta($post->ID, '_yoast_wpseo_meta-robots-noindex', true);
    $nofollow = (string) get_post_meta($post->ID, '_yoast_wpseo_meta-robots-nofollow', true);

    if ( $noindex !== '2' || $nofollow === '1' ) {
      $state['errors']++;
      $state['issues'][] = $slug . ':robots';
      continue;
    }

    $state['ready']++;
  }

  return $state;
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

  $theme_version = solar_expert_deployed_theme_version();

  $last_sync = get_option('solar_expert_last_content_sync', array());
  $sync_state = solar_expert_content_sync_state();
  $price_freshness = solar_expert_catalog_price_freshness($catalog, 30);
  $affiliate_coverage = solar_expert_affiliate_coverage($catalog, $map, $bases);
  $lead_coverage = solar_expert_lead_coverage($map, $bases);
  $managed_indexability = solar_expert_managed_indexability_state($manifest);

  return array(
    'status' => 'ok',
    'build_marker' => 'dev-rc-' . $theme_version,
    'theme_version' => $theme_version,
    'catalog_schema_version' => (string) ($catalog['schemaVersion'] ?? '0'),
    'catalog_products' => isset($catalog['products']) && is_array($catalog['products']) ? count($catalog['products']) : 0,
    'catalog_price_max_age_days' => (int) ($price_freshness['max_age_days'] ?? 30),
    'catalog_price_snapshots' => (int) ($price_freshness['total'] ?? 0),
    'catalog_price_fresh' => (int) ($price_freshness['fresh'] ?? 0),
    'catalog_price_stale' => (int) ($price_freshness['stale'] ?? 0),
    'catalog_price_verification_unknown' => (int) ($price_freshness['unknown'] ?? 0),
    'manifest_schema_version' => (string) ($manifest['schemaVersion'] ?? '0'),
    'managed_content_items' => isset($manifest['items']) && is_array($manifest['items']) ? count($manifest['items']) : 0,
    'managed_indexability_targets' => (int) ($managed_indexability['targets'] ?? 0),
    'managed_indexability_ready' => (int) ($managed_indexability['ready'] ?? 0),
    'managed_indexability_errors' => (int) ($managed_indexability['errors'] ?? 0),
    'managed_indexability_issues' => isset($managed_indexability['issues']) ? array_values($managed_indexability['issues']) : array(),
    'content_sync_status' => (string) ($sync_state['status'] ?? 'unknown'),
    'content_sync_required' => ! empty($sync_state['required']),
    'content_sync_errors' => (int) ($sync_state['errors'] ?? 0),
    'affiliate_product_mappings' => isset($map['products']) && is_array($map['products']) ? count($map['products']) : 0,
    'affiliate_merchant_bases' => count($bases),
    'affiliate_lead_mappings' => isset($map['leads']) && is_array($map['leads']) ? count($map['leads']) : 0,
    'affiliate_active_offers' => (int) ($affiliate_coverage['active_offers'] ?? 0),
    'affiliate_monetized_active_offers' => (int) ($affiliate_coverage['monetized_active_offers'] ?? 0),
    'affiliate_active_offer_coverage_pct' => (float) ($affiliate_coverage['active_offer_coverage_pct'] ?? 0),
    'affiliate_recommendable_offers' => (int) ($affiliate_coverage['recommendable_offers'] ?? 0),
    'affiliate_monetized_recommendable_offers' => (int) ($affiliate_coverage['monetized_recommendable_offers'] ?? 0),
    'affiliate_recommendable_offer_coverage_pct' => (float) ($affiliate_coverage['recommendable_offer_coverage_pct'] ?? 0),
    'affiliate_recommendable_products' => (int) ($affiliate_coverage['recommendable_products'] ?? 0),
    'affiliate_monetized_recommendable_products' => (int) ($affiliate_coverage['monetized_recommendable_products'] ?? 0),
    'affiliate_recommendable_product_coverage_pct' => (float) ($affiliate_coverage['recommendable_product_coverage_pct'] ?? 0),
    'affiliate_monetized_merchants' => (int) ($affiliate_coverage['monetized_merchants'] ?? 0),
    'affiliate_lead_targets' => (int) ($lead_coverage['targets'] ?? 0),
    'affiliate_monetized_lead_targets' => (int) ($lead_coverage['monetized_targets'] ?? 0),
    'affiliate_lead_coverage_pct' => (float) ($lead_coverage['coverage_pct'] ?? 0),
    'funnel_tracking' => 'first_party_v1',
    'last_content_sync_utc' => isset($last_sync['time']) ? (string) $last_sync['time'] : null,
  );
}

function solar_expert_deploy_sync($request) {
  $expected_version = sanitize_text_field((string) $request->get_param('expected_version'));
  $intent = sanitize_key((string) $request->get_param('intent'));
  $live_version = solar_expert_deployed_theme_version();

  if ( $intent !== 'managed-content-sync-v1' ) {
    return new WP_Error('solar_expert_sync_bad_intent', 'Invalid deploy-sync intent.', array('status'=>400));
  }

  if ( ! $expected_version || ! $live_version || ! hash_equals($live_version, $expected_version) ) {
    return new WP_Error('solar_expert_sync_version_mismatch', 'Deployed theme version does not match the requested release.', array(
      'status' => 409,
      'live_version' => $live_version,
    ));
  }

  $state = solar_expert_content_sync_state();
  if ( empty($state['required']) ) {
    return rest_ensure_response(array(
      'ok' => true,
      'status' => 'current',
      'theme_version' => $live_version,
      'content_sync_required' => false,
      'content_sync_errors' => (int) ($state['errors'] ?? 0),
    ));
  }

  if ( get_transient('solar_expert_content_sync_lock') ) {
    return new WP_Error('solar_expert_sync_busy', 'Managed content sync is already running.', array('status'=>409));
  }

  set_transient('solar_expert_content_sync_lock', 1, 5 * MINUTE_IN_SECONDS);
  try {
    $result = solar_expert_sync_managed_content(false);
  } catch (Throwable $e) {
    delete_transient('solar_expert_content_sync_lock');
    return new WP_Error('solar_expert_sync_failed', 'Managed content sync failed.', array('status'=>500));
  }
  delete_transient('solar_expert_content_sync_lock');

  $after = solar_expert_content_sync_state();
  $ok = empty($after['required']) && ((int) ($after['errors'] ?? 0) === 0);

  return rest_ensure_response(array(
    'ok' => $ok,
    'status' => (string) ($after['status'] ?? 'unknown'),
    'theme_version' => $live_version,
    'content_sync_required' => ! empty($after['required']),
    'content_sync_errors' => (int) ($after['errors'] ?? 0),
    'created' => (int) ($result['created'] ?? 0),
    'updated' => (int) ($result['updated'] ?? 0),
    'skipped' => (int) ($result['skipped'] ?? 0),
  ));
}

function solar_expert_register_health_route() {
  register_rest_route('solar-expert/v1', '/health', array(
    'methods' => 'GET',
    'callback' => function(){ return rest_ensure_response(solar_expert_health_payload()); },
    'permission_callback' => '__return_true',
  ));

  register_rest_route('solar-expert/v1', '/deploy-sync', array(
    'methods' => 'POST',
    'callback' => 'solar_expert_deploy_sync',
    'permission_callback' => '__return_true',
  ));
}
add_action('rest_api_init', 'solar_expert_register_health_route');


function solar_expert_seo_meta($slug_override = '') {
  $map = array(
    'front' => array(
      'title' => 'Solární kalkulačka: panely, baterie a měnič | Solar Expert',
      'description' => 'Spočítejte solární sestavu podle spotřeby. Panely, LiFePO4 baterie, měnič, MPPT a kompatibilní varianty s vysvětlením.'
    ),
    'solarni-sestava-na-chatu' => array(
      'title' => 'Solární sestava na chatu: kalkulačka a výběr | Solar Expert',
      'description' => 'Navrhněte solární sestavu na chatu podle spotřebičů, sezóny a autonomie. Výpočet panelů, baterie, měniče a MPPT.'
    ),
    'vyber-baterii' => array(
      'title' => 'LiFePO4 baterie: kalkulačka a výběr 12/24/48 V | Solar Expert',
      'description' => 'Vyberte LiFePO4 baterii podle systémového napětí, kWh a limitu BMS. Technický výběr pro 12V, 24V a 48V systémy.'
    ),
    'mppt-kalkulacka' => array(
      'title' => 'MPPT kalkulačka: Voc, Vmp a výběr regulátoru | Solar Expert',
      'description' => 'Zkontrolujte MPPT regulátor podle výkonu FV pole, nabíjecího proudu, startovacího Vmp a cold Voc panelového stringu.'
    ),
    'vyber-menice' => array(
      'title' => 'Měnič pro ostrovní systém: výkon a surge | Solar Expert',
      'description' => 'Vyberte měnič podle 12/24/48 V, trvalého výkonu a rozběhové špičky. Oddělená kontrola continuous a surge výkonu.'
    ),
    'quote-checker' => array(
      'title' => 'Kontrola nabídky fotovoltaiky: Quote Checker | Solar Expert',
      'description' => 'Prověřte nabídku fotovoltaiky podle spotřeby, panelů, baterie, měniče, špičkového výkonu a systémového napětí.'
    ),
    'jak-doporucujeme' => array(
      'title' => 'Jak Solar Expert doporučuje produkty | Metodika',
      'description' => 'Jak vzniká technické doporučení Solar Expert: kompatibilita, ověřené parametry, dostupnost a cena. Provize ranking neurčuje.'
    ),
    'affiliate-transparentnost' => array(
      'title' => 'Affiliate transparentnost | Solar Expert',
      'description' => 'Jak Solar Expert používá affiliate odkazy a proč provize neovlivňuje technickou kompatibilitu ani pořadí doporučení.'
    ),
    'rychlost-degradace-je-dulezita-pri-vyberu-solarnich-panelu' => array(
      'title' => 'Degradace solárních panelů: záruka a pokles výkonu | Solar Expert',
      'description' => 'Jak číst degradaci a výkonovou záruku solárního panelu. Co porovnat kromě Wp a proč degradace není jediný parametr.'
    ),
    'kotveni-fotovoltaickych-panelu-na-ploche-strese' => array(
      'title' => 'Fotovoltaika na ploché střeše: kotvení, balast a sklon | Solar Expert',
      'description' => 'Jak řešit panely na ploché střeše: balast nebo kotvení, sklon, rozteč řad, statiku, odvodnění a servisní přístup.'
    ),
    'velikost-rozmery-a-hmotnost-solarnich-panelu' => array(
      'title' => 'Rozměry a hmotnost solárních panelů: praktický návrh | Solar Expert',
      'description' => 'Jak rozměry, hmotnost a Wp solárních panelů ovlivní počet kusů, využití střechy, statiku a návrh MPPT stringu.'
    ),
    'fotovoltaika-vykon-na-m2' => array(
      'title' => 'Výkon fotovoltaiky na m²: Wp/m² a výpočet | Solar Expert',
      'description' => 'Jak spočítat výkon fotovoltaického panelu na m², rozdíl Wp a kWh a kolik plochy potřebujete pro požadovaný výkon.'
    ),
    'fve-panely-na-strechu' => array(
      'title' => 'Fotovoltaické panely na střechu: výkon a návrh | Solar Expert',
      'description' => 'Jak spočítat potřebný výkon FVE na střeše podle spotřeby, plochy, orientace a stínu. Wp, kWp, počet panelů a kontrola stringu a MPPT.'
    ),
    'jak-funguji-solarni-baterie-pruvodce-skladovanim-energie' => array(
      'title' => 'Solární baterie: kWh, BMS a 12/24/48 V | Solar Expert',
      'description' => 'Jak funguje baterie pro fotovoltaiku, co znamená kWh a Ah, jakou roli má BMS a proč musí kapacita, proud i napětí sedět k měniči.'
    ),
    'sady-pro-solarni-napajeni-kompletni-pruvodce' => array(
      'title' => 'Solární sady: panely, baterie, měnič a MPPT | Solar Expert',
      'description' => 'Jak vybrat solární sadu jako kompatibilní celek. Zkontrolujte výkon panelů, baterii, měnič, MPPT, napětí, proudy a rozběhové špičky.'
    ),
    'co-je-1-kwp' => array(
      'title' => 'Co je kWp a Wp: rozdíl proti kWh a příklady | Solar Expert',
      'description' => 'Co znamená Wp a kWp u fotovoltaiky, jak se liší od kWh a jak převést požadovaný kWp na počet solárních panelů.'
    ),
    'jak-zapojit-solarni-panely' => array(
      'title' => 'Jak zapojit solární panely: série, paralelně a MPPT | Solar Expert',
      'description' => 'Sériové a paralelní zapojení solárních panelů, co se sčítá, jak hlídat Voc, Vmp a proud a jak ověřit string proti MPPT.'
    ),
    'kolik-panelu-je-potreba-na-jeden-string' => array(
      'title' => 'Kolik panelů na jeden string? Voc, Vmp a MPPT | Solar Expert',
      'description' => 'Jak určit minimální a maximální počet panelů v jednom stringu podle Vmp, cold Voc a pracovního okna MPPT regulátoru.'
    ),
    'fotovoltaika-na-eternitovou-strechu' => array(
      'title' => 'Fotovoltaika na eternitovou střechu: co ověřit | Solar Expert',
      'description' => 'Co zkontrolovat před montáží FVE na starší eternitovou nebo vláknocementovou střechu: azbest, statiku, kotvení, stav krytiny a string.'
    ),
    'fotovoltaika-na-pozemku' => array(
      'title' => 'Fotovoltaika na pozemku: konstrukce, povolení a návrh | Solar Expert',
      'description' => 'Jak navrhnout pozemní FVE: místo, sklon, konstrukce, stínění, kabeláž, MPPT a co ověřit u povolení na konkrétní parcele.'
    ),
    'kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem' => array(
      'title' => 'Kolik stojí fotovoltaika s tepelným čerpadlem 2026 | Solar Expert',
      'description' => 'Aktuální orientační ceny FVE s baterií a tepelného čerpadla, jak správně dimenzovat kombinaci a co porovnat v nabídce.'
    ),
    'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda' => array(
      'title' => 'Tepelné čerpadlo u souseda: vzdálenost, hluk a pravidla 2026 | Solar Expert',
      'description' => 'Jak umístit venkovní jednotku tepelného čerpadla vůči hranici pozemku a sousedovi. Hluk, povolení a praktické chyby.'
    ),
    'prumerna-spotreba-tepelneho-cerpadla' => array(
      'title' => 'Spotřeba tepelného čerpadla: kWh za den a rok | Solar Expert',
      'description' => 'Jak odhadnout spotřebu tepelného čerpadla z potřeby tepla a SCOP. Příklady kWh za den a rok, TUV, elektrokotel, mráz a FVE.'
    ),
    'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji' => array(
      'title' => 'Tepelné čerpadlo vzduch–voda: jak funguje a výběr 2026 | Solar Expert',
      'description' => 'Jak funguje tepelné čerpadlo vzduch–voda, jak ho dimenzovat, co znamená COP/SCOP, radiátory vs. podlahovka, mráz, hlučnost a cena celé instalace.'
    ),
    'cop-tepelneho-cerpadla-se-zdrojem-vzduchu-vysvetleni-zdroj-tepelneho-cerpadla' => array(
      'title' => 'COP a SCOP tepelného čerpadla: účinnost prakticky | Solar Expert',
      'description' => 'Co znamená COP, SCOP, A7/W35 a A−7/W55. Jak porovnat účinnost tepelných čerpadel a proč jeden katalogový COP neříká roční spotřebu.'
    ),
    'jak-funguje-tepelne-cerpadlo' => array(
      'title' => 'Jak funguje tepelné čerpadlo: princip krok za krokem | Solar Expert',
      'description' => 'Výparník, kompresor, kondenzátor a expanzní ventil. Jak tepelné čerpadlo přesouvá teplo, proč funguje i v zimě a co znamená COP.'
    ),
    'jak-dlouho-vydrzi-tepelna-cerpadla' => array(
      'title' => 'Životnost tepelného čerpadla: 15–20+ let? | Solar Expert',
      'description' => 'Jak dlouho vydrží tepelné čerpadlo, co zkracuje životnost kompresoru, proč vadí krátké cyklování a kdy dává smysl oprava nebo výměna.'
    ),
    'solarni-panel-definice-a-fakta' => array(
      'title' => 'Jak funguje solární panel: fotovoltaický efekt a Wp | Solar Expert',
      'description' => 'Jak fotovoltaický panel mění světlo na stejnosměrnou elektřinu, co dělá článek, MPPT a střídač a proč reálný výkon není totéž co Wp.'
    ),
    'vysvetleni-solarnich-panelu-pv-t' => array(
      'title' => 'PVT panely: elektřina a teplo v jednom kolektoru | Solar Expert',
      'description' => 'Jak fungují hybridní PVT panely, rozdíl proti běžné FVE a solární termice, výhody, nevýhody a kdy dává PVT smysl.'
    ),
    'vykon-solarnich-panelu-v-zime-ma-smysl-odmetat-snih' => array(
      'title' => 'Fotovoltaika v zimě: výkon, sníh a sklon panelů | Solar Expert',
      'description' => 'Jak funguje fotovoltaika v zimě, proč chlad panelům nevadí, co udělá sníh, kdy ho neodmetat a jak odhadnout zimní výrobu přes PVGIS.'
    ),
    'jak-vybrat-solarni-panely-pro-vas-domov' => array(
      'title' => 'Jak vybrat solární panely 2026: výkon, záruky a testy | Solar Expert',
      'description' => 'Jak vybrat fotovoltaické panely podle Wp, Voc, teplotního koeficientu, záruk, IEC testů a nezávislých reliability dat. Ne jen podle značky.'
    ),
    'realny-vykon-solarnich-panelu' => array(
      'title' => 'Reálný výkon solárních panelů: Wp vs. výkon na střeše | Solar Expert',
      'description' => 'Proč panel 450 Wp běžně nevyrábí 450 W. STC, ozáření, teplota článku, stín, MPPT, clipping a systémové ztráty vysvětlené prakticky.'
    ),
    'minimalni-a-maximalni-teploty-tepelneho-cerpadla' => array(
      'title' => 'Tepelné čerpadlo v mrazu: minimum a max. teplota vody | Solar Expert',
      'description' => 'Do jaké teploty funguje tepelné čerpadlo, kolik výkonu má v mrazu a jak číst maximální teplotu vody, COP a bivalentní bod.'
    ),
    'kovove-stresni-krytiny-nejlepsi-volba-pro-solarni-panely' => array(
      'title' => 'Fotovoltaika na plechové střeše: kotvení bez zatékání | Solar Expert',
      'description' => 'Jak kotvit FVE na falc, trapézový plech a plechovou tašku. Prostupy, EPDM, statika, vítr, sníh, koroze a co požadovat v nabídce.'
    ),
    'pridani-dalsich-solarnich-panelu-ke-stavajicimu-solarnimu-systemu' => array(
      'title' => 'Jak přidat panely ke stávající FVE: MPPT a stringy | Solar Expert',
      'description' => 'Rozšíření stávající FVE krok za krokem: cold Voc, Vmp, proudové limity MPPT, stejné vs. jiné panely, střídač, baterie a podmínky distributora.'
    ),
    'flexibilni-solarni-panely-vyhody-nevyhody-a-naklady' => array(
      'title' => 'Flexibilní solární panely 2026: kdy ano a kdy ne | Solar Expert',
      'description' => 'Flexibilní solární panely pro karavan, loď i lehkou střechu: výhody, rizika, ETFE, chlazení, životnost, Voc/Vmp a správný výběr MPPT.'
    ),
    'monokrystalicke-vs-polykrystalicke-solarni-panely' => array(
      'title' => 'Monokrystalické vs. polykrystalické panely 2026 | Solar Expert',
      'description' => 'Mono vs. poly v roce 2026: proč dnes rozhodují účinnost na m², TOPCon/N-type, teplotní koeficient, Voc/Vmp a záruky víc než staré dělení panelů.'
    ),
    'castecne-zastineni-a-solarni-panely' => array(
      'title' => 'Zastínění solárních panelů: výkon, bypass diody a MPPT | Solar Expert',
      'description' => 'Jak částečné zastínění ovlivní výkon fotovoltaických panelů a stringu, kdy pomůže MPPT nebo optimizér a co ověřit v návrhu.'
    ),
    'nataceni-solarnich-panelu-za-sluncem' => array(
      'title' => 'Natáčení solárních panelů za sluncem: vyplatí se? | Solar Expert',
      'description' => 'Kdy natáčení solárních panelů za sluncem zvýší výrobu, kdy tracker nedává ekonomický smysl a co porovnat proti pevné konstrukci.'
    ),
    'polohovani-solarnich-panelu' => array(
      'title' => 'Polohování solárních panelů: směr a sklon | Solar Expert',
      'description' => 'Jak nastavit azimut a sklon fotovoltaických panelů, jih vs. východ–západ, stín a jak porovnat skutečnou střechu s optimem v PVGIS.'
    ),
    'vse-o-solarnich-panelech-a-fotovoltaice' => array(
      'title' => 'Vše o fotovoltaice: panely, baterie a návrh FVE | Solar Expert',
      'description' => 'Praktický rozcestník fotovoltaikou: kWp, výroba, poloha panelů, stringy, MPPT, střídač, baterie, střecha, údržba a kontrola nabídky.'
    ),
    'kolik-vyrobi-fotovoltaika-za-hodinu' => array(
      'title' => 'Kolik vyrobí fotovoltaika za hodinu? kW vs. kWh | Solar Expert',
      'description' => 'Kolik energie vyrobí 1, 5 nebo 10 kWp fotovoltaika za hodinu, rozdíl kW a kWh a proč se skutečný výkon během dne mění.'
    ),
    'kolik-vyrobi-fotovoltaika-za-rok' => array(
      'title' => 'Kolik vyrobí fotovoltaika za rok? kWp → kWh | Solar Expert',
      'description' => 'Jak spočítat roční výrobu FVE podle kWp a lokalitního výnosu z PVGIS. Příklady pro 1, 5 a 10 kWp a hlavní ztráty.'
    ),
    'cisteni-solarnich-panelu-proc-kdy-jak' => array(
      'title' => 'Čištění solárních panelů: jak často, čím a bezpečně | Solar Expert',
      'description' => 'Kdy čistit fotovoltaické panely, čemu se vyhnout, jak bezpečně odstranit prach a ptačí trus a kdy je lepší profesionální servis.'
    ),
    'recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady' => array(
      'title' => 'Samsung tepelné čerpadlo recenze 2026: EHS R290 | Solar Expert',
      'description' => 'Technická recenze Samsung EHS 2026: R290 Mono, hlučnost, COP, teplota vody, výhody, nevýhody a co ověřit před nákupem.'
    ),
    'tepelna-cerpadla-lg-vyhody-nevyhody-ceny' => array(
      'title' => 'LG tepelné čerpadlo recenze 2026: THERMA V R290 | Solar Expert',
      'description' => 'Nezávislá recenze LG THERMA V 2026: R290, hlučnost, SCOP, 75 °C, zkušenosti se staršími modely, výhody, rizika a co ověřit před koupí.'
    ),
    'tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti' => array(
      'title' => 'Mitsubishi Ecodan Ultra Quiet: hlučnost a výběr | Solar Expert',
      'description' => 'Mitsubishi Ecodan Ultra Quiet a současná řada Ecodan: hlučnost, výkon v chladu, vysoká teplota vody a co ověřit před výběrem.'
    ),
    'navratnost-fotovoltaicke-elektrarny-v-bytovem-dome' => array(
      'title' => 'Fotovoltaika pro bytový dům 2026: návratnost a sdílení | Solar Expert',
      'description' => 'Jak spočítat návratnost FVE v bytovém domě po zavedení sdílení přes EDC. Spotřeba, alokační klíč, baterie, přetoky a NZÚ 2026.'
    ),
    'tepelne-cerpadla-lg-vyhody-nevyhody-ceny' => array(
      'title' => 'LG tepelné čerpadlo recenze 2026: THERMA V R290 | Solar Expert',
      'description' => 'Technická recenze LG THERMA V 2026: R290 Monobloc, výkon v mrazu, hlučnost, teplota vody, výhody a nevýhody.'
    ),
    'recenze-tepelneho-cerpadla-viessman-klady-zapory-a-naklady' => array(
      'title' => 'Viessmann tepelné čerpadlo recenze 2026: Vitocal 250-A | Solar Expert',
      'description' => 'Technická recenze Viessmann Vitocal 250-A 2026: R290, výkon, hlučnost, teplota vody, výhody, nevýhody a modernizace.'
    ),
    'prehled-vzduchovych-tepelnych-cerpadel-daikin' => array(
      'title' => 'Daikin tepelné čerpadlo recenze 2026: Altherma 4 H | Solar Expert',
      'description' => 'Daikin Altherma 4 H a 3 R MT v roce 2026: R290 vs. R32, teplota vody, provoz v mrazu, výběr pro radiátory a co hlídat v nabídce.'
    ),
    'tepelne-cerpadlo-nebo-elektrokotel' => array(
      'title' => 'Tepelné čerpadlo vs. elektrokotel: spotřeba a náklady | Solar Expert',
      'description' => 'Tepelné čerpadlo nebo elektrokotel? Porovnání investice, roční spotřeby, radiátorů, podlahovky a kombinace s fotovoltaikou.'
    ),
    'nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu' => array(
      'title' => 'Nejlepší tepelná čerpadla 2026: podle použití, ne Top 10 | Solar Expert',
      'description' => 'Jak vybrat nejlepší tepelné čerpadlo vzduch–voda 2026. Současné R290 řady, hlučnost, radiátory, SCOP, servis a spolehlivost.'
    ),
    'proc-se-solarni-panely-neprehrivaji' => array(
      'title' => 'Přehřívání solárních panelů: teplota, výkon a chlazení | Solar Expert',
      'description' => 'Jak vysoká teplota ovlivňuje výkon fotovoltaických panelů, proč se panely běžně nepoškodí přehřátím a kdy řešit chlazení.'
    ),
    'chlazeni-fotovoltaickych-panelu' => array(
      'title' => 'Chlazení fotovoltaických panelů: kdy dává smysl | Solar Expert',
      'description' => 'Pasivní, aktivní a vodní chlazení fotovoltaických panelů. Kdy zvýšení výkonu stojí za ventilátory, vodu nebo PVT a kdy je lepší jen správná montáž.'
    ),
  );

  if ( $slug_override && isset($map[$slug_override]) ) {
    return $map[$slug_override];
  }

  if ( is_front_page() ) {
    return $map['front'];
  }

  if ( is_category('baterie') ) {
    return array(
      'title' => 'Solární baterie: výběr, kapacita a LiFePO4 | Solar Expert',
      'description' => 'Průvodce solárními bateriemi: 12/24/48 V, kWh, Ah, LiFePO4, BMS a kompatibilita s měničem. Články + Battery Selector.'
    );
  }

  if ( is_singular(array('page','post')) ) {
    $post = get_queried_object();
    if ( $post && isset($map[$post->post_name]) ) {
      return $map[$post->post_name];
    }
  }

  return null;
}

function solar_expert_document_title($title) {
  $meta = solar_expert_seo_meta();
  return $meta && ! empty($meta['title']) ? $meta['title'] : $title;
}
add_filter('pre_get_document_title', 'solar_expert_document_title', 20);

function solar_expert_wpseo_title($title) {
  $meta = solar_expert_seo_meta();
  return $meta && ! empty($meta['title']) ? $meta['title'] : $title;
}
add_filter('wpseo_title', 'solar_expert_wpseo_title', 20);

function solar_expert_wpseo_metadesc($description) {
  $meta = solar_expert_seo_meta();
  return $meta && ! empty($meta['description']) ? $meta['description'] : $description;
}
add_filter('wpseo_metadesc', 'solar_expert_wpseo_metadesc', 20);

function solar_expert_meta_description() {
  if ( defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('AIOSEO_VERSION') ) {
    return;
  }
  $meta = solar_expert_seo_meta();
  if ( $meta && ! empty($meta['description']) ) {
    echo '<meta name="description" content="' . esc_attr($meta['description']) . '">' . "\n";
  }
}
add_action('wp_head', 'solar_expert_meta_description', 1);

function solar_expert_heat_pump_lead_slugs() {
  return array(
    'prumerna-spotreba-tepelneho-cerpadla',
    'cop-tepelneho-cerpadla-se-zdrojem-vzduchu-vysvetleni-zdroj-tepelneho-cerpadla',
    'recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady',
    'nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu',
    'recenze-tepelneho-cerpadla-viessman-klady-zapory-a-naklady',
    'prehled-vzduchovych-tepelnych-cerpadel-daikin',
    'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji',
    'jak-funguje-tepelne-cerpadlo',
    'jak-dlouho-vydrzi-tepelna-cerpadla',
    'minimalni-a-maximalni-teploty-tepelneho-cerpadla',
    'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda',
    'tepelne-cerpadlo-nebo-elektrokotel',
    'tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti',
    'tepelne-cerpadla-lg-vyhody-nevyhody-ceny'
  );
}

function solar_expert_append_heat_pump_related_links($content) {
  if ( is_admin() || ! is_singular('post') || ! in_the_loop() || ! is_main_query() ) {
    return $content;
  }

  $post = get_queried_object();
  $slug = $post && ! empty($post->post_name) ? $post->post_name : '';
  if ( ! $slug || ! in_array($slug, solar_expert_heat_pump_lead_slugs(), true) ) {
    return $content;
  }

  if ( strpos($content, 'data-se-related="heat-pump-cluster"') !== false ) {
    return $content;
  }

  $guides = array(
    'nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu' => array(
      'label' => 'Nejlepší tepelná čerpadla 2026',
      'url' => home_url('/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/'),
    ),
    'prumerna-spotreba-tepelneho-cerpadla' => array(
      'label' => 'Spotřeba tepelného čerpadla',
      'url' => home_url('/prumerna-spotreba-tepelneho-cerpadla/'),
    ),
    'kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem' => array(
      'label' => 'FVE + tepelné čerpadlo',
      'url' => home_url('/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/'),
    ),
  );

  $links = array();
  foreach ( $guides as $guide_slug => $guide ) {
    if ( $guide_slug === $slug ) {
      continue;
    }
    $links[] = '<a href="' . esc_url($guide['url']) . '">' . esc_html($guide['label']) . '</a>';
  }

  if ( empty($links) ) {
    return $content;
  }

  $related = '<aside class="se-note se-related-guides" data-se-related="heat-pump-cluster">'
    . '<strong>Související průvodci:</strong> '
    . implode(' · ', $links)
    . '</aside>';

  return $content . $related;
}
add_filter('the_content', 'solar_expert_append_heat_pump_related_links', 24);

function solar_expert_append_heat_pump_lead_cta($content) {
  if ( is_admin() || ! is_singular('post') || ! in_the_loop() || ! is_main_query() ) {
    return $content;
  }

  $post = get_queried_object();
  $slug = $post && ! empty($post->post_name) ? $post->post_name : '';
  if ( ! $slug || ! in_array($slug, solar_expert_heat_pump_lead_slugs(), true) ) {
    return $content;
  }

  if ( strpos($content, 'data-se-lead-id="eon-heat-pump"') !== false ) {
    return $content;
  }

  $fallback = 'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/';
  $combo_url = home_url('/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/');
  $cta = '<aside class="se-note se-lead-cta">'
    . '<strong>Řešíte nové tepelné čerpadlo?</strong> '
    . 'Nejdřív si můžete projít náš <a href="' . esc_url($combo_url) . '">cenový a sizing průvodce FVE + tepelné čerpadlo</a>. '
    . 'Potom si nechte připravit nezávaznou nabídku od E.ON a porovnejte ji s dalšími variantami pro svůj dům.'
    . '<p><a class="se-btn se-btn-primary" href="' . esc_url($fallback) . '" '
    . 'data-se-lead-id="eon-heat-pump" data-se-placement="heat_pump_legacy_article" '
    . 'data-se-fallback="' . esc_attr($fallback) . '" rel="nofollow noopener">Nezávazně poptat tepelné čerpadlo →</a></p>'
    . '<small>Partnerský odkaz může Solar Expertu přinést provizi. Technický obsah článku ani pořadí doporučení tím není ovlivněno.</small>'
    . '</aside>';

  return $content . $cta;
}
add_filter('the_content', 'solar_expert_append_heat_pump_lead_cta', 25);

function solar_expert_solar_lead_slugs() {
  return array(
    'fve-panely-na-strechu',
    'fotovoltaika-na-eternitovou-strechu',
    'kotveni-fotovoltaickych-panelu-na-ploche-strese',
    'velikost-rozmery-a-hmotnost-solarnich-panelu',
    'fotovoltaika-vykon-na-m2',
    'kolik-vyrobi-fotovoltaika-za-rok',
    'fotovoltaika-na-pozemku',
    'polohovani-solarnich-panelu',
    'vse-o-solarnich-panelech-a-fotovoltaice',
    'jak-vybrat-solarni-panely-pro-vas-domov',
    'kovove-stresni-krytiny-nejlepsi-volba-pro-solarni-panely',
  );
}

function solar_expert_append_solar_related_links($content) {
  if ( is_admin() || ! is_singular('post') || ! in_the_loop() || ! is_main_query() ) {
    return $content;
  }

  $post = get_queried_object();
  $slug = $post && ! empty($post->post_name) ? $post->post_name : '';
  if ( ! $slug || ! in_array($slug, solar_expert_solar_lead_slugs(), true) ) {
    return $content;
  }

  if ( strpos($content, 'data-se-related="solar-cluster"') !== false ) {
    return $content;
  }

  $guides = array(
    'fotovoltaika-vykon-na-m2' => array(
      'label' => 'Výkon fotovoltaiky na m²',
      'url' => home_url('/fotovoltaika-vykon-na-m2/'),
    ),
    'co-je-1-kwp' => array(
      'label' => 'Co je kWp a Wp',
      'url' => home_url('/co-je-1-kwp/'),
    ),
    'kolik-vyrobi-fotovoltaika-za-rok' => array(
      'label' => 'Roční výroba FVE',
      'url' => home_url('/kolik-vyrobi-fotovoltaika-za-rok/'),
    ),
    'quote-checker' => array(
      'label' => 'Quote Checker',
      'url' => home_url('/quote-checker/'),
    ),
  );

  $links = array();
  foreach ( $guides as $guide_slug => $guide ) {
    if ( $guide_slug === $slug ) {
      continue;
    }
    $links[] = '<a href="' . esc_url($guide['url']) . '">' . esc_html($guide['label']) . '</a>';
  }

  if ( empty($links) ) {
    return $content;
  }

  $related = '<aside class="se-note se-related-guides" data-se-related="solar-cluster">'
    . '<strong>Související průvodci:</strong> '
    . implode(' · ', $links)
    . '</aside>';

  return $content . $related;
}
add_filter('the_content', 'solar_expert_append_solar_related_links', 24);

function solar_expert_append_solar_lead_cta($content) {
  if ( is_admin() || ! is_singular('post') || ! in_the_loop() || ! is_main_query() ) {
    return $content;
  }

  $post = get_queried_object();
  $slug = $post && ! empty($post->post_name) ? $post->post_name : '';
  if ( ! $slug || ! in_array($slug, solar_expert_solar_lead_slugs(), true) ) {
    return $content;
  }

  if ( strpos($content, 'data-se-lead-id="eon-solar"') !== false ) {
    return $content;
  }

  $fallback = 'https://www.eon.cz/domacnosti/usporne-technologie/solar/';
  $quote_url = home_url('/quote-checker/');
  $cta = '<aside class="se-note se-lead-cta">'
    . '<strong>Chcete porovnat vlastní návrh s nabídkou na klíč?</strong> '
    . 'Nejdřív si nabídku projděte v našem <a href="' . esc_url($quote_url) . '">Quote Checkeru</a>. '
    . 'Pak si můžete nechat připravit druhou nezávaznou nabídku od E.ON a porovnat výkon, baterii i cenu.'
    . '<p><a class="se-btn" href="' . esc_url($quote_url) . '">Prověřit nabídku →</a> '
    . '<a class="se-btn se-btn-primary" href="' . esc_url($fallback) . '" '
    . 'data-se-lead-id="eon-solar" data-se-placement="solar_legacy_article" '
    . 'data-se-fallback="' . esc_attr($fallback) . '" rel="nofollow noopener">Získat druhou nabídku FVE →</a></p>'
    . '<small>Partnerský odkaz může Solar Expertu přinést provizi. Technický obsah článku ani pořadí doporučení tím není ovlivněno.</small>'
    . '</aside>';

  return $content . $cta;
}
add_filter('the_content', 'solar_expert_append_solar_lead_cta', 26);


function solar_expert_legacy_redirects() {
  if ( ! is_singular('post') ) {
    return;
  }

  $post = get_queried_object();
  if ( ! $post || empty($post->post_name) ) {
    return;
  }

  $redirects = array(
    'veda-o-ztrate-ucinnosti-solarnich-panelu-v-prubehu-casu' => 'rychlost-degradace-je-dulezita-pri-vyberu-solarnich-panelu',
    'jak-funguji-solarni-panely-na-plochych-strechach' => 'kotveni-fotovoltaickych-panelu-na-ploche-strese',
    'mohou-solarni-panely-pohanet-vzduchove-tepelne-cerpadlo' => 'kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem',
    'kotveni-fotovoltaickych-panelu-na-ploche-strese-2' => 'kotveni-fotovoltaickych-panelu-na-ploche-strese',
    'jak-vycistit-solarni-panely-pruvodce-cistenim-solaru' => 'cisteni-solarnich-panelu-proc-kdy-jak',
    'kompletni-pruvodce-velikosti-solarnich-panelu' => 'velikost-rozmery-a-hmotnost-solarnich-panelu',
    'spotreba-tepelneho-cerpadla-v-kwh' => 'prumerna-spotreba-tepelneho-cerpadla',
    'co-dela-fotovoltaika-kdyz-je-zima' => 'vykon-solarnich-panelu-v-zime-ma-smysl-odmetat-snih',
    'recenze-solarnich-panelu-nezavisle-informace-o-solarni-energii' => 'jak-vybrat-solarni-panely-pro-vas-domov',
    'ucinnost-tepelneho-cerpadla-se-zdrojem-vzduchu' => 'cop-tepelneho-cerpadla-se-zdrojem-vzduchu-vysvetleni-zdroj-tepelneho-cerpadla',
    'tepelna-cerpadla-vzduch-vzduch-vs-vzduch-voda' => 'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji',
  );

  if ( isset($redirects[$post->post_name]) ) {
    wp_safe_redirect(home_url('/' . $redirects[$post->post_name] . '/'), 301);
    exit;
  }
}
add_action('template_redirect', 'solar_expert_legacy_redirects', 1);


function solar_expert_schema_graph() {
  if ( defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('AIOSEO_VERSION') ) {
    return;
  }

  $home = home_url('/');
  $graph = array(
    array(
      '@type' => 'WebSite',
      '@id' => $home . '#website',
      'url' => $home,
      'name' => 'Solar Expert',
      'inLanguage' => 'cs-CZ',
      'publisher' => array('@id' => $home . '#organization'),
    ),
    array(
      '@type' => 'Organization',
      '@id' => $home . '#organization',
      'name' => 'Solar Expert',
      'url' => $home,
    ),
  );

  if ( is_front_page() ) {
    $graph[] = array(
      '@type' => 'WebPage',
      '@id' => $home . '#webpage',
      'url' => $home,
      'name' => wp_get_document_title(),
      'isPartOf' => array('@id' => $home . '#website'),
      'about' => array('@id' => $home . '#organization'),
      'inLanguage' => 'cs-CZ',
    );
  }

  if ( is_category() ) {
    $term = get_queried_object();
    $url = $term ? get_term_link($term) : '';
    if ( $term && ! is_wp_error($url) ) {
      $meta = solar_expert_seo_meta();
      $breadcrumb_id = $url . '#breadcrumb';
      $graph[] = array(
        '@type' => 'BreadcrumbList',
        '@id' => $breadcrumb_id,
        'itemListElement' => array(
          array(
            '@type' => 'ListItem',
            'position' => 1,
            'name' => 'Solar Expert',
            'item' => $home,
          ),
          array(
            '@type' => 'ListItem',
            'position' => 2,
            'name' => single_cat_title('', false),
            'item' => $url,
          ),
        ),
      );
      $collection = array(
        '@type' => 'CollectionPage',
        '@id' => $url . '#collection',
        'url' => $url,
        'name' => wp_get_document_title(),
        'isPartOf' => array('@id' => $home . '#website'),
        'breadcrumb' => array('@id' => $breadcrumb_id),
        'inLanguage' => 'cs-CZ',
      );
      if ( is_array($meta) && ! empty($meta['description']) ) {
        $collection['description'] = $meta['description'];
      }
      $graph[] = $collection;
    }
  }

  if ( is_singular(array('page','post')) ) {
    $post = get_queried_object();
    if ( $post instanceof WP_Post ) {
      $url = get_permalink($post);
      $title = get_the_title($post);
      $description = '';
      $meta = solar_expert_seo_meta();
      if ( is_array($meta) && ! empty($meta['description']) ) {
        $description = $meta['description'];
      } else {
        $description = wp_strip_all_tags(get_the_excerpt($post));
      }

      $breadcrumb_id = $url . '#breadcrumb';
      $graph[] = array(
        '@type' => 'BreadcrumbList',
        '@id' => $breadcrumb_id,
        'itemListElement' => array(
          array(
            '@type' => 'ListItem',
            'position' => 1,
            'name' => 'Solar Expert',
            'item' => $home,
          ),
          array(
            '@type' => 'ListItem',
            'position' => 2,
            'name' => $title,
            'item' => $url,
          ),
        ),
      );

      if ( $post->post_type === 'page' && in_array($post->post_name, array(
        'solarni-sestava-na-chatu',
        'vyber-baterii',
        'mppt-kalkulacka',
        'vyber-menice',
        'quote-checker',
      ), true) ) {
        $category = array(
          'solarni-sestava-na-chatu' => 'Solar system sizing calculator',
          'vyber-baterii' => 'Battery sizing calculator',
          'mppt-kalkulacka' => 'MPPT sizing calculator',
          'vyber-menice' => 'Inverter sizing calculator',
          'quote-checker' => 'Solar quote checker',
        );
        $graph[] = array(
          '@type' => 'WebApplication',
          '@id' => $url . '#app',
          'name' => $title,
          'url' => $url,
          'description' => $description,
          'applicationCategory' => 'UtilitiesApplication',
          'operatingSystem' => 'Web',
          'browserRequirements' => 'Requires JavaScript',
          'isAccessibleForFree' => true,
          'featureList' => $category[$post->post_name] ?? 'Solar decision tool',
          'isPartOf' => array('@id' => $home . '#website'),
          'breadcrumb' => array('@id' => $breadcrumb_id),
          'inLanguage' => 'cs-CZ',
        );
      } elseif ( $post->post_type === 'post' ) {
        $article = array(
          '@type' => 'Article',
          '@id' => $url . '#article',
          'headline' => $title,
          'url' => $url,
          'mainEntityOfPage' => $url,
          'datePublished' => get_the_date(DATE_W3C, $post),
          'dateModified' => get_the_modified_date(DATE_W3C, $post),
          'author' => array('@id' => $home . '#organization'),
          'publisher' => array('@id' => $home . '#organization'),
          'isPartOf' => array('@id' => $home . '#website'),
          'breadcrumb' => array('@id' => $breadcrumb_id),
          'inLanguage' => 'cs-CZ',
        );
        if ( $description ) {
          $article['description'] = $description;
        }
        $image = get_the_post_thumbnail_url($post, 'full');
        if ( $image ) {
          $article['image'] = array($image);
        }
        $graph[] = $article;
      }
    }
  }

  $payload = array(
    '@context' => 'https://schema.org',
    '@graph' => $graph,
  );
  echo '<script type="application/ld+json">' . wp_json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
}
add_action('wp_head', 'solar_expert_schema_graph', 30);


function solar_expert_remove_matching_hook_callbacks($tag, $matcher) {
  global $wp_filter;

  if ( empty($wp_filter[$tag]) || ! ($wp_filter[$tag] instanceof WP_Hook) ) {
    return 0;
  }

  $removed = 0;
  $callbacks = $wp_filter[$tag]->callbacks;

  foreach ( $callbacks as $priority => $items ) {
    foreach ( $items as $item ) {
      $function = $item['function'] ?? null;
      if ( ! $function || ! call_user_func($matcher, $function) ) {
        continue;
      }

      remove_filter($tag, $function, $priority);
      $removed++;
    }
  }

  return $removed;
}

function solar_expert_quarantine_legacy_frontend_plugins() {
  if ( is_admin() ) {
    return;
  }

  // Legacy Ninja Popups output causes stale marketing UI and PHP warnings on PHP 8.
  if ( function_exists('snp_footer') ) {
    remove_action('wp_footer', 'snp_footer', 10);
  }

  // Old Simple Author Box was attached to imported content and does not represent
  // the editorial identity of Solar Expert 2.0.
  solar_expert_remove_matching_hook_callbacks('the_content', function($callback) {
    if ( is_string($callback) ) {
      return $callback === 'wpsabox_author_box';
    }
    if ( is_array($callback) && isset($callback[1]) ) {
      return in_array((string) $callback[1], array('wpsabox_author_box','append_author_box'), true);
    }
    return false;
  });

  // Legacy automated link building mutates managed editorial HTML after sync.
  // Solar Expert 2.0 owns internal and external link decisions explicitly.
  solar_expert_remove_matching_hook_callbacks('the_content', function($callback) {
    if ( ! is_array($callback) || ! isset($callback[0], $callback[1]) || ! is_object($callback[0]) ) {
      return false;
    }

    return get_class($callback[0]) === 'SeoAutomatedLinkBuilding\\Plugin'
      && (string) $callback[1] === 'changeContent';
  });

  solar_expert_remove_matching_hook_callbacks('wp_enqueue_scripts', function($callback) {
    if ( ! is_array($callback) || ! isset($callback[0], $callback[1]) || ! is_object($callback[0]) ) {
      return false;
    }

    return get_class($callback[0]) === 'SeoAutomatedLinkBuilding\\Plugin'
      && (string) $callback[1] === 'enqueueScripts';
  });

  // MyThemeShop Notification Bar registers object callbacks, so remove only the
  // two known frontend render methods on its shared object.
  solar_expert_remove_matching_hook_callbacks('wp_footer', function($callback) {
    if ( ! is_array($callback) || ! isset($callback[0], $callback[1]) || ! is_object($callback[0]) ) {
      return false;
    }

    $class = get_class($callback[0]);
    $method = (string) $callback[1];

    return $class === 'MTSNB_Shared'
      && in_array($method, array('display_bar','display_hidden_bars'), true);
  });

  // Remove Simple Author Box inline style hooks as well as its content injection.
  foreach ( array('wp_head','wp_footer') as $tag ) {
    solar_expert_remove_matching_hook_callbacks($tag, function($callback) {
      if ( ! is_array($callback) || ! isset($callback[0], $callback[1]) || ! is_object($callback[0]) ) {
        return false;
      }

      return strpos(get_class($callback[0]), 'Simple_Author_Box') !== false
        && (string) $callback[1] === 'inline_style';
    });
  }

  solar_expert_remove_matching_hook_callbacks('wp_enqueue_scripts', function($callback) {
    if ( ! is_array($callback) || ! isset($callback[0], $callback[1]) || ! is_object($callback[0]) ) {
      return false;
    }

    return strpos(get_class($callback[0]), 'Simple_Author_Box') !== false
      && in_array((string) $callback[1], array('saboxplugin_author_box_style','sab_load_scripts'), true);
  });
}
add_action('wp', 'solar_expert_quarantine_legacy_frontend_plugins', PHP_INT_MAX);

function solar_expert_dequeue_legacy_frontend_assets() {
  if ( is_admin() ) {
    return;
  }

  $legacy_paths = array(
    '/plugins/mts-wp-notification-bar/',
    '/plugins/arscode-ninja-popups/',
    '/plugins/simple-author-box/',
    '/plugins/seo-automated-link-building/',
  );

  global $wp_scripts, $wp_styles;

  if ( $wp_scripts instanceof WP_Scripts ) {
    foreach ( (array) $wp_scripts->queue as $handle ) {
      $registered = $wp_scripts->registered[$handle] ?? null;
      $src = $registered ? (string) $registered->src : '';
      foreach ( $legacy_paths as $path ) {
        if ( $src && strpos($src, $path) !== false ) {
          wp_dequeue_script($handle);
          break;
        }
      }
    }
  }

  if ( $wp_styles instanceof WP_Styles ) {
    foreach ( (array) $wp_styles->queue as $handle ) {
      $registered = $wp_styles->registered[$handle] ?? null;
      $src = $registered ? (string) $registered->src : '';
      foreach ( $legacy_paths as $path ) {
        if ( $src && strpos($src, $path) !== false ) {
          wp_dequeue_style($handle);
          break;
        }
      }
    }
  }
}
add_action('wp_enqueue_scripts', 'solar_expert_dequeue_legacy_frontend_assets', PHP_INT_MAX);


function solar_expert_robots_txt($output, $public) {
  if ( ! $public ) {
    return "User-agent: *\nDisallow: /\n";
  }

  return "User-agent: *\n"
    . "Disallow: /wp-admin/\n"
    . "Allow: /wp-admin/admin-ajax.php\n"
    . "Sitemap: " . home_url('/sitemap_index.xml') . "\n";
}
add_filter('robots_txt', 'solar_expert_robots_txt', 99, 2);

// Solar Expert intentionally uses public WordPress Pages for calculators,
// selectors and trust pages. Keep Pages eligible for the Yoast sitemap;
// individual noindex pages can still be excluded normally.
function solar_expert_keep_pages_in_yoast_sitemap($excluded, $post_type) {
  if ( $post_type === 'page' ) {
    return false;
  }
  return $excluded;
}
add_filter('wpseo_sitemap_exclude_post_type', 'solar_expert_keep_pages_in_yoast_sitemap', 10, 2);
