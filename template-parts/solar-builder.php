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
      <template x-for="b in completeBundles" :key="b.tier">
        <div class="se-bundle" :class="b.tier==='best'?'best':''">
          <div class="se-bundle-head">
            <div><span class="se-chip" x-text="b.label"></span><div class="se-muted" style="font-size:12px;margin-top:5px">předběžně kompatibilní</div></div>
            <div style="text-align:right">
              <strong x-show="b.complete && b.priceComplete"><span x-text="b.totalPrice?.toLocaleString('cs-CZ')"></span> Kč</strong>
              <small class="se-muted" style="display:block" x-show="b.bundleDeal">celkem při využití setu</small>
            </div>
            <span class="se-muted" x-show="b.complete && !b.priceComplete">cena se doplní</span>
          </div>

          <div x-show="b.complete" style="margin-top:12px;font-size:14px">
            <div><strong>Panely:</strong> <span x-text="b.panel?.count"></span>× <span x-text="b.panel?.product?.name"></span> · <strong x-text="b.panel?.topology"></strong></div>
            <div class="se-muted"><span x-text="b.panel?.totalWp"></span> Wp · string Vmp <span x-text="b.panel?.stringVmp"></span> V · cold Voc <span x-text="b.panel?.coldStringVoc"></span> V</div>
            <div><strong>Baterie:</strong> <span x-text="(b.batteryQuantity||1)+'× '+b.battery?.name"></span> <span class="se-muted" x-show="b.batteryBank">· <span x-text="(b.batteryBank?.totalEnergyWh/1000).toFixed(2)"></span> kWh celkem</span></div>
            <div><strong>Měnič:</strong> <span x-text="b.inverter?.name"></span></div>
            <div><strong>MPPT:</strong> <span x-text="b.integratedMppt?'integrovaný v měniči':b.mppt?.name"></span></div>

            <div class="se-bundle-deal" x-show="b.bundleDeal">
              <div>
                <small>Výhodnější set baterie + měnič</small>
                <strong x-text="b.bundleDeal?.label"></strong>
                <span class="se-muted">Ověřená cena setu <strong x-text="b.bundleDeal?.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong> · úspora <strong x-text="(b.bundleDeal?.bankSavingsCzk||b.bundleDeal?.savings_czk)?.toLocaleString('cs-CZ')+' Kč'"></strong> proti stejným komponentům zvlášť.</span>
                <span class="se-muted" x-show="(b.bundleDeal?.extraBatteryUnits||0)>0">
                  Set obsahuje 1× baterii + měnič. Pro celý bank dokupte ještě <strong x-text="b.bundleDeal?.extraBatteryUnits+'× '+b.battery?.name"></strong> přes nabídku baterie níže.
                </span>
              </div>
              <a class="se-btn se-btn-primary" target="_blank"
                 :href="SolarExpertAffiliate.resolveBundleDeal(b.bundleDeal).href"
                 :rel="SolarExpertAffiliate.resolveBundleDeal(b.bundleDeal).monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                 @click="SolarExpertAffiliate.trackBundleDeal(b.bundleDeal,'builder-'+b.tier)">
                 Koupit jako set →
              </a>
            </div>

            <div class="se-offer-groups">
              <div class="se-offer-group">
                <small x-text="(b.batteryQuantity||1)>1 ? 'Baterie · '+b.batteryQuantity+' ks' : 'Baterie · kde koupit'"></small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.battery).slice(0,2)" :key="b.battery?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.battery,o.raw,'builder-battery-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'+((b.batteryQuantity||1)>1?' / ks':'')"></strong>
                    </a>
                  </template>
                </div>
              </div>

              <div class="se-offer-group">
                <small>Měnič · kde koupit</small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.inverter).slice(0,2)" :key="b.inverter?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.inverter,o.raw,'builder-inverter-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
                    </a>
                  </template>
                </div>
              </div>

              <div class="se-offer-group">
                <small>Panely · kde koupit</small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.panel?.product).slice(0,2)" :key="b.panel?.product?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.panel?.product,o.raw,'builder-panel-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
                    </a>
                  </template>
                </div>
              </div>

              <div class="se-offer-group" x-show="!b.integratedMppt">
                <small>MPPT · kde koupit</small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.mppt).slice(0,2)" :key="b.mppt?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.mppt,o.raw,'builder-mppt-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
                    </a>
                  </template>
                </div>
              </div>
            </div>
          </div>

        </div>
      </template>
    </div>

    <div class="se-note" x-show="!completeBundles.length" style="margin-top:14px">
      Pro zadané parametry zatím nemáme v ověřeném katalogu kompletní sestavu. Raději nezobrazíme neověřenou kombinaci, než doporučit technicky slabou variantu.
    </div>
    <div class="se-muted se-tier-transparency" x-show="completeBundles.length && incompleteBundles.length">
      Neúplné cenové úrovně nezobrazujeme: <strong x-text="incompleteBundles.map(b=>b.label).join(', ')"></strong>. Zobrazí se až ve chvíli, kdy pro ně máme ověřenou baterii, měnič a panelové zapojení.
    </div>

    <section class="se-compare" x-show="completeBundles.length>1">
      <div class="se-section-head">
        <div><div class="se-kicker">Product comparison</div><h3>Srovnání variant podle stejných kritérií</h3></div>
        <span class="se-muted">Technika první, cena až potom.</span>
      </div>
      <div class="se-compare-grid">
        <template x-for="b in completeBundles" :key="'compare-'+b.tier">
          <article class="se-compare-card" :class="b.tier==='best'?'best':''">
            <div class="se-bundle-head">
              <span class="se-chip" x-text="b.label"></span>
              <strong x-show="b.priceComplete"><span x-text="b.totalPrice?.toLocaleString('cs-CZ')"></span> Kč</strong>
            </div>
            <template x-if="comparisonFor(b)">
              <div>
                <dl class="se-compare-metrics">
                  <div><dt>Baterie</dt><dd><span x-text="comparisonFor(b).batteryKwh.toFixed(2)"></span> kWh</dd></div>
                  <div><dt>Měnič</dt><dd><span x-text="comparisonFor(b).inverterW"></span> W</dd></div>
                  <div><dt>Špička</dt><dd><span x-text="comparisonFor(b).surgeW"></span> W</dd></div>
                  <div><dt>Panely</dt><dd><span x-text="comparisonFor(b).panelWp"></span> Wp</dd></div>
                </dl>
                <ul class="se-reasons">
                  <template x-for="reason in comparisonFor(b).reasons" :key="b.tier+'-'+reason">
                    <li x-text="reason"></li>
                  </template>
                </ul>
              </div>
            </template>
          </article>
        </template>
      </div>
    </section>

    <section class="se-checklist" x-show="primaryBundle">
      <div class="se-section-head">
        <div><div class="se-kicker">Co ještě potřebuji?</div><h3>Co je v návrhu a co ještě chybí</h3></div>
        <span class="se-muted">Pro variantu <strong x-text="primaryBundle?.label"></strong></span>
      </div>
      <div class="se-checklist-grid">
        <div>
          <h4>Už v sestavě</h4>
          <template x-for="item in checklistFor(primaryBundle).filter(x=>x.group==='included')" :key="'in-'+item.label">
            <div class="se-checkline included">
              <span>✓</span><div><strong x-text="item.label"></strong><small x-text="item.note"></small></div>
            </div>
          </template>
        </div>
        <div>
          <h4>Ještě dimenzovat / dokoupit</h4>
          <template x-for="item in checklistFor(primaryBundle).filter(x=>x.group==='extra')" :key="'ex-'+item.label">
            <div class="se-checkline">
              <span>○</span><div><strong x-text="item.label"></strong><small x-text="item.note"></small></div>
            </div>
          </template>
        </div>
      </div>
      <div class="se-note" style="margin-top:14px">Tento seznam zatím nevybírá konkrétní jištění, kabely ani konstrukci bez potřebných vstupů. Raději ukážeme, co je potřeba ověřit, než doporučit falešně přesný díl.</div>
    </section>

    <div class="se-note" style="margin-top:14px">Výsledek je sizing a předběžný compatibility check. Ceny jsou orientační snapshoty a technický ranking není ovlivněn affiliate provizí. Před nákupem ověřte kabeláž, jištění, teplotní Voc a přesný datasheet.</div>
    <div class="se-actions"><button class="se-btn" @click="reset()">Přepočítat</button></div>
  </div>
</div>
