# Current status

Git-first development active on `dev`.

- WordPress theme root: ready
- Builder: implemented
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
- Production deploy: intentionally not enabled yet

High-value legacy rewrites include battery fundamentals, panel selection, solar kits, kWp, Wp/m², roof sizing and series/parallel wiring.

Next:
1. connect/verify Deployer for Git against `Rastty/solar-expert-2` branch `dev`,
2. populate real merchant-specific affiliate deeplinks in WordPress settings,
3. extend multi-merchant offers to more duplicated SKUs only where current price/availability are verified,
4. run staging/pre-production UX and mobile QA,
5. use GSC query/page data for the next rewrite batch.
