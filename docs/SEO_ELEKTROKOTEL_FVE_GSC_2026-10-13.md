# GSC opportunity: FVE + electric boiler (13 October 2026)

## Why this page, not another generic "best panels" list

The most recent read-only Prometheus Solar Expert daily GSC snapshot is [run 38413995034](https://github.com/Rastty/prometheus-growth-os/actions/runs/38413995034) (captured 2026-10-13). Its near-win **page × query subset** reported these searches on the existing **different-intent** URL `/tepelne-cerpadlo-nebo-elektrokotel/`:
- `elektrokotel fotovoltaika` — 7 impressions, avg position ~23.86.
- `fotovoltaické panely a elektrokotel` — 6 impressions, avg position ~15.

These represent **13 observed impressions in the reported GSC selection**, not measured total national search volume or proof of low keyword difficulty. Position is the observed average for those queries/pages, not the new page's expected rank.

## Decision-first editorial solution

Publish a **separate** first-party owned article at `/fotovoltaika-a-elektrokotel/`. Retain the existing indexed comparison's body/title/canonical and protected 28-day recrawl hold; only attach a render-time, topic-specific link to the new article. Also link from the already-recrawled homepage and topical solar-panel archive to support first discovery.

The new content clearly distinguishes grid-connected residential FVE from the off-grid Builder / Quote Checker. Explain:
- direct resistive boiler kWh versus useful thermal kWh and heat-pump seasonal factor;
- no misleading 1:1 annual kWh offset for winter heating; compare monthly PVGIS and hourly concurrency;
- model **12,000 kWh heat demand**, electric boiler 12,000 kWh electric versus HP at SPF=3 using 4,000 kWh, with **explicitly hypothetical 4.50 CZK/kWh** and 220,000 CZK investment spread. Not a real current tariff or installation quote.
- real buyer checklist and two-scenario requests: keeping boiler vs changing heating, with safety/installation constraints.

Public factual references: European Commission JRC PVGIS, Energy Saving Trust heat-pump efficiency, Czech state EKIS advice and ČEZ electric-boiler primer; all visible in source article. Avoid undated or hypothetical subsidy claims and false promises of year-round PV heating.

## Monetization, controls and release verification

- Render approved E.ON solar lead offer **on this newly relevant grid-FVE article** using the existing first-party affiliate/lead adapter and clear compensation disclosure. No new raw personal affiliate URLs in article.
- New WordPress managed manifest entry, explicitly publish/indexable, solar-panels category.
- New SEO title/meta, homepage and category discoverability, indexed technical guide `the_content` bridge (source body unchanged).
- CI validates technical calculations, source links, crawlable first-party routes, SEO and taxonomy contract.
- Production release continues existing sitemap/noindex/category/merchant checks and verifies source technical article HTML contains both new FVE guide and old price/checklist target.
- Do **not** claim immediate indexing, increased traffic, or attributable sales; inspect GSC first crawl and buyer journey after 7/14/28 days.
