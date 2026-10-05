<div class="se-panel" x-data="solarExpertMpptSelector()" x-init="init()">
  <div class="se-kicker">MPPT Selector</div><h2>Vyberte regulátor podle FV pole</h2>
  <div class="se-formgrid">
    <div class="se-field"><label>Bateriový systém</label><select class="se-select" x-model.number="voltage" @change="run()"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label>Výkon pole (Wp)</label><input class="se-input" type="number" step="50" x-model.number="panelWp" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label>Voc panelu (V)</label><input class="se-input" type="number" step=".1" x-model.number="panelVoc" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label>Vmp panelu (V)</label><input class="se-input" type="number" step=".1" x-model.number="panelVmp" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label>Panelů v sérii</label><input class="se-input" type="number" min="1" x-model.number="seriesCount" @input.debounce.200ms="run()"></div>
  </div>
  <div class="se-note" style="margin-top:14px">String Vmp: <strong><span x-text="stringVmp.toFixed(1)"></span> V</strong> · konzervativní cold Voc (×1,12): <strong><span x-text="coldStringVoc.toFixed(1)"></span> V</strong>. Výběr hlídá startovací MPPT napětí i rezervu pod maximálním Voc.</div>
  <div class="se-bundles">
    <template x-for="r in matches" :key="r.product.id">
      <div class="se-bundle">
        <div class="se-bundle-head">
          <strong x-text="r.product.name"></strong>
          <strong x-show="SolarExpertProductMatcher.effectivePrice(r.product)<Number.MAX_SAFE_INTEGER"><span x-text="SolarExpertProductMatcher.effectivePrice(r.product).toLocaleString('cs-CZ')"></span> Kč</strong>
        </div>
        <div class="se-muted"><span x-text="r.product.rated_charge_a"></span> A · max Voc <span x-text="r.product.max_pv_voc_v"></span> V</div>
        <div class="se-offer-links" style="margin-top:10px">
          <template x-for="o in SolarExpertAffiliate.offers(r.product).slice(0,2)" :key="r.product.id+'-'+o.merchantId">
            <a class="se-offer" target="_blank" :href="o.href"
               :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
               @click="SolarExpertAffiliate.trackOffer(r.product,o.raw,'mppt-selector')">
              <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!matches.length" class="se-note">Žádný MPPT v katalogu současně nesplňuje výkon, proud a napěťové okno.</div>
  </div>
</div>
