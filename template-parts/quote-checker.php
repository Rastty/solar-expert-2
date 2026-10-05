<div class="se-panel se-quote" x-data="solarExpertQuoteChecker()">
  <div class="se-kicker">Quote Checker</div>
  <h2>Prověřte nabídku dřív, než ji podepíšete</h2>
  <p class="se-muted">Zadejte základní parametry nabídky. Nástroj zkontroluje sizing a vytáhne místa, která stojí za ověření v datasheetu nebo u dodavatele.</p>

  <div class="se-formgrid">
    <div class="se-field"><label for="se-quote-daily-kwh">Denní spotřeba (kWh)</label><input id="se-quote-daily-kwh" class="se-input" type="number" min=".1" step=".1" x-model.number="dailyKwh"></div>
    <div class="se-field"><label for="se-quote-season">Sezóna</label><select id="se-quote-season" class="se-select" x-model="season"><option value="summer">hlavně léto</option><option value="three">jaro–podzim</option><option value="year">celoročně</option></select></div>
    <div class="se-field"><label for="se-quote-autonomy">Požadovaná autonomie</label><select id="se-quote-autonomy" class="se-select" x-model.number="autonomy"><option value=".5">½ dne</option><option value="1">1 den</option><option value="2">2 dny</option></select></div>
    <div class="se-field"><label for="se-quote-load-w">Nejvyšší souběžný odběr (W)</label><input id="se-quote-load-w" class="se-input" type="number" min="0" step="100" x-model.number="loadW"></div>
    <div class="se-field"><label for="se-quote-surge-w">Rozběhová špička spotřebičů (W)</label><input id="se-quote-surge-w" class="se-input" type="number" min="0" step="100" x-model.number="surgeNeedW"></div>
    <div class="se-field"><label for="se-quote-panel-wp">Panely v nabídce celkem (Wp)</label><input id="se-quote-panel-wp" class="se-input" type="number" min="0" step="50" x-model.number="panelWp"></div>
    <div class="se-field"><label for="se-quote-battery-kwh">Baterie v nabídce (kWh nominálně)</label><input id="se-quote-battery-kwh" class="se-input" type="number" min="0" step=".1" x-model.number="batteryKwh"></div>
    <div class="se-field"><label for="se-quote-battery-bms-a">Max. trvalý vybíjecí proud baterie/BMS (A, volitelné)</label><input id="se-quote-battery-bms-a" class="se-input" type="number" min="0" step="1" x-model.number="batteryBmsA"></div>
    <div class="se-field"><label for="se-quote-inverter-w">Měnič – trvalý výkon (W)</label><input id="se-quote-inverter-w" class="se-input" type="number" min="0" step="100" x-model.number="inverterW"></div>
    <div class="se-field"><label for="se-quote-inverter-peak-w">Měnič – špičkový výkon (W)</label><input id="se-quote-inverter-peak-w" class="se-input" type="number" min="0" step="100" x-model.number="inverterPeakW"></div>
    <div class="se-field"><label for="se-quote-system-voltage">Systémové napětí</label><select id="se-quote-system-voltage" class="se-select" x-model.number="systemVoltage"><option value="12">12 V</option><option value="24">24 V</option><option value="48">48 V</option></select></div>
    <div class="se-field"><label for="se-quote-price">Cena nabídky (Kč, volitelné)</label><input id="se-quote-price" class="se-input" type="number" min="0" step="1000" x-model.number="quotePrice"></div>
  </div>

  <div class="se-actions"><button class="se-btn se-btn-primary" @click="evaluate()">Prověřit nabídku →</button><button class="se-btn" x-show="result || inputError" @click="reset()">Vymazat výsledek</button></div>
  <div class="se-note se-note-error" x-show="inputError" x-cloak style="margin-top:14px" role="alert"><span x-text="inputError"></span></div>

  <div x-show="result" x-cloak style="margin-top:22px">
    <div class="se-quote-summary" :class="result?.status">
      <strong x-text="result?.status==='pass'?'Základní sizing vypadá dobře':(result?.status==='warn'?'Nabídka potřebuje několik kontrol':'Nabídka má zásadní rozpor')"></strong>
      <span>Orientační cíle: <b x-text="result?.recommendedPanelWp"></b> Wp · <b x-text="result?.recommendedBatteryKwh"></b> kWh baterie · měnič ≥ <b x-text="result?.recommendedInverterW"></b> W · typicky <b x-text="result?.recommendedVoltage"></b> V · BMS orientačně ≥ <b x-text="result?.recommendedBmsA"></b> A.</span>
    </div>
    <div class="se-checks">
      <template x-for="c in checks" :key="c.key"><div class="se-check" :class="c.status"><div><strong x-text="c.label"></strong><p x-text="c.message"></p></div><span x-text="c.status==='pass'?'OK':(c.status==='fail'?'PROBLÉM':(c.status==='warn'?'OVĚŘIT':'INFO'))"></span></div></template>
    </div>
    <div class="se-note">Quote Checker není revize projektu ani elektroinstalační návrh. Před objednávkou stále ověřte přesné datasheety, jištění, kabeláž, Voc při nízké teplotě a kompatibilitu BMS ↔ měnič.</div>
    <div class="se-note" style="margin-top:14px">
      <strong>Řešíte domovní FVE na klíč?</strong> Výsledek výše použijte jako kontrolní seznam a porovnejte původní nabídku ještě s druhým dodavatelem.
      <div class="se-actions" style="margin-top:12px">
        <a class="se-btn se-btn-primary" target="_blank"
           href="https://www.eon.cz/domacnosti/usporne-technologie/solar/"
           data-se-lead-id="eon-solar"
           data-se-placement="quote_checker_result"
           data-se-fallback="https://www.eon.cz/domacnosti/usporne-technologie/solar/"
           rel="nofollow noopener">Získat druhou nabídku FVE →</a>
        <a class="se-btn" href="/solarni-sestava-na-chatu/">Spočítat vlastní variantu →</a>
      </div>
      <small>Partnerský odkaz může Solar Expertu přinést provizi. Výsledek Quote Checkeru ani technické hodnocení tím není ovlivněno.</small>
    </div>
  </div>
</div>
