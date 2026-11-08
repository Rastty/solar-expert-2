# MPPT short-circuit current safety – 2026-11-07

## Why this is a P0 commercial & electrical fit gate

The MPPT Selector previously checked PV size (Wp), 12/24/48V battery, conservative cold Voc and starting Vmp, but **did not compare PV array short-circuit current (Isc)** to the regulator's manufacturer limit. Array Isc grows with the number of **parallel strings**, not the number of panels in series. A discounted MPPT with too-low input Isc is not a valid substitute for a compatible unit. "100/20" does **not** mean 20A maximum PV Isc: that second number is *battery charge current*, a different rating.

Victron warns that exceeding a regulator's published PV short-circuit-current maximum can damage the unit under reverse-array-polarity conditions. No in-house model may ignore this limit.

## Manufacturer-sourced MPPT catalog fields

| Exact catalog SKU | Manufacturer maximum PV short-circuit current (A) | Official current source |
| --- | ---: | --- |
| mppt-victron-100-20 | 20 | [Victron MPPT 75/10 to 100/20 specifications](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_75-10_up_to_100-20/en/technical-specifications.html) |
| mppt-victron-100-30 | 35 | [Victron 100/30 and 100/50](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html) |
| mppt-victron-100-50 | 60 | [Victron 100/30 and 100/50](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html) |
| mppt-victron-150-35 | 35 | [Victron 150/35 and 150/45](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_150-35__150-45/en/technical-specifications.html) |
| mppt-victron-150-70 | 50 | [Victron 150/70 and 250/100 VE.Can](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_150-70_up_to_250-100_VE.Can/en/technical-specifications.html) |
| mppt-victron-250-100 | 70 | [Victron 150/70 and 250/100 VE.Can](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_150-70_up_to_250-100_VE.Can/en/technical-specifications.html) |

The surviving in-stock **Victron BlueSolar 190Wp/12V** module is explicitly identified in the seller catalog as **SPM041903903** with **Voc 25.5V**, **Vmp 21.8V**, **Isc 9.17A** and **Imp 8.71A**. [Solar-Import's exact SKU listing](https://www.solar-import.cz/ramove-male/victron-energy-solarni-panel-190w-12v--monokrystalicky/) independently supports this current. The 555Wp DAH module is discontinued and remains ineligible for Builder recommendations; existing historical electrical data are not refreshed.

Both identical public/runtime JSON seeds now carry `max_pv_isc_a`, `max_pv_isc_source_url`, `max_pv_isc_verified_on` for each of the six MPPT SKUs, plus `isc_a=9.17` and its provenance on the active 190Wp panel. **The price/stock `verified_at` timestamps, retailer prices and private affiliate settings were not changed by this task.**

## Selector behaviour and testable scenarios

- `Isc_total_STC = Isc_one_panel_STC × parallel_string_count`. For series 2S, Isc per string stays at the module's Isc, but the PV string Voc doubles; parallel branches add current.
- Recommended independent MPPT must include a manufacturer verified `max_pv_isc_a`. Selection requires `arrayIsc <= max_pv_isc_a × 0.98` (additional conservative 2% guard, matching pre-existing Builder limits).
- The input form requires finite, positive panel Isc and positive integer series/parallel counts. Invalid/missing values produce no matches. This is a basic compatibility screen, **not an electrical installation guarantee**.
- Example: a 24V battery, 200Wp total array, one 49V Voc panel per string, **two parallel strings at 11A Isc each** produce 22A total. The **20A Isc SmartSolar 100/20 is excluded**; a 100/30 rated 35A can remain feasible if other conditions match.
- The existing 190Wp module configured as **2S2P** yields **760Wp** and **18.34A Isc**, below the 100/30 limit of 35A. Its 2S cold Voc stays below the tested 100V reserve. No 12V/24V/48V system recommendation is solely determined by price.
- Unknown panel Isc or missing independent MPPT max Isc **fails closed in the Builder**. Integrated inverter/chargers with incomplete separate PV current evidence remain a *different catalog qualification task* and must **not** be assigned the standalone charger Isc or inferred from their AC/battery current limits.

## Buyer handoff: published search intent to interactive checks

The existing high-intent guide `/jak-vybrat-mppt-regulator-pro-400w-panel/` now proposes a URL token `/mppt-kalkulacka/?scenario=mppt400`. On page load this prefills only the *publicly disclosed model*: 24V battery, 400Wp, Voc 49V, Vmp 40V, Isc 11A, 1S1P. The guide and tool warn this is **not a measured panel**; the visitor must replace values from their own datasheet.

Other URL parameters (including price, wattage, stock, merchant id) cannot override the editor-owned scenario. Merely opening the URL emits **no selector engagement, affiliate click or sale**. Only a real later user interaction may count. The original two click-to-use example presets still work.

## Tests and deployment limits

`node tests/mppt-isc-safety.test.js` covers exact documented six MPPT limits, real 190Wp Isc, 2P under/over current, missing-value fail-closed, excessive 2S Voc, source/runtime byte parity, 400W guide allowlist and no synthetic engagement. The required `Validate Solar Expert` workflow must run this along with old electrical engine and existing offer/SEO tests.

**No immediate production deploy**: this work is a stacked review branch on prior catalog and UX PRs. `dev` remains on its released v0.12.27 until [release safety PR #142](https://github.com/Rastty/solar-expert-2/pull/142) plus [database/media rollback acceptance #148](https://github.com/Rastty/solar-expert-2/issues/148) are independently satisfied and the catalog/monitor/UX PRs are approved in sequence.
