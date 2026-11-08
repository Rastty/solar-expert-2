<div class="se-panel" x-data="solarExpertBatterySelector()" x-init="init()">
  <div class="se-kicker">Výběr baterie</div><h2>Jakou LiFePO₄ baterii potřebujete?</h2>
  <div class="se-note" style="margin-bottom:14px"><strong>Upravte své hodnoty.</strong> Čísla níže jsou jen výchozí příklad; po změně kteréhokoli pole se doporučení přepočítá automaticky.</div>
  <div class="se-note se-selector-examples" data-se-selector-examples="battery" style="margin-bottom:14px">
    <strong>Nemáte spočítanou spotřebu? Vyzkoušejte modelový příklad.</strong>
    <p class="se-muted">Hodnoty se doplní do formuláře. Můžete je pak změnit podle své skutečné spotřeby.</p>
    <div class="se-actions">
      <button type="button" class="se-btn" @click="applyExample('panel400')">Panel 400 W: 24 V, 0,7 kWh/den</button>
      <button type="button" class="se-btn" @click="applyExample('cottage')">Chata: 24 V, 1 kWh/den</button>
      <button type="button" class="se-btn" @click="applyExample('backup')">Záloha: 48 V, 3 kWh/den</button>
      <button type="button" class="se-btn" data-se-battery-dc-case="camera24h" @click="applyExample('camera24h')">Wi-Fi kamera + router 24/7: 12 V DC, 461 Wh/den</button>
    </div>
  </div>
  <div class="se-note" x-cloak x-show="articleExample && articleExampleKind==='panel400'" data-se-article-example="panel400" role="status">
    <strong>Model z článku o panelu 400 W:</strong> systém 24 V, denní spotřeba 0,7 kWh, jednodenní rezerva a modelový trvalý příkon 800 W.
    Jde pouze o ilustraci, nikoli vaše skutečné parametry. Před nákupem upravte spotřebu, výkon, napětí a připočtěte klidový odběr měniče.
  </div>
  <div class="se-note" x-cloak x-show="articleExample && articleExampleKind==='camera24h'" data-se-article-example="camera24h" role="status">
    <strong>Model z článku o Wi-Fi kameře a routeru na chatě:</strong> nepřetržitý odběr 16 W × 24 h = 384 Wh/den a ilustrační 20% rezerva na napájení = 461 Wh/den. Systém 12 V DC, dva dny autonomie a 20 W návrhového kontinuálního příkonu. Nejde o měření konkrétních zařízení ani ověření zapojení PoE, DC-DC měniče, MPPT či jištění. Před nákupem upravte hodnoty a ověřte datasheety.
  </div>
  <div class="se-formgrid">
    <div class="se-field"><label for="se-battery-voltage">Systémové napětí</label><select id="se-battery-voltage" class="se-select" x-model.number="voltage" @change="run()"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label for="se-battery-supply-mode">Způsob napájení spotřebičů</label><select id="se-battery-supply-mode" class="se-select" x-model="supplyMode" @change="run()"><option value="ac">230 V přes měnič (model 90 % účinnosti)</option><option value="dc">Přímo DC / PoE (ztráty již zahrnuté v kWh)</option></select></div>
    <div class="se-field"><label for="se-battery-daily-kwh">Denní spotřeba spotřebičů (kWh/den)</label><input id="se-battery-daily-kwh" class="se-input" type="number" min=".001" step=".001" x-model.number="dailyKwh" @input.debounce.200ms="run()"></div>
    <div class="se-field"><label for="se-battery-autonomy">Rezerva</label><select id="se-battery-autonomy" class="se-select" x-model.number="autonomy" @change="run()"><option value=".5">½ dne</option><option value="1">1 den</option><option value="2">2 dny</option></select></div>
    <div class="se-field"><label for="se-battery-inverter-w"><span x-text="supplyMode==='dc' ? 'Max. návrhový příkon DC spotřebičů (W)' : 'Výkon měniče (W)'"></span></label><input id="se-battery-inverter-w" class="se-input" type="number" min="1" step="1" x-model.number="inverterW" @input.debounce.200ms="run()"></div>
  </div>
  <div class="se-note" style="margin-top:14px">
    <span x-show="supplyMode==='ac'">Pro 230V spotřebiče počítáme s 80 % využitelné kapacity baterie a 90 % účinností měniče. Denní spotřebu samotného měniče naprázdno připočtěte k zadaným kWh.</span>
    <span x-show="supplyMode==='dc'">Pro přímé DC/PoE napájení počítáme s 80 % využitelné kapacity baterie. Zadávejte denní spotřebu již včetně reálných ztrát DC-DC/PoE měničů: znovu neodečítáme účinnost neexistujícího 230V měniče. Model kamery a routeru používá 461 Wh/den včetně ilustrační 20% rezervy a 20 W návrhového odběru. Výběr baterie automaticky neověřuje kompatibilitu DC napětí, PoE, jištění ani MPPT.</span>
    Výběr hlídá nominální energii baterie včetně rezervy i maximální trvalý vybíjecí proud BMS.
    Pro toto zadání potřebujete alespoň <strong><span x-text="requiredBatteryKwh.toFixed(1)"></span> kWh</strong> nominální kapacity a orientačně nejméně
    <strong><span x-text="requiredDischargeA"></span> A</strong> trvalého vybíjecího proudu banku při zvoleném systémovém napětí.
  </div>
  <div class="se-note se-note-error" x-show="!inputValid" style="margin-top:14px" role="alert">Zadejte platné kladné hodnoty napětí, spotřeby, rezervy a výkonu. Dokud nejsou vstupy platné, nezobrazujeme žádné nákupní doporučení.</div>
  <div class="se-note" x-show="catalogLoading" style="margin-top:14px" role="status" aria-live="polite">Načítám ověřený katalog baterií…</div>
  <div class="se-note se-note-error" x-show="catalogError" style="margin-top:14px" role="alert">
    Katalog baterií se teď nepodařilo načíst. Obnovte stránku; nebudeme zobrazovat neověřené doporučení.
  </div>
  <div class="se-row" style="margin-top:20px"><h3 style="margin:0">Doporučené baterie</h3><small class="se-muted">podle hodnot výše</small></div>
  <p class="se-merchant-disclosure" x-show="matches.some(r => SolarExpertAffiliate.sharedOperatorNotice(r.product))" x-cloak>
    Battery.cz a Solar-Import.cz provozuje stejná společnost Efteria, spol. s r.o. Porovnáváme nabídky jejích dvou webů, nikoliv dvou nezávislých prodejců.
  </p>
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
               :data-se-product-id="r.product.id" :data-se-merchant="o.merchantId" data-se-placement="battery-selector"
               :rel="o.monetized ? 'sponsored nofollow noopener' : 'nofollow noopener'"
               @click="SolarExpertAffiliate.trackOffer(r.product,o.raw,'battery-selector')">
              <span x-text="o.merchant?.label"></span><small class="se-offer-best" x-show="o.is_best_price && o.savings_vs_next_czk">levnější z uvedených · o <span x-text="o.savings_vs_next_czk?.toLocaleString('cs-CZ')"></span> Kč</small><strong x-show="o.price_czk" x-text="o.price_czk?.toLocaleString('cs-CZ')+' Kč'+((r.quantity||1)>1?' / ks':'')"></strong>
              <span class="se-offer-cta" x-text="o.price_czk ? 'Zobrazit nabídku ↗' : 'Ověřit cenu u prodejce ↗'"></span>
            </a>
          </template>
        </div>
      </div>
    </template>
    <div x-show="!catalogLoading && !catalogError && !matches.length" class="se-note">V ověřeném katalogu zatím nemáme ani jeden modul nebo ověřený paralelní bank, který projde kapacitou i limitem BMS.</div>
  </div>
</div>
