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

