<div class="se-panel" x-data="solarExpertBatterySelector()" x-init="init()">
  <div class="se-kicker">Battery Selector</div><h2>Jakou LiFePO₄ baterii potřebujete?</h2>
  <div class="se-formgrid">
    <div class="se-field"><label for="se-battery-voltage">Systémové napětí</label><select id="se-battery-voltage" class="se-select" x-model.number="voltage" @change="run()"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label for="se-battery-daily-kwh">Denní spotřeba (kWh)</label><input id="se-battery-daily-kwh" class="se-input" type="number" min=".2" step=".1" x-model.number="dailyKwh" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label for="se-battery-autonomy">Rezerva</label><select id="se-battery-autonomy" class="se-select" x-model.number="autonomy" @change="run()"><option value=".5">½ dne</option><option value="1">1 den</option><option value="2">2 dny</option></select></div>
    <div class="se-field"><label for="se-battery-inverter-w">Výkon měniče (W)</label><input id="se-battery-inverter-w" class="se-input" type="number" min="100" step="100" x-model.number="inverterW" @input.debounce.200ms="run()"></div>
  </div>
  <div class="se-note" style="margin-top:14px">
    Výběr hlídá nominální energii baterie včetně rezervy i maximální vybíjecí proud BMS vůči měniči.
    Pro toto zadání potřebujete alespoň <strong><span x-text="requiredBatteryKwh.toFixed(1)"></span> kWh</strong> nominální kapacity a orientačně nejméně
    <strong><span x-text="requiredDischargeA"></span> A</strong> trvalého vybíjecího proudu banku při zvoleném systémovém napětí.
  </div>
  <div class="se-note" x-show="catalogLoading" style="margin-top:14px" role="status" aria-live="polite">Načítám ověřený katalog baterií…</div>
  <div class="se-note se-note-error" x-show="catalogError" style="margin-top:14px" role="alert">
    Katalog baterií se teď nepodařilo načíst. Obnovte stránku; nebudeme zobrazovat neověřené doporučení.
  </div>
  <div class="se-bundles" :aria-busy="catalogLoading ? 'true' : 'false'" aria-live="polite">
    <template x-for="r in matches" :key="r.product.id">
      <div class="se-bundle">
        <div class="se-bundle-head">
          <strong x-text="(r.quantity||1)+'× '+r.product.name"></strong>
          <strong x-show="r.totalPrice<Number.MAX_SAFE_INTEGER"><span x-text="r.totalPrice.toLocaleString('cs-CZ')"></span> Kč</strong>
        </div>
        <div class="se-muted">
          <span x-text="(r.totalEnergyWh/1000).toFixed(2)"></span> kWh celkem ·
          max. vybíjení <span x-text="r.totalDischargeA"></span> A celkem
          <span x-show="(r.quantity||1)>1"> · <span x-text="(r.product.energy_wh/1000).toFixed(2)"></span> kWh / modul</span>
        </div>
        <div class="se-note" x-show="(r.quantity||1)>1" style="margin-top:10px">
          Ověřený paralelní bank: <strong x-text="r.quantity+' stejné moduly'"></strong>. Před instalací ověřte sběrnici, symetrickou kabeláž, jištění každé větve a nastavení BMS podle výrobce.
        </div>
        <div class="se-offer-links" style="margin-top:10px">
          <template x-for="o in SolarExpertAffiliate.offers(r.product).slice(0,2)" :key="r.product.id+'-'+o.merchantId">
            <a class="se-offer" target="_blank" :href="o.href"
               :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
               @click="SolarExpertAffiliate.trackOffer(r.product,o.raw,'battery-selector')">
              <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">nejlevnější · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'+((r.quantity||1)>1?' / ks':'')"></strong>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!catalogLoading && !catalogError && !matches.length" class="se-note">V ověřeném katalogu zatím nemáme ani jeden modul nebo ověřený paralelní bank, který projde kapacitou i limitem BMS.</div>
  </div>
</div>
