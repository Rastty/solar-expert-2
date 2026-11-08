# Evidence-backed retailer offer refresh — 2026-11-07

First cohort: 25 exact product pages checked from the *retailer's own domain* on 2026-11-07; seller page showed matching product name/model, a VAT-inclusive price in CZK, and the explicit availability label. No eHub tracking or checkout endpoint was requested. The snapshots are observations, not a purchase or guaranteed stock quote.

## Measured scope

- Product offers: **48**. Originally 45 were stale; **first cohort** refreshed 25 and left 20 stale. See the second cohort below: the **final combined source branch** has 0 stale product offers as of 2026-11-07.
- **25 verified offer rows / 13 products**. Both `data/product-seed.json` and runtime `assets/data/product-seed.json` stay byte-identical.
- **3 changed merchant prices**: Solar-Import MPPT 100/20 2,091 → 2,098 Kč; Solar-Import MPPT 100/30 2,984 → 2,995 Kč; Solar-Import REP2000-24 6,950 → 4,990 Kč.
- **2 stock changes**: GOOWEI CNLFP200-12.8 at Battery.cz and Solar-Import.cz changed `in_stock` → `on_request`. Its product-level primary state is also `on_request`, and its tier is demoted from `best` → `reference` so repo integrity can correctly exclude it from active ready-to-buy recommendations.
- Catalog-wide `verifiedAt` deliberately remains **2026-10-07** because the entire catalog was not reverified. At the **first-cohort stage**, bundle-deal prices/dates were unchanged; the second cohort below subsequently verified all four.
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

## First-cohort release checklist (historical; see completed cohorts below)

1. Run catalog parity, matcher, seller attribution, source-host allowlist and seller-page freshness tests; no synthetic affiliate clicks.
2. Verify the live catalog JSON and visible offer cards on Builder, Battery and MPPT Selector after approved release. A source commit is **not** a live WordPress update.
3. Reverify the remaining 20 stale product offers and separately all bundle-deal offers; leave unverified prices suppressed.
4. Before merging this PR into `dev`, handle release safety PR #142, current-head independent review, a verified rollback path, green current CI and public SHA/health readback.

Issue: https://github.com/Rastty/solar-expert-2/issues/145

## Follow-up completion: 20 product offers + 4 exact bundle listings (2026-11-07)

Latest observed merchant-owned pages were checked on 2026-11-07 for model/SKU, public CZK price incl. VAT and explicit availability. No eHUB click/redirect, checkout, simulated visitor session or WordPress write was used. This supplements, not replaces, the first 25-offer batch above.

- **48/48 product offer rows are inside the existing 30-day freshness window as of 2026-11-07:** 45 first/second-cohort listings checked today + 3 VSelektro independently rechecked on their exact vendor product pages in the third cohort documented below.
- Both source and runtime JSON catalog mirrors contain the same 24 products, 48 offers and 2 bundle deals / 4 exact seller offers. The global `verifiedAt` stays 2026-10-07 since this is not an all-fields, all-merchants inventory refresh.
- The separate **four bundle-deal retailer listings** were source-checked at 32,990 Kč per listing and marked `2026-11-07`. Bundle-stock evidence is independent of whether the standalone battery is available.
- New stock alert: standalone **SEPLOS POLO-W** is `on_request` at both Battery.cz and Solar-Import.cz, so its catalog tier changes from `premium` to `reference`. Separate exact Polo-W + Growatt bundles are publicly `in_stock` (2 units), not a basis for pretending standalone units can be purchased.
- New compatibility alert: **KOSUN 48V/3000W** has `lifepo4_charge_supported=false`: both merchants explicitly say its integrated charger **is not for LiFePO₄**. Marked `reference`, and `product-matcher.explain` now excludes it from all LiFePO₄ inverter recommendations, in addition to the existing bundle compatibility guard. The different KOSUN 12V/1000W SKU explicitly allows LiFePO₄ charging and stays separate.
- Additional genuine price corrections: Solar-Import Victron MPPT 100/50 **3,899 → 4,305 Kč**, Victron MPPT 150/35 **4,291 → 4,305 Kč**, Victron MPPT 250/100 **14,246 → 14,294 Kč**; Battery.cz KOSUN 12V/1000W **6,580 → 4,990 Kč**.
- Updated the Pylontech US5000 Solar-Import product source from an outdated `/pylontech/` path to the confirmed exact `/baterie/` product page.
- ROGERELE REP1500-24 stock is now publicly `in_stock` at Battery.cz, but remains `reference` pending separate qualitative tier review (availability alone never auto-promotes a recommendation).

