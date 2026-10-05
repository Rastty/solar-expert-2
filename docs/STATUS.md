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
- Managed content manifest: 39 items (money pages, transparency pages and legacy rewrites)
- Repository guardrails: catalog parity, offer/merchant integrity, no public affiliate deeplinks, manifest target validation
- Obsolete duplicate bootstrap theme: removed
- Product comparison: compares complete bundles on battery, continuous/surge inverter power, PV and MPPT fit
- “Co ještě potřebuji?”: separates included core components from site-specific protection/cabling/mounting work
- Deployment manifest: corrected to repository-root theme; obsolete nested theme path removed from release config
- Pre-production QA gate + rollback runbook: added
- Public health endpoint: `/wp-json/solar-expert/v1/health` exposes only safe version/count telemetry for post-deploy verification
- RC build marker: `dev-rc-0.11.11`; WordPress theme name `Solar Expert 2.0 RC` to avoid confusion with obsolete installed copies
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
- Flat-roof duplicate cleanup: `/kotveni-fotovoltaickych-panelu-na-ploche-strese-2/` now 301s to the managed canonical flat-roof mounting guide after GSC showed overlapping ranking queries
- Prometheus GSC baseline: 50 URLs / 15 clicks / 1,713 impressions over 2026-04-23→2026-07-21 stored in `docs/GSC_BASELINE.md`
- GSC-driven near-win rewrites: `fotovoltaika-vykon-na-m2`, `co-je-1-kwp`, `jak-zapojit-solarni-panely` expanded to match observed query intent
- Fresh GSC refresh 2026-10-05: 90d 3,284 impressions / 14 clicks; 28d 908 impressions / 4 clicks
- Fresh near-win rewrites: `kolik-panelu-je-potreba-na-jeden-string` and `fotovoltaika-na-eternitovou-strechu`
- Crawl discovery: all five money/tool pages linked sitewide from footer
- Heat-pump legacy monetization: bounded E.ON lead CTA on 12 fresh-GSC-proven legacy articles; public fallback if affiliate lead mapping is absent
- Lead analytics: `lead_click` dataLayer event + `solar-expert-lead-click` browser event
- Quote Checker conversion step: completed results now offer an owned Builder path plus a separately tracked monetized E.ON FVE comparison CTA (`quote_checker_result`)
- WordPress diagnostics: `eon-heat-pump` lead mapping status visible in Solar Expert settings
- Combined FVE + heat-pump decision page: fresh-GSC near-win rewritten with October 2026 price benchmark, Builder + Quote Checker routing and E.ON lead CTA
- E.ON solar lead lane: bounded CTA on 7 GSC-backed installation/planning articles using the active shared `eon-cz` base, with public fallback
- Owned-first solar funnel: GSC-backed FVE planning pages now route visitors through Quote Checker before the monetized E.ON comparison CTA
- Heat-pump boundary near-win: fresh-GSC P1 rewrite using MMR April 2026 methodology; no fake universal setback distance
- Shading CTR protection: top-5 page gets title/meta refinement only, body untouched
- Tracker CTR protection: `/nataceni-solarnich-panelu-za-sluncem/` is a fresh top-10 / recent top-5 near-win; title/meta refined while body remains untouched
- Mitsubishi Ecodan CTR protection: GSC query `mitsubishi ecodan ultra quiet` is already near the top (16 impressions / avg. position 4.88); title/meta refined while the legacy body remains untouched pending broader intent evidence
- Hourly FVE output near-win: rewritten around kW vs kWh, 1/5/10 kWp examples and Builder routing
- Cleaning cannibalization cleanup: two competing cleaning URLs consolidated into one managed guide with 301 redirect
- Heat-pump consumption cannibalization: `/spotreba-tepelneho-cerpadla-v-kwh/` 301s to a rebuilt `/prumerna-spotreba-tepelneho-cerpadla/` guide; two overlapping high-impression URLs now consolidate into one SCOP/kWh intent owner
- Owned-first heat-pump funnel: legacy traffic is internally routed to the FVE + heat-pump decision page before the outbound E.ON CTA
- Heat-pump topical cluster: all bounded TČ legacy pages receive contextual internal links to the 2026 comparison hub, consumption guide and FVE + TČ decision page, excluding self-links
- COP/SCOP consolidation: canonical COP guide rebuilt around comparable operating points and seasonal efficiency; overlapping generic efficiency URL now 301s into it
- Heat-pump principle refresh: `/jak-funguje-tepelne-cerpadlo/` (99 fresh-GSC impressions) rebuilt as a clean four-stage thermodynamic explainer with COP and buyer-guide routing; stale UK grant/translation content removed
- PVT intent separation: `vysvetleni-solarnich-panelu-pv-t` remains a distinct hybrid electricity+heat guide; obsolete UK incentive and unsupported legacy efficiency claims removed
- Winter PV consolidation: two overlapping winter-efficiency URLs merged into one managed guide; `co-dela-fotovoltaika-kdyz-je-zima` now 301s to the canonical winter-performance/snow/tilt page
- Solar principle refresh: `solarni-panel-definice-a-fakta` rebuilt as the owner of `jak funguje solární panel`, replacing copied/legacy encyclopedia-style content with an original PV-effect explainer
- Heat-pump lifespan refresh: 43 disclosed GSC query impressions now map to a managed guide covering compressor starts, cycling, service and replace-vs-repair; the page joins the bounded E.ON/related-links funnel
- Air-water TČ consolidation: 153-impression legacy buyer page rebuilt for 2026; overlapping `vzduch-vzduch-vs-vzduch-voda` URL now 301s into the canonical air-water guide
- Shared E.ON base: one optional `eon-cz` eHub base automatically monetizes both `eon-solar` and `eon-heat-pump`; explicit lead mappings remain overrides
- E.ON lead monetization due diligence: E.ON is confirmed approved for Solar Expert; current public eHUB campaign pays 300 Kč per valid lead for electricity/gas/FVE/heat pumps. Shared `eon-cz` base can monetize both solar and heat-pump CTAs.
- E.ON private base link: ACTIVE in WordPress as `eon-cz` from the approved eHUB account; the private URL is intentionally kept out of GitHub. Live health confirms 3 merchant bases.
- Samsung review refresh: legacy 2023 article replaced with 2026 EHS R290 buyer guide, current manufacturer-backed specs and no stale UK RHI/cost claims
- Structured data discovery: WebSite + Organization + BreadcrumbList + WebApplication for five tools + Article for posts, disabled when a major SEO plugin owns schema
- Overheating/cooling protection: two fresh top-10 URLs kept separate; only zero-click overheating page gets CTR-focused metadata
- Battery knowledge hub: indexed `/category/baterie/` upgraded from generic archive to decision hub with Battery Selector CTA, SEO metadata and CollectionPage schema
- Article freshness layer: visible modified date on all posts + direct CTA to dedicated Builder page
- Selector conversion analytics: one-shot `selector_engaged` event for Battery/MPPT/Inverter tools; initialization excluded from engagement counts
- Verified bundle-deal layer: Battery.cz PUSUNG/POLO-W + Growatt 6000 set offers reduce displayed purchase price when cheaper, without changing technical ranking
- Bundle analytics: dedicated `bundle_deal_click` event; merchant-base affiliate deeplink targets exact set URL
- Parallel battery-bank engine: verified PUSUNG-S and Pylontech modules can scale to the minimum required quantity; 48V high-power coverage is now complete
- Catalog coverage baseline: `docs/CATALOG_COVERAGE.md` records representative 12/24/48V scenarios and remaining evidence gaps
- Complete-only bundle UX: Builder hides incomplete Budget/Premium cards and explains why; zero-result state refuses weak recommendations
- Git-deploy content auto-sync: manifest drift schedules one locked WordPress cron sync; health/admin expose CURRENT / SYNC_REQUIRED / ERROR
- Annual-output near-win: stale yearly-production article replaced with locality-aware PVGIS methodology and kWp→kWh examples
- Size-guide cannibalization: stale `kompletni-pruvodce-velikosti-solarnich-panelu` 301s to the stronger managed dimensions/weight guide
- Heating decision near-win: `tepelne-cerpadlo-nebo-elektrokotel` rebuilt around annual heat demand, seasonal efficiency and FVE interaction; stale universal claims removed
- Heat-pump shortlist near-win: stale UK Top-10 replaced with 2026 use-case shortlist using current Daikin/Vaillant/NIBE/Viessmann/LG R290 families and explicit methodology
- LG review refresh: legacy 2023 R32/Split article replaced with 2026 THERMA V R290 buyer guide and current manufacturer-backed specs
- Daikin review refresh: legacy 2023 UK/air-to-air mix replaced with a 2026 Czech buyer guide covering Altherma 4 H R290, Altherma 3 R MT/3 H HT, high-temperature retrofit fit and official current documentation
- Viessmann review refresh: legacy multi-generation/RHI article replaced with 2026 Vitocal 250-A / 252-A buyer guide and current Czech manufacturer-backed specs
- Legacy frontend quarantine: old Notification Bar, Ninja Popups, Simple Author Box and SEO Automated Link Building are removed from public rendering without deleting or deactivating plugins
- Ground-mounted PV intent fix: new managed `/fotovoltaika-na-pozemku/` decision guide targets the GSC query currently leaking to an unrelated heat-pump boundary page; current 2026 permitting caveats included
- 12V wiring intent: `jak-zapojit-solarni-panely` now includes safe 2S/2P conceptual schematics and explicit MPPT routing for the observed `schéma zapojení solárních panelů 12v` query
- Battery Selector parallel-bank support: standalone selector now reuses the Builder's verified bank logic and can recommend 2×/3× supported modules with total kWh, BMS current and bank price
- Multi-bank set optimization: a verified 1× battery + inverter merchant set may be used once inside a larger parallel bank; remaining battery modules are priced separately and shown explicitly
- Intentional Premium gaps: 12V/24V Premium remains hidden until an approved-merchant battery is both technically evidenced and currently recommendable; `on_request` inventory cannot unlock a complete tier
- Catalog price freshness: 30-day verified-price window; stale merchant prices cannot drive ranking or set discounts, stale prices are hidden, health/admin expose fresh/stale/verification-unknown counts
- Production deploy: active RC with manual Git pull/update

High-value legacy rewrites include battery fundamentals, panel selection, solar kits, kWp, Wp/m², roof sizing and series/parallel wiring.

Next:
1. deploy current `dev` RC via Deployer for Git,
2. verify live build/health and active affiliate coverage,
3. use GSC query/page data for the next rewrite batch,
4. expand only verified product gaps that unlock real scenarios,
5. optimize CTR/internal links from pages already receiving impressions.
