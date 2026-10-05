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
              <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'+((r.quantity||1)>1?' / ks':'')"></strong>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!matches.length" class="se-note">V ověřeném katalogu zatím nemáme ani jeden modul nebo ověřený paralelní bank, který projde kapacitou i limitem BMS.</div>
  </div>
</div>