### Second-batch exact source evidence (20 retailer listings)

| Product | Merchant | Current CZK incl. VAT | Public availability | Previously recorded CZK | Former stock | Exact merchant-owned source |
|---|---|---:|---|---:|---|---|
| `battery-pylontech-us5000` | solar-import-cz | 22900 | `in_stock` | 22900 | `in_stock` | [Seller SKU](https://www.solar-import.cz/baterie/pylontech-us5000-lithiova-baterie-48v-4-8kwh/) |
| `battery-seplos-polo-w-48` | battery-cz | 20990 | `on_request` | 20990 | `in_stock` | [Seller SKU](https://www.battery.cz/seplos-lithiova-nastenna-baterie-polo-w--48v-5kwh-s-bms/) |
| `battery-seplos-polo-w-48` | solar-import-cz | 20990 | `on_request` | 20990 | `in_stock` | [Seller SKU](https://www.solar-import.cz/seplos/seplos-lithiova-nastenna-baterie-polo-w--48v-5kwh-s-bms/) |
| `mppt-victron-100-50` | solar-import-cz | 4305 | `in_stock` | 3899 | `in_stock` | [Seller SKU](https://www.solar-import.cz/regulatory/victron-energy-solarni-regulator-smartsolar-mppt-100-50--12-24v--50a/) |
| `mppt-victron-100-50` | battery-cz | 4305 | `in_stock` | 4305 | `in_stock` | [Seller SKU](https://www.battery.cz/victron-solarni-regulator-smartsolar-mppt-100-50--12-24v--50a/) |
| `mppt-victron-150-35` | solar-import-cz | 4305 | `in_stock` | 4291 | `in_stock` | [Seller SKU](https://www.solar-import.cz/regulatory/victron-energy-solarni-regulator-smartsolar-mppt-150-35--12-24-48v--35a/) |
| `mppt-victron-150-35` | battery-cz | 4291 | `in_stock` | 4291 | `in_stock` | [Seller SKU](https://www.battery.cz/victron-solarni-regulator-smartsolar-mppt-150-35--12-24-48v--35a/) |
| `mppt-victron-150-70` | solar-import-cz | 9650 | `in_stock` | 9650 | `in_stock` | [Seller SKU](https://www.solar-import.cz/regulatory/victron-energy-solarni-regulator-smartsolar-mppt-150-70-tr-ve-can--12-24-48v--70a/) |
| `mppt-victron-150-70` | battery-cz | 9650 | `in_stock` | 9650 | `in_stock` | [Seller SKU](https://www.battery.cz/victron-solarni-regulator-smartsolar-mppt-150-70-tr-ve-can--12-24-48v--70a/) |
| `mppt-victron-250-100` | solar-import-cz | 14294 | `in_stock` | 14246 | `in_stock` | [Seller SKU](https://www.solar-import.cz/regulatory/victron-energy-solarni-regulator-smartsolar-mppt-250-100-tr-ve-can--12-24-48v--100a/) |
| `mppt-victron-250-100` | battery-cz | 14246 | `in_stock` | 14246 | `in_stock` | [Seller SKU](https://www.battery.cz/victron-solarni-regulator-smartsolar-mppt-250-100-tr-ve-can--12-24-48v--100a/) |
| `inverter-victron-48-1200` | solar-import-cz | 7623 | `usually_in_stock` | 7623 | `usually_in_stock` | [Seller SKU](https://www.solar-import.cz/victron-energy-3/victron-energy-menic-napeti-sinus-ve-direct-1200va-48v/) |
| `inverter-victron-48-1200` | battery-cz | 7623 | `usually_in_stock` | 7623 | `usually_in_stock` | [Seller SKU](https://www.battery.cz/victron-energy-menic-napeti-sinus-ve-direct-1200va-48v/) |
| `inverter-kosun-48-3000` | solar-import-cz | 9563 | `in_stock` | 9563 | `in_stock` | [Seller SKU](https://www.solar-import.cz/hybridni/kosun-menic-napeti-s-nabijeckou-dc48v-ac230v--3000w/) |
| `inverter-kosun-48-3000` | battery-cz | 7990 | `in_stock` | 7990 | `in_stock` | [Seller SKU](https://www.battery.cz/kosun-menic-napeti-s-nabijeckou-dc48v-ac230v--3000w/) |
| `inverter-kosun-12-1000` | solar-import-cz | 6580 | `in_stock` | 6580 | `in_stock` | [Seller SKU](https://www.solar-import.cz/kosun-menic-napeti-s-nabijeckou-a-mppt-regulatorem-dc12v-ac230v--1000w/) |
| `inverter-kosun-12-1000` | battery-cz | 4990 | `in_stock` | 6580 | `in_stock` | [Seller SKU](https://www.battery.cz/kosun-menic-napeti-s-nabijeckou-a-mppt-regulatorem-dc12v-ac230v--1000w/) |
| `inverter-rogerele-rep1000-12` | solar-import-cz | 2890 | `in_stock` | 2890 | `in_stock` | [Seller SKU](https://www.solar-import.cz/off-grid/rogerele-sinusovy-menic-napeti-rep1000-12--1000w/) |
| `inverter-rogerele-rep1000-12` | battery-cz | 2890 | `in_stock` | 2890 | `in_stock` | [Seller SKU](https://www.battery.cz/rogerele-sinusovy-menic-napeti-rep1000-12--1000w/) |
| `inverter-rogerele-rep1500-24` | battery-cz | 4190 | `in_stock` | 4190 | `on_request` | [Seller SKU](https://www.battery.cz/rogerele-sinusovy-menic-napeti-rep1500-24--1500w/) |

### Bundle seller receipts (four listings)

| Set | Merchant | CZK incl. VAT | Availability | Exact seller page |
|---|---|---:|---|---|
| `deal-battery-pusung-growatt6000` | battery-cz | 32990 | `in_stock` | [Exact offer](https://www.battery.cz/set-lithiova-baterie-seplos-pusung-s--5kwh--menic-growatt-spf-6000es-plus--6000w-48v/) |
| `deal-battery-pusung-growatt6000` | solar-import-cz | 32990 | `in_stock` | [Exact offer](https://www.solar-import.cz/solarni-sestavy-ac/set-lithiova-baterie-seplos-pusung-s--5kwh--menic-growatt-spf-6000es-plus--6000w-48v/) |
| `deal-battery-polo-w-growatt6000` | battery-cz | 32990 | `in_stock` | [Exact offer](https://www.battery.cz/set-lithiova-baterie-seplos-polo-w--5-12kwh--menic-growatt-spf-6000es-plus--6000w-48v/) |
| `deal-battery-polo-w-growatt6000` | solar-import-cz | 32990 | `in_stock` | [Exact offer](https://www.solar-import.cz/solarni-sestavy-ac/set-lithiova-baterie-seplos-polo-w--5-12kwh--menic-growatt-spf-6000es-plus--6000w-48v/) |

### Release and maintenance gates

1. The PR branch is **code only**; do not claim public delivery, increased affiliate earnings or live commission attribution without guarded production deploy and real first-party outcome evidence.
2. Confirm CI tests of the source/runtime mirror, all 45 dated newly reviewed product entries, 4 dated bundle offers, disabled on-request stock, and fail-closed charger chemistry. Keep historic engine fixtures isolated from the live-source snapshot.
3. Resolve [release safety PR #142](https://github.com/Rastty/solar-expert-2/pull/142), independently approve its **current** head and verify persisted rollback availability before an authorized merge/release; then validate exact public SHA and live Buyer/Selector readback.
4. **Completed later that day:** all 3 VSelektro listings were rechecked against independent exact seller pages. See third cohort and dated source evidence below. No affiliate endpoint clicks.

### Changed source fields in second batch

- `battery-pylontech-us5000@solar-import-cz`: price 22900 → 22900; stock `in_stock` → `in_stock`; exact source URL corrected
- `battery-seplos-polo-w-48@battery-cz`: price 20990 → 20990; stock `in_stock` → `on_request`
- `battery-seplos-polo-w-48@solar-import-cz`: price 20990 → 20990; stock `in_stock` → `on_request`
- `mppt-victron-100-50@solar-import-cz`: price 3899 → 4305; stock `in_stock` → `in_stock`
- `mppt-victron-150-35@solar-import-cz`: price 4291 → 4305; stock `in_stock` → `in_stock`
- `mppt-victron-250-100@solar-import-cz`: price 14246 → 14294; stock `in_stock` → `in_stock`
- `inverter-kosun-12-1000@battery-cz`: price 6580 → 4990; stock `in_stock` → `in_stock`
- `inverter-rogerele-rep1500-24@battery-cz`: price 4190 → 4190; stock `on_request` → `in_stock`

## Third cohort: independent VSelektro MPPT offers (2026-11-07)

Source ownership: **VS ELEKTRO PLUS s.r.o.**, an independent retail operator, not a second Efteria storefront. Seller-owned SKU pages were directly checked on **2026-11-07**; each product name/MPPT model, VAT-inclusive CZK price and **"Skladem"** stock label were individually verified. Affiliate redirect links were **not** followed. These three offer rows were last verified 2026-10-13; this **actual recheck** justifies moving their `verified_at` to 2026-11-07 without changing the three unchanged prices.

| SKU | Retailer | Public CZK incl. VAT | Stock | Date updated | Exact primary product evidence |
|---|---|---:|---|---|---|
| `mppt-victron-100-20` | vselektro-eu | 2,404 Kč | Skladem | 2026-10-13 → 2026-11-07 | [Victron MPPT SmartSolar 100V/20A](https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/) |
| `mppt-victron-100-30` | vselektro-eu | 3,444 Kč | Skladem | 2026-10-13 → 2026-11-07 | [Victron MPPT SmartSolar 100V/30A](https://www.vselektro.eu/solarni-regulator-victron-energy-smartsolar-30a/) |
| `mppt-victron-100-50` | vselektro-eu | 4,946 Kč | Skladem | 2026-10-13 → 2026-11-07 | [Victron MPPT SmartSolar 100V/50A](https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/) |

**Final measured source state:** 24 products, **48/48 individually verified product-level merchant offers**, all `verified_at=2026-11-07`, plus 2 sets with 4 individually verified exact merchant listings (`verified_at=2026-11-07`). Both catalog JSON mirrors are identical. As-of November 7, **52/52 offer entries are fresh by the engine's 30-day date rule**; this is **not** a guarantee that seller stock/price will remain unchanged or that public WordPress runs this branch. New verified prices become stale **2026-12-09 00:00 UTC** under the existing `ageDays > 30` rule if no further retailer verification is performed. The global `verifiedAt` stays **2026-10-07** because global metadata was not falsely refreshed.

See also the separately proposed [automatic price-evidence watcher PR #147](https://github.com/Rastty/solar-expert-2/pull/147). It reports date-only freshness, not live current prices. Pending independent release approval / verified rollback and authorized WordPress deploy remain separate required gates.
