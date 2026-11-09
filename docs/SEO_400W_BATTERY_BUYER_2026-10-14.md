# Solar Expert — 400W PV + LiFePO₄ battery buyer guide (2026-10-14)

## Motivation & factual limits

- Live production health reports 24 catalog products, 47/47 recommendable offers monetized, two independent operators, and 10/10 indexability targets ready before this change. As of 14 Oct, 7d first-party event counters: 71 tool views, 46 tool exposures, two starts, 26 product-offer exposure events, zero outbound affiliate clicks. Counters are **not unique visitors or orders**.
- Most recent Prometheus Solar Expert GSC report is 13 Oct 2026 [38413995034](https://github.com/Rastty/prometheus-growth-os/actions/runs/38413995034). No fresh query-volume/KD metrics were supplied for `jakou baterii k solárnímu panelu 400W`. Manual Czech SERP exploration revealed related questions but **not reliable numerical national search volume or proof of low organic competition**. This is an intent/product-coverage hypothesis, not a proven SEO win.
- Existing indexed technical string guide already refers visitors to 400W MPPT buying guide. The new distinct article answers **battery energy/Wh, usable kWh, BMS current and 12/24V**, not the MPPT model comparison, thus avoids identical topic duplication.

## Implementation

- Publish one substantial model-based guide `/jakou-baterii-k-solarnimu-panelu-400w/` through managed WordPress post manifest and Yoast SEO meta, `solarni-panely` category. Direct crawler-accessible homepage and solar category links, plus battery-category link and an editorial render-time MPPT 400W → battery guide → Battery Selector bridge.
- No edits to existing indexed post bodies, dates, canonicals or 28-day GSC content holds; no new false 404 redirects or raw affiliate URLs. Product recommendation stays inside the existing independently gated **Battery Selector**. The article names two catalog-backed actual GOOWEI models without frozen price claims.
- Model: 700 Wh/day AC example; 80% usable fraction and 90% inverter efficiency give ~972 Wh nominal requirement; 12.8V×100Ah and 25.6V×50Ah both equal 1,280 Wh nominal, ~922 Wh usable in this particular model. These are **energy** checks; 1 kW AC at 90% needs ~1,111 W DC / 43.4 A at 25.6V, which exceeds a 24V 50Ah catalog BMS 40A continuous limit. Illustrative 15W no-load inverter for 24h adds 360 Wh/day.
- 400Wp×3 model equivalent peak-sun-hours×0.75 = 0.9kWh/day hypothetical, **not** a real local winter guarantee. PVGIS JRC and Victron manufacturer MPPT manual directly cited. Safety: verify cold Voc, hot Vmp, Isc, actual battery BMS max charge/discharge and cell charging temperatures, qualified installation.
- CI tests long-form source, all mathematical examples, published slug/category/meta, direct conversion links and source domains. Server-rendered cross-post CTA contract regression and gated production live URL test.

## Evaluation & rollback

- Observe 7/14/28d GSC discovery, impressions and query associations, then CTR; distinguish Google indexing delay from a technical block. Funnel: indexed article → Battery Selector tool referral → genuine engagement → product offers exposed → affiliate clicks. Never infer sale from outbound click.
- If cannibalization or buyer confusion appears, remove only the new article's homepage/category and MPPT bridge references. The managed post content can be unpublished via an explicit reversible operation after evidence review; avoid deleting or redirecting known GSC winners.
