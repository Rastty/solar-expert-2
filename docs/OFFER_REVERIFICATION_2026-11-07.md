# Evidence-backed retailer offer refresh — 2026-11-07

Source: 25 exact product pages checked from the *retailer's own domain* on 2026-11-07; seller page showed matching product name/model, a VAT-inclusive price in CZK, and the explicit availability label. No eHub tracking or checkout endpoint was requested. The snapshots are observations, not a purchase or guaranteed stock quote.

## Measured scope

- Product offers: **48**. Previously stale by 30-day window: **45**; after these edits **20** remain stale and **28** are within 30 days (25 newly verified + 3 dated 2026-10-13).
- **25 verified offer rows / 13 products**. Both `data/product-seed.json` and runtime `assets/data/product-seed.json` stay byte-identical.
- **3 changed merchant prices**: Solar-Import MPPT 100/20 2,091 → 2,098 Kč; Solar-Import MPPT 100/30 2,984 → 2,995 Kč; Solar-Import REP2000-24 6,950 → 4,990 Kč.
- **2 stock changes**: GOOWEI CNLFP200-12.8 at Battery.cz and Solar-Import.cz changed `in_stock` → `on_request`. Its product-level primary state is also `on_request`, and its tier is demoted from `best` → `reference` so repo integrity can correctly exclude it from active ready-to-buy recommendations.
- Catalog-wide `verifiedAt` deliberately remains **2026-10-07** because the entire catalog was not reverified. Bundle-deal prices/dates are unchanged.
- Do not infer new affiliate clicks, paid conversions, or live release from this source-only update.

## Source-page evidence by offer

