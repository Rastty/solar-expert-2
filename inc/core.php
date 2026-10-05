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
    <p><strong>Build <code>dev-rc-0.7.0</code></strong></p>
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
    ?>
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
    'build_marker' => 'dev-rc-0.7.0',
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


function solar_expert_seo_meta() {
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
    'kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem' => array(
      'title' => 'Kolik stojí fotovoltaika s tepelným čerpadlem 2026 | Solar Expert',
      'description' => 'Aktuální orientační ceny FVE s baterií a tepelného čerpadla, jak správně dimenzovat kombinaci a co porovnat v nabídce.'
    ),
    'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda' => array(
      'title' => 'Tepelné čerpadlo u souseda: vzdálenost, hluk a pravidla 2026 | Solar Expert',
      'description' => 'Jak umístit venkovní jednotku tepelného čerpadla vůči hranici pozemku a sousedovi. Hluk, povolení a praktické chyby.'
    ),
    'castecne-zastineni-a-solarni-panely' => array(
      'title' => 'Zastínění solárních panelů: výkon, bypass diody a MPPT | Solar Expert',
      'description' => 'Jak částečné zastínění ovlivní výkon fotovoltaických panelů a stringu, kdy pomůže MPPT nebo optimizér a co ověřit v návrhu.'
    ),
    'kolik-vyrobi-fotovoltaika-za-hodinu' => array(
      'title' => 'Kolik vyrobí fotovoltaika za hodinu? kW vs. kWh | Solar Expert',
      'description' => 'Kolik energie vyrobí 1, 5 nebo 10 kWp fotovoltaika za hodinu, rozdíl kW a kWh a proč se skutečný výkon během dne mění.'
    ),
    'cisteni-solarnich-panelu-proc-kdy-jak' => array(
      'title' => 'Čištění solárních panelů: jak často, čím a bezpečně | Solar Expert',
      'description' => 'Kdy čistit fotovoltaické panely, čemu se vyhnout, jak bezpečně odstranit prach a ptačí trus a kdy je lepší profesionální servis.'
    ),
    'recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady' => array(
      'title' => 'Samsung tepelné čerpadlo recenze 2026: EHS R290 | Solar Expert',
      'description' => 'Technická recenze Samsung EHS 2026: R290 Mono, hlučnost, COP, teplota vody, výhody, nevýhody a co ověřit před nákupem.'
    ),
    'proc-se-solarni-panely-neprehrivaji' => array(
      'title' => 'Přehřívání solárních panelů: teplota, výkon a chlazení | Solar Expert',
      'description' => 'Jak vysoká teplota ovlivňuje výkon fotovoltaických panelů, proč se panely běžně nepoškodí přehřátím a kdy řešit chlazení.'
    ),
  );

  if ( is_front_page() ) {
    return $map['front'];
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
    'recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady',
    'nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu',
    'recenze-tepelneho-cerpadla-viessman-klady-zapory-a-naklady',
    'spotreba-tepelneho-cerpadla-v-kwh',
    'prehled-vzduchovych-tepelnych-cerpadel-daikin',
    'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji',
    'jak-funguje-tepelne-cerpadlo',
    'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda',
    'tepelne-cerpadlo-nebo-elektrokotel',
    'tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti',
    'tepelne-cerpadla-lg-vyhody-nevyhody-ceny'
  );
}

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
    'velikost-rozmery-a-hmotnost-solarnich-panelu'
  );
}

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
  $cta = '<aside class="se-note se-lead-cta">'
    . '<strong>Chcete porovnat vlastní návrh s nabídkou na klíč?</strong> '
    . 'Nechte si připravit nezávaznou nabídku fotovoltaiky od E.ON a porovnejte výkon, baterii i cenu s návrhem Solar Expertu.'
    . '<p><a class="se-btn se-btn-primary" href="' . esc_url($fallback) . '" '
    . 'data-se-lead-id="eon-solar" data-se-placement="solar_legacy_article" '
    . 'data-se-fallback="' . esc_attr($fallback) . '" rel="nofollow noopener">Nezávazně poptat fotovoltaiku →</a></p>'
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
    'jak-vycistit-solarni-panely-pruvodce-cistenim-solaru' => 'cisteni-solarnich-panelu-proc-kdy-jak',
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
