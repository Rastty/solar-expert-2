# Current status

Git-first development active on `dev`.

- WordPress theme root: ready
- Builder: implemented with product comparison + completion checklist
- Battery Selector: implemented and offer-enabled
- MPPT Selector: implemented, offer-enabled, cold-Voc + MPPT start-window checks added
- Inverter Selector: implemented and offer-enabled
- Compatibility and bundle engine: implemented
- Battery sizing: nominal target is enforced once; no double 0.85 reduction
- Quote Checker MVP: implemented
- Verified public product seed: 23 products
- Multi-merchant offer layer: active for 5 verified products
- Merchant-specific affiliate keys: `product-id@merchant-id`
- Offer-aware ranking: compatibility first, then availability and cheapest verified in-stock offer
- Verified small 12V bundle path: ROGERELE REP1000-12
- Affiliate map: stored in WordPress option with admin settings UI; no deeplinks in public GitHub
- Managed content manifest: 24 items (money pages, transparency pages and legacy rewrites)
- Repository guardrails: catalog parity, offer/merchant integrity, no public affiliate deeplinks, manifest target validation
- Obsolete duplicate bootstrap theme: removed
- Product comparison: compares complete bundles on battery, continuous/surge inverter power, PV and MPPT fit
- “Co ještě potřebuji?”: separates included core components from site-specific protection/cabling/mounting work
- Deployment manifest: corrected to repository-root theme; obsolete nested theme path removed from release config
- Pre-production QA gate + rollback runbook: added
- Public health endpoint: `/wp-json/solar-expert/v1/health` exposes only safe version/count telemetry for post-deploy verification
- RC build marker: `dev-rc-0.7.3`; WordPress theme name `Solar Expert 2.0 RC` to avoid confusion with obsolete installed copies
- Live QA: discontinued DAH 555W panel removed from recommendations; Victron 190W price refreshed to 2,251 Kč
- 7 reviewed tool/transparency pages: publish-ready via managed manifest
- Legacy rewrite internal linking: all 7 high-value rewrites now feed relevant decision tools
- WordPress admin diagnostics: affiliate coverage + managed-content status tables
- Merchant-level affiliate bases: automatic eHub deeplinks via `desturl`; product map remains override-only
- Dedicated Solar Expert settings save handler: posts to `admin-post.php`, not `options.php`
- Explicit managed-content sync: admin button forces manifest → WordPress publish/update and reports created/updated/errors
- Focused SEO titles/meta descriptions: homepage + 7 managed tool/transparency pages
- Product coverage: added verified GOOWEI 12V/200Ah and KOSUN 48V/3000W products
- SEO rescue batch: rewrote degradation, flat-roof mounting and panel-size pages
- Cannibalization cleanup: 301 redirects consolidate two duplicate indexed legacy URLs into stronger managed pages
- Prometheus GSC baseline: 50 URLs / 15 clicks / 1,713 impressions over 2026-04-23→2026-07-21 stored in `docs/GSC_BASELINE.md`
- GSC-driven near-win rewrites: `fotovoltaika-vykon-na-m2`, `co-je-1-kwp`, `jak-zapojit-solarni-panely` expanded to match observed query intent
- Fresh GSC refresh 2026-10-05: 90d 3,284 impressions / 14 clicks; 28d 908 impressions / 4 clicks
- Fresh near-win rewrites: `kolik-panelu-je-potreba-na-jeden-string` and `fotovoltaika-na-eternitovou-strechu`
- Crawl discovery: all five money/tool pages linked sitewide from footer
- Heat-pump legacy monetization: bounded E.ON lead CTA on 12 fresh-GSC-proven legacy articles; public fallback if affiliate lead mapping is absent
- Lead analytics: `lead_click` dataLayer event + `solar-expert-lead-click` browser event
- WordPress diagnostics: `eon-heat-pump` lead mapping status visible in Solar Expert settings
- Combined FVE + heat-pump decision page: fresh-GSC near-win rewritten with October 2026 price benchmark, Builder + Quote Checker routing and E.ON lead CTA
- E.ON solar lead lane: bounded CTA on 4 GSC-backed installation/planning articles using optional `leads.eon-solar`, with public fallback
- Heat-pump boundary near-win: fresh-GSC P1 rewrite using MMR April 2026 methodology; no fake universal setback distance
- Shading CTR protection: top-5 page gets title/meta refinement only, body untouched
- Hourly FVE output near-win: rewritten around kW vs kWh, 1/5/10 kWp examples and Builder routing
- Cleaning cannibalization cleanup: two competing cleaning URLs consolidated into one managed guide with 301 redirect
- Owned-first heat-pump funnel: legacy traffic is internally routed to the FVE + heat-pump decision page before the outbound E.ON CTA
- Shared E.ON base: one optional `eon-cz` eHub base automatically monetizes both `eon-solar` and `eon-heat-pump`; explicit lead mappings remain overrides
- Samsung review refresh: legacy 2023 article replaced with 2026 EHS R290 buyer guide, current manufacturer-backed specs and no stale UK RHI/cost claims
- Structured data discovery: WebSite + Organization + BreadcrumbList + WebApplication for five tools + Article for posts, disabled when a major SEO plugin owns schema
- Overheating/cooling protection: two fresh top-10 URLs kept separate; only zero-click overheating page gets CTR-focused metadata
- Battery knowledge hub: indexed `/category/baterie/` upgraded from generic archive to decision hub with Battery Selector CTA, SEO metadata and CollectionPage schema
- Article freshness layer: visible modified date on all posts + direct CTA to dedicated Builder page
- Selector conversion analytics: one-shot `selector_engaged` event for Battery/MPPT/Inverter tools; initialization excluded from engagement counts
- Production deploy: active RC with manual Git pull/update

High-value legacy rewrites include battery fundamentals, panel selection, solar kits, kWp, Wp/m², roof sizing and series/parallel wiring.

Next:
1. deploy current `dev` RC via Deployer for Git,
2. verify live build/health and active affiliate coverage,
3. use GSC query/page data for the next rewrite batch,
4. expand only verified product gaps that unlock real scenarios,
5. optimize CTR/internal links from pages already receiving impressions.
