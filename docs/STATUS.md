# Current status

Git-first development active on `dev`.

- WordPress theme root: ready
- Builder: implemented
- Battery Selector: implemented
- MPPT Selector: implemented
- Inverter Selector: implemented
- Compatibility and bundle engine: implemented
- Quote Checker MVP: implemented
- Verified public product seed: 21 products
- Verified small 12V bundle path: added via ROGERELE REP1000-12
- Affiliate map: stored in WordPress option with admin settings UI; no deeplinks in public GitHub
- Managed content manifest: 14 items (money pages, transparency pages and legacy rewrites)
- Repository guardrails: catalog parity, no public affiliate deeplinks, manifest target validation
- Obsolete duplicate bootstrap theme: removed
- Production deploy: intentionally not enabled yet

High-value legacy rewrites now include battery fundamentals, panel selection, solar kits, kWp, Wp/m², roof sizing and series/parallel wiring.

Next:
1. connect/verify Deployer for Git against `Rastty/solar-expert-2` branch `dev`,
2. add real affiliate deeplinks through WordPress settings,
3. expand only catalog gaps that have verified evidence and availability,
4. run staging/pre-production QA,
5. use GSC query/page data for the next rewrite batch.
