<div class="se-panel" x-data="solarExpertInverterSelector()" x-init="init()">
  <div class="se-kicker">Inverter Selector</div><h2>Vyberte měnič podle výkonu a napětí</h2>
  <div class="se-formgrid">
    <div class="se-field"><label>DC systém</label><select class="se-select" x-model.number="voltage" @change="run()"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label>Trvalý požadovaný výkon (W)</label><input class="se-input" type="number" step="100" x-model.number="continuousW" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label>Rozběhová špička (W)</label><input class="se-input" type="number" step="100" x-model.number="peakW" @input.debounce.200ms="run()"></div>
  </div>
  <div class="se-bundles">
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
              <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!matches.length" class="se-note">V katalogu zatím nemáme měnič, který projde zadaným trvalým výkonem, špičkou a napětím.</div>
  </div>
</div>
