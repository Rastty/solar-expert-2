# Solar Expert GSC baseline

Source: Prometheus read-only Search Console capture `PROMETHEUS-GSC-SITE-OPPORTUNITIES-SOLAR-EXPERT-CZ-01.json` from repository `Rastty/prometheus-growth-os`.

Capture period: **2026-04-23 → 2026-07-21** (90 days, final GSC data).

Portfolio summary:
- measured URLs: 50
- clicks: 15
- impressions: 1,713
- heuristic click gap: 17
- external writes: 0

## Highest-priority solar pages from the captured query mix

| URL | Clicks | Impressions | Avg. position | Main opportunity |
| --- | ---: | ---: | ---: | --- |
| `/fve-panely-na-strechu/` | 0 | 180 | 61.66 | Broad roof intent; historically weak rank, monitor rather than over-optimize |
| `/jak-zapojit-solarni-panely/` | 0 | 157 | 39.83 | Series/parallel wiring + mixed mounting intent |
| `/fotovoltaika-vykon-na-m2/` | 0 | 122 | 24.97 | Strong near-win for “fotovoltaika výkon na m2” / “výkon solárních panelů na m2” |
| `/co-je-1-kwp/` | 0 | 104 | 45.25 | Wp/kWp/kWh education; notable “jednotka wp” query |
| `/fotovoltaika-na-eternitovou-strechu/` | 0 | 49 | 12.63 | Strongest historical near-page-1 solar opportunity; merits next focused review |
| `/nataceni-solarnich-panelu-za-sluncem/` | 4 | 77 | 18.26 | Existing traffic; protect and improve only with careful intent-preserving update |

## Query evidence used in current rewrites

### `/fotovoltaika-vykon-na-m2/`
- “fotovoltaické panely výkon m2” — 59 impressions, avg. position 22.93
- “výkon solárních panelů na m2” — 31 impressions, avg. position 26.42
- “fotovoltaika výkon na m2” — 15 impressions, avg. position 19.4

### `/jak-zapojit-solarni-panely/`
- “fotovoltaické panely-zapojení” — avg. position 21.5
- “jak zapojit fotovoltaické panely” — avg. position 25
- query mix also includes physical mounting intent, so content explicitly separates electrical wiring from mechanical mounting

### `/co-je-1-kwp/`
- “jednotka wp” — 23 impressions, avg. position 26.09
- “co je kwp” / “co je to kwp”
- “1 kwp solar panel” — avg. position 24.67

## Rule for future work

Use this baseline only as historical evidence. New production changes should prefer fresher Prometheus GSC captures when available. Preserve URLs with existing clicks or meaningful impressions; consolidate only where duplicate intent is evidenced and redirect targets are stronger.

## Fresh Prometheus refresh — 2026-10-05

Source: read-only Prometheus workflow `Prometheus Solar Expert GSC refresh`, run `37320112710`. No Search Console or production writes.

Fresh final Search Console data:
- 90 days: **111 measured page rows, 14 clicks, 3,284 impressions**
- 28 days: **80 measured page rows, 4 clicks, 908 impressions**

### Current solar near-wins

