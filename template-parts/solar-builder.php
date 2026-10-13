<div id="builder" class="se-panel" x-data="solarExpertBuilder()" x-init="init()"
     @solar-expert-open-demo.window="$el.dispatchEvent(new CustomEvent('solar-expert-builder-activated')); quickPreview(); $nextTick(() => $el.scrollIntoView({behavior:'smooth',block:'start'}))">
  <div class="se-row">
    <div><div class="se-kicker">Návrh solární sestavy</div><h2 x-text="step===1?'Co chcete napájet?':step===2?'Vyberte spotřebiče':step===3?'Kdy a jak bude systém fungovat?':'Návrh sestavy'"></h2></div>
    <span class="se-step" x-text="'0'+step"></span>
  </div>
  <div class="se-progress"><span :class="step>=1?'on':''"></span><span :class="step>=2?'on':''"></span><span :class="step>=3?'on':''"></span><span :class="step>=4?'on':''"></span></div>

  <div x-show="step===1">
    <div class="se-quick-preview">
      <div><strong>Chcete nejdřív vidět výsledek?</strong><small>Modelová chata: lednice, světla, notebook, Wi-Fi · jaro–podzim · baterie na 1 den. Výpočet lze potom upravit.</small></div>
      <button type="button" class="se-btn se-btn-primary" @click="quickPreview()">Ukázat vzorovou sestavu →</button>
    </div>
    <div class="se-note" style="margin-bottom:12px"><strong>Vyberte příklad, který je vám nejblíž.</strong> Spotřebiče předvyplníme jen pro začátek; ve druhém kroku je můžete přidat, odebrat a upravit dobu provozu. Čerpadlo ani jiné výkonné zařízení nepřidáváme automaticky.</div>
    <button type="button" class="se-choice" @click="preset('chata')"><strong>Chata / zahradní domek →</strong><small>Lednice, světla, notebook a Wi-Fi. Vše upravíte.</small></button>
    <button type="button" class="se-choice" @click="preset('offgrid')"><strong>Ostrovní systém →</strong><small>Běžné spotřebiče včetně televize, bez přípojky.</small></button>
    <button type="button" class="se-choice" @click="preset('backup')"><strong>Záloha při výpadku →</strong><small>Lednice, světla a router při přerušení dodávky.</small></button>
    <div class="se-note" style="margin-top:12px"><strong>Máte síťovou fotovoltaiku na rodinném domě?</strong> Tento výpočet je pro ostrovní a záložní napájení. U domovní FVE začněte <a href="/kolik-stoji-fotovoltaika/">průvodcem návrhem a cenou fotovoltaiky</a>.</div>
  </div>

  <div x-show="step===2" x-cloak>
    <div class="se-row"><p class="se-muted">Vyberte spotřebiče a upravte dobu provozu.</p><strong><span x-text="(dailyWh/1000).toFixed(2)"></span> kWh/den</strong></div>
    <template x-for="a in appliances" :key="a.id">
      <div class="se-choice" :class="a.selected?'active':''">
        <div class="se-row"><label><input type="checkbox" x-model="a.selected" @change="inputError=''"> <strong style="display:inline" x-text="a.name"></strong></label><span><span x-text="a.watts"></span> W</span></div>
        <div class="se-formgrid" x-show="a.selected" style="margin-top:12px">
          <div class="se-field"><label>hodin / den</label><input class="se-input" type="number" min=".1" max="24" step=".1" x-model.number="a.hours" @input="inputError=''"></div>
          <div class="se-field"><label>počet</label><input class="se-input" type="number" min="1" max="10" step="1" x-model.number="a.qty" @input="inputError=''"></div>
        </div>
      </div>
    </template>
    <div class="se-note se-note-error" x-show="inputError" x-cloak style="margin-top:12px" role="alert" aria-live="polite" x-text="inputError"></div>
    <div class="se-actions"><button class="se-btn" @click="step=1">← Zpět</button><button class="se-btn se-btn-primary" :disabled="!selectedAppliances.length" @click="advanceToUsage()">Pokračovat →</button></div>
  </div>

  <div x-show="step===3" x-cloak>
    <div class="se-field"><label>Sezóna</label><select class="se-select" x-model="season"><option value="summer">hlavně léto</option><option value="three">jaro–podzim</option><option value="year">celoročně</option></select></div>
    <div class="se-field" style="margin-top:14px"><label>Rezerva baterie</label><select class="se-select" x-model.number="autonomy"><option value=".5">½ dne</option><option value="1">1 den</option><option value="2">2 dny</option></select></div>
    <div class="se-note" style="margin-top:16px">Odhad rozběhové špičky: <strong><span x-text="estimatedPeak"></span> W</strong>. Pokud znáte reálné maximum, můžete jej zvýšit.</div>
    <div class="se-field" style="margin-top:14px"><label>Známé maximum (volitelné)</label><input class="se-input" type="number" min="0" step="100" x-model.number="manualPeak" :placeholder="estimatedPeak" @input="inputError=''"></div>
    <div class="se-note se-note-error" x-show="inputError" x-cloak style="margin-top:12px" role="alert" aria-live="polite" x-text="inputError"></div>
    <div class="se-actions"><button class="se-btn" @click="step=2;inputError=''">← Zpět</button><button class="se-btn se-btn-primary" @click="calc()">Spočítat sestavu →</button></div>
  </div>

  <div x-show="step===4" x-cloak>
    <div class="se-note se-preview-note" x-show="previewMode" x-cloak role="status">
      <strong>Modelový výsledek, ne návrh na míru.</strong>
      Počítáme příklad pro chatu (lednice, světla, notebook, Wi-Fi), sezónu jaro–podzim a baterii na 1 den. Ceny jsou orientační a technická kompatibilita předběžná.
      <button type="button" class="se-btn" @click="editPreview()">Upravit spotřebiče a spočítat vlastní sestavu →</button>
    </div>
    <div class="se-resultgrid">
      <div class="se-result"><small>Denní spotřeba</small><strong><span x-text="result?.energyKwh"></span> kWh</strong></div>
      <div class="se-result"><small>Odhad špičky</small><strong><span x-text="result?.peak"></span> W</strong></div>
      <div class="se-result"><small>Panely</small><strong><span x-text="result?.panelWp"></span> Wp</strong></div>
      <div class="se-result"><small>Baterie</small><strong><span x-text="result?.batteryKwh"></span> kWh</strong></div>
      <div class="se-result"><small>Systém</small><strong><span x-text="result?.voltage"></span> V</strong></div>
      <div class="se-result"><small>Měnič</small><strong>≥ <span x-text="result?.inverterW"></span> W</strong></div>
    </div>

    <div class="se-note" x-show="catalogLoading" style="margin-top:14px">
      Načítám ověřený produktový katalog…
    </div>
    <div class="se-note se-note-error" x-show="catalogError" style="margin-top:14px">
      Technický sizing je spočítaný, ale produktový katalog se teď nepodařilo načíst. Obnovte stránku; nebudeme zobrazovat neověřené doporučení.
    </div>

    <section class="se-shopping-summary" x-show="primaryShoppingList" x-cloak aria-label="Nákupní rozpis doporučené sestavy">
      <div class="se-section-head">
        <div><div class="se-kicker">Co skutečně nakoupit</div><h3>Rozpis hlavních komponent</h3></div>
        <small class="se-muted">Varianta <strong x-text="primaryBundle?.label"></strong></small>
      </div>
      <p class="se-muted">Počty kusů a orientační ceny vycházejí z doporučení výše. U obchodníka nastavte uvedený počet kusů.</p>
      <div class="se-shopping-rows">
        <template x-for="item in primaryShoppingList?.rows || []" :key="item.label">
          <div class="se-shopping-line">
            <div><strong x-text="item.quantity+'× '+item.label"></strong><small x-text="item.name"></small></div>
            <div class="se-shopping-price"><strong x-text="item.subtotal.toLocaleString('cs-CZ')+' Kč'"></strong><small x-text="item.quantity>1 ? item.unitPrice.toLocaleString('cs-CZ')+' Kč / ks' : '1 kus / set'"></small></div>
          </div>
        </template>
      </div>
      <div class="se-shopping-total"><strong>Součet hlavních dílů</strong><strong x-text="primaryShoppingList?.total.toLocaleString('cs-CZ')+' Kč'"></strong></div>
      <p class="se-muted se-shopping-disclaimer">Nejde o jeden společný košík: ceny vycházejí z ověřených nabídek různých obchodů a mohou se změnit. Nezahrnují kabely, jištění, konstrukci, montáž ani revizi. U zvýhodněného setu se baterie a měnič nepočítají podruhé.</p>
      <a href="#builder-offers" class="se-btn se-btn-primary">Přejít k nabídkám obchodů ↓</a>
    </section>
    <div class="se-note se-note-error" x-show="primaryBundle?.priceComplete && !primaryShoppingList" x-cloak style="margin-top:14px" role="alert">
      Cenový rozpis nelze spolehlivě sladit s doporučenou celkovou cenou. Zkontrolujte ceny jednotlivých komponent přímo u obchodníků.
    </div>

    <p class="se-merchant-disclosure" x-show="completeBundles.some(b => [b.battery,b.inverter,b.mppt,b.panel?.product].some(p => p && SolarExpertAffiliate.sharedOperatorNotice(p)))" x-cloak>
      Battery.cz a Solar-Import.cz provozuje stejná společnost Efteria, spol. s r.o. Zobrazené ceny jsou nabídky jejích dvou webů, nikoliv dvou nezávislých prodejců.
    </p>
    <div class="se-bundles" id="builder-offers">
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
              <div class="se-offer-links">
                <template x-for="o in SolarExpertAffiliate.bundleDealOffers(b.bundleDeal).slice(0,2)" :key="b.bundleDeal?.id+'-'+o.merchantId">
                  <a class="se-btn se-btn-primary" target="_blank" :href="o.href"
                     :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                     @click="SolarExpertAffiliate.trackBundleDealOffer(b.bundleDeal,o.raw,'builder-'+b.tier)">
                    <span x-text="o.merchant?.label"></span>
                    <strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
                  </a>
                </template>
              </div>
            </div>

            <div class="se-offer-groups">
              <div class="se-offer-group">
                <small x-text="(b.batteryQuantity||1)>1 ? 'Baterie · '+b.batteryQuantity+' ks' : 'Baterie · kde koupit'"></small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.battery).slice(0,2)" :key="b.battery?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :data-se-product-id="b.battery?.id" :data-se-merchant="o.merchantId" :data-se-placement="'builder-battery-'+b.tier"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.battery,o.raw,'builder-battery-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">levnější z uvedených · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'+((b.batteryQuantity||1)>1?' / ks':'')"></strong>
                    </a>
                  </template>
                </div>
              </div>

              <div class="se-offer-group">
                <small>Měnič · kde koupit</small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.inverter).slice(0,2)" :key="b.inverter?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :data-se-product-id="b.inverter?.id" :data-se-merchant="o.merchantId" :data-se-placement="'builder-inverter-'+b.tier"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.inverter,o.raw,'builder-inverter-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">levnější z uvedených · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
                    </a>
                  </template>
                </div>
              </div>

              <div class="se-offer-group">
                <small>Panely · kde koupit</small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.panel?.product).slice(0,2)" :key="b.panel?.product?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :data-se-product-id="b.panel?.product?.id" :data-se-merchant="o.merchantId" :data-se-placement="'builder-panel-'+b.tier"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.panel?.product,o.raw,'builder-panel-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">levnější z uvedených · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
                    </a>
                  </template>
                </div>
              </div>

              <div class="se-offer-group" x-show="!b.integratedMppt">
                <small>MPPT · kde koupit</small>
                <div class="se-offer-links">
                  <template x-for="o in SolarExpertAffiliate.offers(b.mppt).slice(0,2)" :key="b.mppt?.id+'-'+o.merchantId">
                    <a class="se-offer" target="_blank" :href="o.href"
                       :data-se-product-id="b.mppt?.id" :data-se-merchant="o.merchantId" :data-se-placement="'builder-mppt-'+b.tier"
                       :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
                       @click="SolarExpertAffiliate.trackOffer(b.mppt,o.raw,'builder-mppt-'+b.tier)">
                      <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">levnější z uvedených · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'"></strong>
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
        <div><div class="se-kicker">Technické srovnání</div><h3>Srovnání variant podle stejných kritérií</h3></div>
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

    <div class="se-note" style="margin-top:14px">Výsledek je orientační návrh velikosti systému a předběžná kontrola kompatibility. Ceny vycházejí z datovaných nabídek obchodů a mohou se změnit. Technické pořadí sestav neurčuje affiliate provize. Před nákupem ověřte kabeláž, jištění, teplotní Voc a přesný datasheet.</div>
    <div class="se-actions"><button class="se-btn" @click="reset()">Přepočítat</button></div>
  </div>
</div>
