<div id="builder" class="se-panel" x-data="solarExpertBuilder()" x-init="init()">
  <div class="se-row">
    <div><div class="se-kicker">Solar Setup Builder</div><h2 x-text="step===1?'Co chcete napájet?':step===2?'Vyberte spotřebiče':step===3?'Kdy a jak bude systém fungovat?':'Návrh sestavy'"></h2></div>
    <span class="se-step" x-text="'0'+step"></span>
  </div>
  <div class="se-progress"><span :class="step>=1?'on':''"></span><span :class="step>=2?'on':''"></span><span :class="step>=3?'on':''"></span><span :class="step>=4?'on':''"></span></div>

  <div x-show="step===1">
    <button class="se-choice" @click="preset('chata')"><strong>Chata / zahradní domek</strong><small>Lednice, světla, čerpadlo, notebook…</small></button>
    <button class="se-choice" @click="preset('offgrid')"><strong>Ostrovní systém</strong><small>Celodenní provoz bez spolehlivé sítě.</small></button>
    <button class="se-choice" @click="preset('backup')"><strong>Záloha při výpadku</strong><small>Důležité spotřebiče a baterie.</small></button>
  </div>

  <div x-show="step===2" x-cloak>
    <div class="se-row"><p class="se-muted">Vyberte spotřebiče a upravte dobu provozu.</p><strong><span x-text="(dailyWh/1000).toFixed(2)"></span> kWh/den</strong></div>
    <template x-for="a in appliances" :key="a.id">
      <div class="se-choice" :class="a.selected?'active':''">
        <div class="se-row"><label><input type="checkbox" x-model="a.selected"> <strong style="display:inline" x-text="a.name"></strong></label><span><span x-text="a.watts"></span> W</span></div>
        <div class="se-formgrid" x-show="a.selected" style="margin-top:12px">
          <div class="se-field"><label>hodin / den</label><input class="se-input" type="number" min="0" max="24" step=".1" x-model.number="a.hours"></div>
          <div class="se-field"><label>počet</label><input class="se-input" type="number" min="1" max="10" x-model.number="a.qty"></div>
        </div>
      </div>
    </template>
    <div class="se-actions"><button class="se-btn" @click="step=1">← Zpět</button><button class="se-btn se-btn-primary" :disabled="!selectedAppliances.length" @click="step=3">Pokračovat →</button></div>
  </div>

  <div x-show="step===3" x-cloak>
    <div class="se-field"><label>Sezóna</label><select class="se-select" x-model="season"><option value="summer">hlavně léto</option><option value="three">jaro–podzim</option><option value="year">celoročně</option></select></div>
    <div class="se-field" style="margin-top:14px"><label>Rezerva baterie</label><select class="se-select" x-model.number="autonomy"><option value=".5">½ dne</option><option value="1">1 den</option><option value="2">2 dny</option></select></div>
    <div class="se-note" style="margin-top:16px">Odhad rozběhové špičky: <strong><span x-text="estimatedPeak"></span> W</strong>. Pokud znáte reálné maximum, můžete jej zvýšit.</div>
    <div class="se-field" style="margin-top:14px"><label>Známé maximum (volitelné)</label><input class="se-input" type="number" step="100" x-model.number="manualPeak" :placeholder="estimatedPeak"></div>
    <div class="se-actions"><button class="se-btn" @click="step=2">← Zpět</button><button class="se-btn se-btn-primary" @click="calc()">Spočítat sestavu →</button></div>
  </div>

  <div x-show="step===4" x-cloak>
    <div class="se-resultgrid">
      <div class="se-result"><small>Denní spotřeba</small><strong><span x-text="result?.energyKwh"></span> kWh</strong></div>
      <div class="se-result"><small>Odhad špičky</small><strong><span x-text="result?.peak"></span> W</strong></div>
      <div class="se-result"><small>Panely</small><strong><span x-text="result?.panelWp"></span> Wp</strong></div>
      <div class="se-result"><small>Baterie</small><strong><span x-text="result?.batteryKwh"></span> kWh</strong></div>
      <div class="se-result"><small>Systém</small><strong><span x-text="result?.voltage"></span> V</strong></div>
      <div class="se-result"><small>Měnič</small><strong>≥ <span x-text="result?.inverterW"></span> W</strong></div>
    </div>

    <div class="se-bundles">
      <template x-for="b in bundles" :key="b.tier">
        <div class="se-bundle" :class="b.tier==='best'?'best':''">
          <div class="se-bundle-head">
            <div><span class="se-chip" x-text="b.label"></span><div class="se-muted" style="font-size:12px;margin-top:5px" x-text="b.complete?'předběžně kompatibilní':'zatím neúplná varianta'"></div></div>
            <strong x-show="b.complete && b.priceComplete"><span x-text="b.totalPrice?.toLocaleString('cs-CZ')"></span> Kč</strong>
            <span class="se-muted" x-show="b.complete && !b.priceComplete">cena se doplní</span>
          </div>
          <div x-show="b.complete" style="margin-top:12px;font-size:14px">
            <div><strong>Panely:</strong> <span x-text="b.panel?.count"></span>× <span x-text="b.panel?.product?.name"></span> · <strong x-text="b.panel?.topology"></strong></div>
            <div class="se-muted"><span x-text="b.panel?.totalWp"></span> Wp · string Vmp <span x-text="b.panel?.stringVmp"></span> V · cold Voc <span x-text="b.panel?.coldStringVoc"></span> V</div>
            <div><strong>Baterie:</strong> <span x-text="b.battery?.name"></span></div>
            <div><strong>Měnič:</strong> <span x-text="b.inverter?.name"></span></div>
            <div><strong>MPPT:</strong> <span x-text="b.integratedMppt?'integrovaný v měniči':b.mppt?.name"></span></div>

            <div class="se-actions" style="margin-top:12px">
              <a class="se-btn" target="_blank"
                 :href="SolarExpertAffiliate.resolve(b.battery).href"
                 :rel="SolarExpertAffiliate.resolve(b.battery).monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                 @click="SolarExpertAffiliate.track(b.battery,'builder-battery-'+b.tier)">
                Baterie · <span x-text="SolarExpertAffiliate.resolve(b.battery).merchant?.label"></span> →
              </a>
              <a class="se-btn" target="_blank"
                 :href="SolarExpertAffiliate.resolve(b.inverter).href"
                 :rel="SolarExpertAffiliate.resolve(b.inverter).monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                 @click="SolarExpertAffiliate.track(b.inverter,'builder-inverter-'+b.tier)">
                Měnič · <span x-text="SolarExpertAffiliate.resolve(b.inverter).merchant?.label"></span> →
              </a>
              <a class="se-btn" target="_blank"
                 :href="SolarExpertAffiliate.resolve(b.panel?.product).href"
                 :rel="SolarExpertAffiliate.resolve(b.panel?.product).monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                 @click="SolarExpertAffiliate.track(b.panel?.product,'builder-panel-'+b.tier)">
                Panely · <span x-text="SolarExpertAffiliate.resolve(b.panel?.product).merchant?.label"></span> →
              </a>
              <a class="se-btn" x-show="!b.integratedMppt" target="_blank"
                 :href="SolarExpertAffiliate.resolve(b.mppt).href"
                 :rel="SolarExpertAffiliate.resolve(b.mppt).monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                 @click="SolarExpertAffiliate.track(b.mppt,'builder-mppt-'+b.tier)">
                MPPT · <span x-text="SolarExpertAffiliate.resolve(b.mppt).merchant?.label"></span> →
              </a>
            </div>
          </div>
          <div x-show="!b.complete" class="se-muted" style="margin-top:12px">Chybí ověřená data / produkt: <span x-text="(b.missing||[]).join(', ')"></span>.</div>
        </div>
      </template>
    </div>
    <div class="se-note" style="margin-top:14px">Výsledek je sizing a předběžný compatibility check. Před nákupem je nutné ověřit kabeláž, jištění, teplotní Voc a přesný datasheet.</div>
    <div class="se-actions"><button class="se-btn" @click="reset()">Přepočítat</button></div>
  </div>
</div>
