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
