<div class="se-panel" x-data="solarExpertBatterySelector()" x-init="init()">
  <div class="se-kicker">Battery Selector</div><h2>Jakou LiFePO₄ baterii potřebujete?</h2>
  <div class="se-formgrid">
    <div class="se-field"><label>Systémové napětí</label><select class="se-select" x-model.number="voltage" @change="run()"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label>Denní spotřeba (kWh)</label><input class="se-input" type="number" min=".2" step=".1" x-model.number="dailyKwh" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label>Rezerva</label><select class="se-select" x-model.number="autonomy" @change="run()"><option value=".5">½ dne</option><option value="1">1 den</option><option value="2">2 dny</option></select></div>
    <div class="se-field"><label>Výkon měniče (W)</label><input class="se-input" type="number" step="100" x-model.number="inverterW" @input.debounce.200ms="run()"></div>
  </div>
  <div class="se-note" style="margin-top:14px">Výběr hlídá nominální energii baterie včetně rezervy i maximální vybíjecí proud BMS vůči měniči.</div>
  <div class="se-bundles">
    <template x-for="r in matches" :key="r.product.id">
      <div class="se-bundle">
        <div class="se-bundle-head">
          <strong x-text="r.product.name"></strong>
          <strong x-show="SolarExpertProductMatcher.effectivePrice(r.product)<Number.MAX_SAFE_INTEGER"><span x-text="SolarExpertProductMatcher.effectivePrice(r.product).toLocaleString('cs-CZ')"></span> Kč</strong>
        </div>
        <div class="se-muted"><span x-text="r.product.energy_wh/1000"></span> kWh · max. vybíjení <span x-text="r.product.max_discharge_a"></span> A</div>
        <div class="se-offer-links" style="margin-top:10px">
          <template x-for="o in SolarExpertAffiliate.offers(r.product).slice(0,2)" :key="r.product.id+'-'+o.merchantId">
            <a class="se-offer" target="_blank" :href="o.href"
               :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
               @click="SolarExpertAffiliate.trackOffer(r.product,o.raw,'battery-selector')">
              <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!matches.length" class="se-note">V ověřeném katalogu zatím nemáme baterii, která projde všemi limity.</div>
  </div>
</div>
