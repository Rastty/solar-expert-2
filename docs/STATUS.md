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
- Verified public product seed: 21 products
- Multi-merchant offer layer: active for 5 verified products
- Merchant-specific affiliate keys: `product-id@merchant-id`
- Offer-aware ranking: compatibility first, then availability and cheapest verified in-stock offer
- Verified small 12V bundle path: ROGERELE REP1000-12
- Affiliate map: stored in WordPress option with admin settings UI; no deeplinks in public GitHub
- Managed content manifest: 14 items (money pages, transparency pages and legacy rewrites)
- Repository guardrails: catalog parity, offer/merchant integrity, no public affiliate deeplinks, manifest target validation
- Obsolete duplicate bootstrap theme: removed
- Product comparison: compares complete bundles on battery, continuous/surge inverter power, PV and MPPT fit
- “Co ještě potřebuji?”: separates included core components from site-specific protection/cabling/mounting work
- Deployment manifest: corrected to repository-root theme; obsolete nested theme path removed from release config
- Pre-production QA gate + rollback runbook: added
- Public health endpoint: `/wp-json/solar-expert/v1/health` exposes only safe version/count telemetry for post-deploy verification
- RC build marker: `dev-rc-0.5.5`; WordPress theme name `Solar Expert 2.0 RC` to avoid confusion with obsolete installed copies
- Live QA: discontinued DAH 555W panel removed from recommendations; Victron 190W price refreshed to 2,251 Kč
- 7 reviewed tool/transparency pages: publish-ready via managed manifest
- Legacy rewrite internal linking: all 7 high-value rewrites now feed relevant decision tools
- WordPress admin diagnostics: affiliate coverage + managed-content status tables
- Merchant-level affiliate bases: automatic eHub deeplinks via `desturl`; product map remains override-only
- Production deploy: active RC with manual Git pull/update

High-value legacy rewrites include battery fundamentals, panel selection, solar kits, kWp, Wp/m², roof sizing and series/parallel wiring.

Next:
1. connect/verify Deployer for Git against `Rastty/solar-expert-2` branch `dev` as a theme rooted at the repository root,
2. run `docs/PREPROD_QA.md` on staging/preview,
3. populate real merchant-specific affiliate deeplinks in WordPress settings,
4. fix only QA findings that block release,
5. after stable deployment, use GSC query/page data for the next rewrite batch.