| Product ID | Retailer | Price incl. VAT (Kč) | Availability | Old price | Old availability | Source |
|---|---|---:|---|---:|---|---|
| `battery-goowei-12-100` | battery-cz | 8650 | `in_stock` | 8650 | `in_stock` | [Exact product](https://www.battery.cz/goowei-energy-trakcni-baterie--lifepo4--cnlfp100-12-8--100ah--12-8v/) |
| `battery-goowei-12-100` | solar-import-cz | 8650 | `in_stock` | 8650 | `in_stock` | [Exact product](https://www.solar-import.cz/goowei-energy-2/goowei-energy-trakcni-baterie--lifepo4--cnlfp100-12-8--100ah--12-8v/) |
| `battery-goowei-12-200` | battery-cz | 14690 | `on_request` | 14690 | `in_stock` | [Exact product](https://www.battery.cz/goowei-energy-trakcni-baterie--lifepo4--cnlfp200-12-8--200ah--12-8v/) |
| `battery-goowei-12-200` | solar-import-cz | 14690 | `on_request` | 14690 | `in_stock` | [Exact product](https://www.solar-import.cz/goowei-energy-2/goowei-energy-trakcni-baterie--lifepo4--cnlfp200-12-8--200ah--12-8v/) |
| `battery-goowei-24-50` | battery-cz | 8650 | `in_stock` | 8650 | `in_stock` | [Exact product](https://www.battery.cz/goowei-energy-trakcni-baterie--lifepo4--cnlfp50-25-6--50ah--25-6v/) |
| `battery-goowei-24-50` | solar-import-cz | 8650 | `in_stock` | 8650 | `in_stock` | [Exact product](https://www.solar-import.cz/goowei-energy-2/goowei-energy-trakcni-baterie--lifepo4--cnlfp50-25-6--50ah--25-6v/) |
| `battery-goowei-24-100` | battery-cz | 14690 | `in_stock` | 14690 | `in_stock` | [Exact product](https://www.battery.cz/goowei-energy-trakcni-baterie--lifepo4--cnlfp100-25-6--100ah--25-6v/) |
| `battery-goowei-24-100` | solar-import-cz | 14690 | `in_stock` | 14690 | `in_stock` | [Exact product](https://www.solar-import.cz/goowei-energy-2/goowei-energy-trakcni-baterie--lifepo4--cnlfp100-25-6--100ah--25-6v/) |
| `battery-pylontech-us5000` | battery-cz | 22900 | `in_stock` | 22900 | `in_stock` | [Exact product](https://www.battery.cz/pylontech-us5000-lithiova-baterie-48v-4-8kwh/) |
| `battery-seplos-pusung-48` | battery-cz | 20990 | `in_stock` | 20990 | `in_stock` | [Exact product](https://www.battery.cz/seplos-lithiova-baterie-pusung-s-48v-5kwh--bms-a-can-komunikace/) |
| `battery-seplos-pusung-48` | solar-import-cz | 21834 | `in_stock` | 21834 | `in_stock` | [Exact product](https://www.solar-import.cz/seplos/seplos-lithiova-baterie-pusung-s-48v-5kwh--bms-a-can-komunikace/) |
| `panel-victron-190` | solar-import-cz | 2251 | `in_stock` | 2251 | `in_stock` | [Exact product](https://www.solar-import.cz/ramove-male/victron-energy-solarni-panel-190w-12v--monokrystalicky/) |
| `panel-victron-190` | battery-cz | 2496 | `in_stock` | 2496 | `in_stock` | [Exact product](https://www.battery.cz/victron-energy-solarni-panel-190w-12v--monokrystalicky/) |
| `mppt-victron-100-20` | solar-import-cz | 2098 | `in_stock` | 2091 | `in_stock` | [Exact product](https://www.solar-import.cz/regulatory/victron-energy-solarni-regulator-smartsolar-mppt-100-20--12-24-48v--20a/) |
| `mppt-victron-100-20` | battery-cz | 2091 | `in_stock` | 2091 | `in_stock` | [Exact product](https://www.battery.cz/victron-solarni-regulator-smartsolar-mppt-100-20--12-24v--20a/) |
| `mppt-victron-100-30` | solar-import-cz | 2995 | `in_stock` | 2984 | `in_stock` | [Exact product](https://www.solar-import.cz/regulatory/victron-energy-solarni-regulator-smartsolar-mppt-100-30--12-24v--30a/) |
| `mppt-victron-100-30` | battery-cz | 2984 | `in_stock` | 2984 | `in_stock` | [Exact product](https://www.battery.cz/victron-solarni-regulator-smartsolar-mppt-100-30--12-24v--30a/) |
| `inverter-victron-24-1200` | solar-import-cz | 7431 | `in_stock` | 7431 | `in_stock` | [Exact product](https://www.solar-import.cz/off-grid/victron-energy-menic-napeti-sinus-phoenix-ve-direct-1200va-24v/) |
| `inverter-victron-24-1200` | battery-cz | 7431 | `in_stock` | 7431 | `in_stock` | [Exact product](https://www.battery.cz/menic-napeti-sinus-victron-energy-phoenix-ve-direct-1200va-24v/) |
| `inverter-growatt-48-3500` | solar-import-cz | 11990 | `in_stock` | 11990 | `in_stock` | [Exact product](https://www.solar-import.cz/hybridni/growatt-spf-3500es-menic-3-5kw-48v/) |
| `inverter-growatt-48-3500` | battery-cz | 11990 | `in_stock` | 11990 | `in_stock` | [Exact product](https://www.battery.cz/growatt-spf-3500es-menic-3-5kw-48v/) |
| `inverter-growatt-48-6000` | solar-import-cz | 13490 | `in_stock` | 13490 | `in_stock` | [Exact product](https://www.solar-import.cz/growatt/growatt-spf-6000-es-plus-menic-6kw-48v/) |
| `inverter-growatt-48-6000` | battery-cz | 13490 | `in_stock` | 13490 | `in_stock` | [Exact product](https://www.battery.cz/growatt-spf-6000-es-plus-menic-6kw-48v/) |
| `inverter-rogerele-rep2000-24` | battery-cz | 4990 | `in_stock` | 4990 | `in_stock` | [Exact product](https://www.battery.cz/rogerele-sinusovy-menic-napeti-rep2000-24--2000w/) |
| `inverter-rogerele-rep2000-24` | solar-import-cz | 4990 | `in_stock` | 6950 | `in_stock` | [Exact product](https://www.solar-import.cz/off-grid/rogerele-sinusovy-menic-napeti-rep2000-24--2000w/) |

## Required release checks

1. Run catalog parity, matcher, seller attribution, source-host allowlist and seller-page freshness tests; no synthetic affiliate clicks.
2. Verify the live catalog JSON and visible offer cards on Builder, Battery and MPPT Selector after approved release. A source commit is **not** a live WordPress update.
3. Reverify the remaining 20 stale product offers and separately all bundle-deal offers; leave unverified prices suppressed.
4. Before merging this PR into `dev`, handle release safety PR #142, current-head independent review, a verified rollback path, green current CI and public SHA/health readback.

Issue: https://github.com/Rastty/solar-expert-2/issues/145
