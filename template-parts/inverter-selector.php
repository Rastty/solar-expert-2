<div class="se-panel" x-data="solarExpertInverterSelector()" x-init="init()">
  <div class="se-kicker">Výběr měniče</div><h2>Vyberte měnič podle výkonu a napětí</h2>
  <div class="se-note" style="margin-bottom:14px"><strong>Upravte své požadavky.</strong> Hodnoty níže jsou jen výchozí příklad; doporučení se po každé změně přepočítá automaticky.</div>
  <div class="se-formgrid">
    <div class="se-field"><label for="se-inverter-voltage">DC systém</label><select id="se-inverter-voltage" class="se-select" x-model.number="voltage" @change="run()"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label for="se-inverter-continuous">Trvalý požadovaný výkon (W)</label><input id="se-inverter-continuous" class="se-input" type="number" min="100" step="100" x-model.number="continuousW" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label for="se-inverter-peak">Rozběhová špička (W)</label><input id="se-inverter-peak" class="se-input" type="number" min="100" step="100" x-model.number="peakW" @input.debounce.200ms="run()"></div>
  </div>
  <div class="se-note" style="margin-top:14px">
    Měnič musí zvládnout oba limity: <strong><span x-text="continuousW"></span> W trvale</strong> a
    <strong><span x-text="peakW"></span> W krátkodobě</strong>.
    Bateriový bank musí při zvoleném napětí dodat orientačně alespoň <strong><span x-text="requiredDcA"></span> A</strong> trvale
    a <strong><span x-text="peakDcA"></span> A</strong> při špičce; skutečný DC proud může být vyšší kvůli účinnosti měniče a poklesu napětí.
  </div>
  <div class="se-note se-note-error" x-show="!inputValid" style="margin-top:14px" role="alert">
    Zkontrolujte vstupy: trvalý výkon musí být kladný a rozběhová špička musí být alespoň stejně vysoká jako trvalý požadovaný výkon.
  </div>
  <div class="se-note" x-show="catalogLoading" style="margin-top:14px" role="status" aria-live="polite">Načítám ověřený katalog měničů…</div>
  <div class="se-note se-note-error" x-show="catalogError" style="margin-top:14px" role="alert">
    Katalog měničů se teď nepodařilo načíst. Obnovte stránku; nebudeme zobrazovat neověřené doporučení.
  </div>
  <div class="se-row" style="margin-top:20px"><h3 style="margin:0">Doporučené měniče</h3><small class="se-muted">podle hodnot výše</small></div>
  <div class="se-bundles" :aria-busy="catalogLoading ? 'true' : 'false'" aria-live="polite">
    <template x-for="r in matches" :key="r.product.id">
      <div class="se-bundle">
        <div class="se-bundle-head">
          <strong x-text="r.product.name"></strong>
          <strong x-show="SolarExpertProductMatcher.effectivePrice(r.product)<Number.MAX_SAFE_INTEGER"><span x-text="SolarExpertProductMatcher.effectivePrice(r.product).toLocaleString('cs-CZ')"></span> Kč</strong>
        </div>
        <div class="se-muted"><span x-text="r.product.continuous_w"></span> W trvale · <span x-text="r.product.peak_w"></span> W špička</div>
        <div class="se-offer-links" style="margin-top:10px">
          <template x-for="o in SolarExpertAffiliate.offers(r.product).slice(0,2)" :key="r.product.id+'-'+o.merchantId">
            <a class="se-offer" target="_blank" :href="o.href"
               :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
               @click="SolarExpertAffiliate.trackOffer(r.product,o.raw,'inverter-selector')">
              <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">nejlevnější · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!catalogLoading && !catalogError && inputValid && !matches.length" class="se-note">V ověřeném katalogu zatím nemáme měnič, který současně projde zadaným DC napětím, trvalým výkonem a špičkou.</div>
  </div>
</div>
