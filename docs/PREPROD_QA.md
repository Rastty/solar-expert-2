# Pre-production QA gate

This is the release gate for Solar Expert 2.0. Production stays untouched until all P0 checks pass.

## P0 — must pass

### Platform
- [ ] Latest `dev` head has green **Validate Solar Expert**.
- [ ] Latest `dev` head has green **WordPress Playground Preview**.
- [ ] Homepage renders without PHP warnings/fatal errors.
- [ ] No blocking JavaScript console errors.
- [ ] Current production theme/version is available as a rollback path.

### Builder — core scenarios
- [ ] Cottage preset produces a sensible **24 V** Best Value bundle.
- [ ] Small low-power scenario can produce the verified **12 V** path.
- [ ] High-power scenario produces a compatible **48 V** path.
- [ ] Continuous inverter sizing and surge sizing remain separate.
- [ ] Panel topology exposes series/parallel layout.
- [ ] MPPT start voltage and cold Voc checks are visible/consistent.

### Product comparison
- [ ] Only technically complete bundles appear in the comparison.
- [ ] Every variant uses the same criteria: battery kWh, continuous W, surge W, panel Wp and MPPT compatibility.
- [ ] Displayed reserve explanations match the underlying result.
- [ ] Affiliate commission does not change technical ranking.

### “Co ještě potřebuji?”
- [ ] Core components already selected are shown as included.
- [ ] DC battery protection/disconnect is surfaced.
- [ ] Cabling/connectors are surfaced.
- [ ] Mounting, PV/DC protection and grounding are surfaced as site-dependent.
- [ ] The UI does not invent exact fuse/cable/component sizes without the required inputs.

### Selectors
- [ ] Battery Selector rejects insufficient nominal battery energy.
- [ ] MPPT Selector rejects a string below verified start voltage.
- [ ] MPPT Selector applies cold-Voc safety margin.
- [ ] Inverter Selector checks both continuous and surge power.

### Affiliate / merchant integrity
- [ ] Battery.cz links display Battery.cz.
- [ ] Solar-Import.cz links display Solar-Import.cz.
- [ ] Merchant-specific `product@merchant` mappings resolve to the matching merchant only.
- [ ] Monetized links use `sponsored nofollow noopener`.
- [ ] Unmapped products safely fall back to their verified source URL.
- [ ] No affiliate deeplinks are committed in the public catalog.

### Content / SEO safety
- [ ] Existing rewritten posts keep their URL slug and publication status.
- [ ] New managed money pages remain draft until reviewed.
- [ ] Builder, Battery, MPPT, Inverter and Quote Checker internal links return valid pages.
- [ ] No high-value legacy URL is accidentally deleted or redirected to an unrelated page.

### Mobile
Test at approximately 360–390 px width:
- [ ] Builder inputs usable without horizontal page overflow.
- [ ] Bundle cards readable.
- [ ] Comparison cards stack correctly.
- [ ] Merchant offer buttons remain tappable.
- [ ] “Co ještě potřebuji?” checklist stacks cleanly.

## P1 — desirable before scale-up

- [ ] Populate real affiliate mappings for every currently surfaced approved merchant offer.
- [ ] Validate prices/availability for multi-merchant products.
- [ ] Review analytics events: `solar_builder_complete`, `affiliate_click`, `quote_checker_complete`.
- [ ] Review first GSC query/page export and prioritize next legacy rewrite batch.

## Release decision

**GO** only when all P0 items pass.  
Anything else is **NO-GO** until corrected.