| URL | 90d clicks | 90d impressions | 90d avg. position | 28d impressions | 28d avg. position | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/kolik-panelu-je-potreba-na-jeden-string/` | 1 | 85 | 10.02 | 30 | 9.90 | P1 rewrite + MPPT internal links |
| `/fotovoltaika-na-eternitovou-strechu/` | 0 | 53 | 10.64 | 18 | 9.28 | P1 rewrite; improve CTR + safety/intent |
| `/nataceni-solarnich-panelu-za-sluncem/` | 1 | 56 | 8.46 | 14 | 4.21 | protect; no rewrite now |
| `/jak-zapojit-solarni-panely/` | 0 | 65 | 47.60 | 14 | 37.57 | rewritten from observed query intent; monitor |
| `/co-je-1-kwp/` | 0 | 56 | 39.71 | 7 | 43.86 | rewritten from observed query intent; monitor |

Other fresh signal: `/velikost-rozmery-a-hmotnost-solarnich-panelu/` has 42 impressions in the last 28 days at average position 33.4; its rewrite is already deployed in the rescue batch.

### URL inspection snapshot

- homepage: **PASS / Submitted and indexed**
- `/jak-zapojit-solarni-panely/`: **PASS / Submitted and indexed**
- `/co-je-1-kwp/`: **PASS / Submitted and indexed**
- `/fve-panely-na-strechu/`: **PASS / Submitted and indexed**
- `/fotovoltaika-na-eternitovou-strechu/`: **PASS / Submitted and indexed**
- `/fotovoltaika-vykon-na-m2/`: **Crawled – currently not indexed**; canonical correct
- newly created tool pages (`solarni-sestava-na-chatu`, selectors, Quote Checker): **URL unknown to Google** at capture time, consistent with being newly published. Sitewide footer/internal links were strengthened; monitor before taking further indexing action.

The fresh refresh supersedes the historical snapshot for prioritization; the historical section remains useful for trend/context.

### Combined FVE + heat-pump decision page

Fresh 90-day GSC evidence for `/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/`: **18 impressions, average position 14.22, 0 clicks**. Query mix includes `fotovoltaika s tepelným čerpadlem`, `kolik stojí fotovoltaika` and `kolik stojí solární panel`. Decision: preserve the existing URL, rewrite it as a combined-system cost/sizing page, route users to Builder + Quote Checker, and use the bounded `eon-heat-pump` lead CTA.

### Heat-pump boundary P1

Fresh 90-day GSC evidence for `/umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda/`: **95 impressions, average position 16.29, 0 clicks**; last 28 days: **38 impressions, average position 15.03**. Main disclosed query: `umístění tepelného čerpadla od hranice pozemku souseda` with 61 impressions. Decision: preserve URL, replace generic content with current October 2026 guidance based on the MMR April 2026 methodology and applicable noise rules, and retain bounded E.ON lead monetization.

Fresh 28-day `/castecne-zastineni-a-solarni-panely/`: **8 impressions, average position 5.0, 0 clicks**. Decision: protect ranking; adjust title/meta only, no aggressive body rewrite.

### Cleaning cannibalization cleanup

Fresh GSC shows two competing cleaning URLs: `/cisteni-solarnich-panelu-proc-kdy-jak/` with **27 impressions / avg. position 55.19** over 90 days and `/jak-vycistit-solarni-panely-pruvodce-cistenim-solaru/` with **22 impressions / avg. position 56.23**. Both target `čištění solárních panelů`. Decision: keep the first URL as canonical managed guide, rewrite it comprehensively, and 301 the second URL into it.

### Samsung review near-win

Fresh 28-day query evidence: `tepelné čerpadlo Samsung recenze` has **11 impressions at average position 10.45**. The legacy 2023 article contained obsolete UK RHI guidance and stale product/cost claims. Decision: preserve the indexed URL but replace the body with a 2026 technical buyer guide based on current Samsung EHS R290 documentation, explicit model-condition caveats and an owned-first comparison funnel.

### Overheating / cooling protection decision

Fresh near-win data: `/proc-se-solarni-panely-neprehrivaji/` has **14 impressions / avg. position 7.07** over 90 days; `/chlazeni-fotovoltaickych-panelu/` has **14 impressions / avg. position 7.14 and 1 click**. Historical query evidence does not establish the same intent. Decision: do **not** consolidate. Protect both URLs; apply title/meta refinement only to the zero-click overheating page and leave the clicked cooling page body untouched.

### Battery category hub

Fresh 90-day GSC near-win: `/category/baterie/` has **10 impressions at average position 18.5**. Decision: preserve the indexed category URL, replace the generic archive presentation with a battery decision hub, route users into Battery Selector, keep the article archive below it, add dedicated title/meta and CollectionPage schema, and strengthen discovery with a sitewide footer link.

### Annual-output near-win and size-guide cannibalization

Fresh query-level GSC evidence:
- `/kolik-vyrobi-fotovoltaika-za-rok/` receives `kolik vyrobí fotovoltaika za rok` at **6 impressions / avg. position 15.17**; the same query also leaks to the hourly-output URL at **5 impressions / avg. position 18.0**.
- `fotovoltaické panely-rozměry` is split between `/velikost-rozmery-a-hmotnost-solarnich-panelu/` (**6 impressions / avg. position 20.0**) and `/kompletni-pruvodce-velikosti-solarnich-panelu/` (**5 impressions / avg. position 20.8**).

Decision:
- preserve and rewrite the dedicated annual-output URL around kWp × locality-specific yield from PVGIS;
- cross-link hourly ↔ annual output so the intents are explicit;
- consolidate the stale duplicate size guide with a 301 into the stronger managed dimensions/weight page.

### Heat-pump vs electric-boiler decision near-win

Fresh query-level evidence for `/tepelne-cerpadlo-nebo-elektrokotel/`:
- `fotovoltaické panely a elektrokotel` — **8 impressions / avg. position 15.5**;
- `elektrokotel fotovoltaika` — **6 impressions / avg. position 22.83**.

The legacy article contained stale universal claims about 3× lower operating cost, backup heating and permitting/dotations. Decision: preserve the indexed URL, replace it with a decision guide based on annual heat demand and seasonal performance, explicitly cover FVE + electric boiler vs FVE + heat pump, and retain bounded E.ON lead monetization.

### Best heat-pumps query near-win

Fresh query-level evidence for `/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/`:
- `nejlepší tepelná čerpadla` — **10 impressions / avg. position 23.7**;
- `nejlepší tepelné čerpadlo vzduch - voda` — **5 impressions / avg. position 17.0**;
- `nejlepší tepelná čerpadla vzduch/voda` — **5 impressions / avg. position 21.6**;
- `nejspolehlivější tepelná čerpadla` — **4 impressions / avg. position 7.5**.

The legacy page was a 2023 UK-oriented Top-10 with stale model families and unsupported ranking logic. Decision: preserve the URL but replace the body with a methodology-first 2026 shortlist by use-case, using current official manufacturer families and explicitly refusing a fake reliability ranking without comparable long-term service data.

### LG review near-win

Fresh query-level evidence for `/tepelne-cerpadla-lg-vyhody-nevyhody-ceny/`:
- `tepelná čerpadla lg recenze` — **8 impressions / avg. position 21.5**;
- `tepelné čerpadlo lg recenze` — **5 impressions / avg. position 27.4**.

The legacy 2023 page centered on older R32/Split families and an undated 120–400k CZK price range. Decision: preserve the indexed URL but replace the body with a 2026 THERMA V R290 buyer guide based on current LG Czech/EU documentation, explicit model-condition caveats and bounded comparison monetization.

### Viessmann review near-win

Fresh query-level evidence for `/recenze-tepelneho-cerpadla-viessman-klady-zapory-a-naklady/`:
- `tepelné čerpadlo viessmann recenze` — **7 impressions / avg. position 30.0**.

The legacy article mixed several older model generations, obsolete UK RHI guidance and an undated 120–350k CZK price range. Decision: preserve the indexed URL but replace the body with a 2026 Vitocal 250-A / 252-A buyer guide based on current Viessmann Czech documentation, explicit A/W condition caveats and bounded comparison monetization.

### Ground-mounted PV intent gap

Fresh page-query evidence shows `fotovoltaika na pozemku` at **5 impressions / avg. position 12.2**, but Google currently maps it to the unrelated heat-pump boundary article because no dedicated solar URL exists.

Decision:
- create a dedicated managed `/fotovoltaika-na-pozemku/` guide;
- publish it explicitly through the manifest;
- cover siting, shading, row spacing, foundations, cable route, MPPT/string design and current Czech permitting caveats;
- link it from the roof-sizing and flat-roof mounting guides;
- do not claim that every installation under 100 kW is permit-free.

### 12V wiring intent refinement

Fresh page-query evidence for `/jak-zapojit-solarni-panely/` includes:
- `schéma zapojení solárních panelů 12v` — **6 impressions / avg. position 20.83**.

The existing rewrite already covered series, parallel, cold Voc and MPPT start voltage, but did not answer the exact 12V schematic intent. Decision: preserve the page and add a compact 2S/2P conceptual diagram, a 12V battery example and an explicit warning against interpreting the article as direct panel-to-battery wiring guidance.

### Air-water and COP cannibalization cleanup

Fresh raw 90-day GSC page-query evidence from the 2026-10-05 Prometheus artifact:
- `/tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji/`: 153 page impressions; 149 disclosed page-query impressions, including `tepelné čerpadlo vzduch voda` at 45 impressions.
- `/tepelna-cerpadla-vzduch-vzduch-vs-vzduch-voda/`: 66 page impressions and substantial overlap on the same generic air-water query family.
- `/cop-tepelneho-cerpadla-se-zdrojem-vzduchu-vysvetleni-zdroj-tepelneho-cerpadla/`: 48 page impressions, dominated by COP queries.
- `/ucinnost-tepelneho-cerpadla-se-zdrojem-vzduchu/`: 38 page impressions with overlapping COP/efficiency intent.

Decision:
- rebuild the stronger air-water URL as the canonical 2026 buyer guide and 301 the overlapping comparison URL into it;
- rebuild the stronger COP URL as the canonical COP/SCOP/efficiency guide and 301 the overlapping efficiency URL into it;
- keep `/jak-funguje-tepelne-cerpadlo/` separate because its query set is clearly principle-focused;
- keep the lifespan URL separate because its query set is clearly durability-focused.

### Lifespan and solar-principle refresh

Fresh raw 90-day GSC page-query evidence from the 2026-10-05 Prometheus artifact:
- `/jak-dlouho-vydrzi-tepelna-cerpadla/`: 43 disclosed page-query impressions, led by `životnost tepelného čerpadla` (24 impressions) and `jak často spíná tepelné čerpadlo` (10 impressions).
- `/solarni-panel-definice-a-fakta/`: 18 disclosed page-query impressions, including `jak funguje solární panel` (12 impressions).
- `/vysvetleni-solarnich-panelu-pv-t/`: 37 disclosed page-query impressions. Its query mix is genuinely PVT / transparent / solar-technology oriented, so it remains a separate URL rather than being redirected into the basic PV guide.

Decision:
- rebuild the lifespan URL around compressor starts, cycling, sizing, service and replace-vs-repair intent, then include it in the owned-first heat-pump funnel;
- rebuild `solarni-panel-definice-a-fakta` as the clear owner of the basic photovoltaic-effect intent;
- rebuild the PVT URL as a distinct hybrid electricity+heat guide, removing stale UK incentives and unsupported efficiency claims instead of merging the two intents.

### Winter PV cannibalization cleanup

Fresh raw 90-day GSC page-query evidence from the 2026-10-05 Prometheus artifact:
- `/vykon-solarnich-panelu-v-zime-ma-smysl-odmetat-snih/`: 21 disclosed impressions, including `účinnost solárních panelů v zimě` (10) and `sklon fotovoltaických panelů v zimě` (9).
- `/co-dela-fotovoltaika-kdyz-je-zima/`: 15 disclosed impressions, including the same `účinnost solárních panelů v zimě` intent (11).

Decision:
- keep the more specific winter-performance URL as the canonical owner;
- rebuild it around winter irradiation, module temperature, PVGIS monthly output, snow cover, tilt and safe snow-removal guidance;
- 301 the weaker duplicate `co-dela-fotovoltaika-kdyz-je-zima` URL into the canonical guide.

### Panel review and real-world performance cleanup

Fresh raw 90-day GSC page-query evidence from the 2026-10-05 Prometheus artifact:
- `/recenze-solarnich-panelu-nezavisle-informace-o-solarni-energii/`: commercial review intent including `fotovoltaické panely recenze`, `solární panely zkušenosti` and `solární panely recenze`.
- The live page was copied Australian-review content with foreign personas/scripts and did not represent Solar Expert's own methodology.
- `/realny-vykon-solarnich-panelu/`: 28 disclosed query impressions, including `reálný výkon solárních panelů` at avg. position 4 and `realny vykon fotovoltaiky` at avg. position 19.

Decision:
- consolidate the legacy review URL via 301 into the existing managed `/jak-vybrat-solarni-panely-pro-vas-domov/` buyer guide;
- expand the buyer guide with warranty, IEC 61215/61730, degradation, mechanical-load and 2026 Kiwa PVEL reliability criteria;
- keep `/realny-vykon-solarnich-panelu/` as a separate intent owner and rebuild it around STC, irradiance, cell temperature, MPPT, clipping and BOS losses.

### TČ temperature and metal-roof opportunity

Fresh raw 90-day GSC page-query evidence from the 2026-10-05 Prometheus artifact:
- `/minimalni-a-maximalni-teploty-tepelneho-cerpadla/`: 18 disclosed query impressions, led by `výstupní teplota tepelného čerpadla` (7) plus water-temperature and minimum-outdoor-temperature variants.
- `/kovove-stresni-krytiny-nejlepsi-volba-pro-solarni-panely/`: 15 disclosed query impressions around roof-integrated PV, metal roofing and photovoltaic roof-covering intent.

Decision:
- rebuild the TČ temperature page around model-specific operating envelopes, output-water temperature, performance in frost and bivalent backup rather than a fake universal temperature range;
- rebuild the metal-roof page around standing seam, trapezoidal sheet, penetrations, sealing, statics, wind/snow and corrosion rather than old US roofing marketing;
- add both pages to their bounded E.ON lead funnels.

### Mono-vs-poly refresh

Fresh raw 90-day GSC evidence from the 2026-10-05 Prometheus artifact:
- `/monokrystalicke-vs-polykrystalicke-solarni-panely/`: 21 impressions at average position ~53.

Decision:
- preserve the indexed URL;
- replace stale 2023 assumptions about polycrystalline panels, old 250–400 W module ranges and generic hot-weather claims;
- reposition the page around the 2026 market: monocrystalline dominance, N-type/TOPCon context, efficiency per m², temperature coefficient, Voc/Vmp and warranties;
- route users into the owned panel buyer guide and MPPT calculator.


### Emerging flexible-solar near-win

Fresh 28-day page evidence for `/flexibilni-solarni-panely-vyhody-nevyhody-a-naklady/`: **7 impressions, average position 12.43, 0 clicks**. The legacy 2023 article duplicated sections, treated flexible panels as inherently thin-film, mixed contradictory price/efficiency claims and retained UK MCS/installer lead-generation copy.

Decision:
- preserve the existing indexed URL and publication state;
- rebuild it as a 2026 use-case guide for campervan/boat/light or curved surfaces vs. rigid residential modules;
- distinguish flexible construction from cell technology, cover ETFE/glassless reliability and manufacturer-required airflow/heat dissipation;
- route electrical intent into MPPT Calculator + Battery Selector and panel-selection intent into the owned buyer guide;
- do not force the generic residential E.ON lead CTA onto this predominantly mobile/off-grid intent.
