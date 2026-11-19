# Solar Expert 2.0

Git-first WordPress theme and owned buyer tools for [solar-expert.cz](https://solar-expert.cz/). The decision journey is **organic guide → Builder / Selector / Quote Checker → technically compatible offer or verified lead route**. The shared portfolio strategy is **Prometheus Core-first**: reuse existing measurement and evidence capabilities; do not create a second SEO/ranking/affiliate engine for this site.

## Read this first — operating state (19 November 2026)

| Lane | What it means | Current state |
| --- | --- | --- |
| `dev` | Integration source for theme, Builder, catalog, tests and release candidate | Latest known green merge: `eac6aa44364bca0fbd80adbe635f90b0bf2629e9` (PR #258); always re-fetch the branch before writing |
| `main` | Separate, narrowly guarded native-editorial publishing lane; **not** proof that the `dev` theme is live | Do not merge the large `dev → main` release PR as an ordinary editorial change |
| Live WordPress | Independently deployed theme + database/options/media | Last read-only observed theme marker `dev-rc-0.12.27`; newer `dev` UX and source catalog changes **not verified live** |
| Theme release | Explicit reviewed `dev` release control, not automatic on every merge | `ops/theme-deploy-release.json` has `enabled:false`; ordinary green CI and a “success” workflow run **do not deploy** |

The read-only 19 November catalog monitor reported **52/52 source offer evidence dates within the 30-day rule on `dev`**, versus **52/52 stale dates in the live WordPress catalog**. These are ages of past exact-merchant checks (dated 7 November), **not** fresh retailer price/stock verification on the monitor date, nor evidence of new sales. The current 7-day buyer-event sample (33 Builder exposures, 1 activation, 4 offer exposures, 0 affiliate clicks) is too small for a causal conversion conclusion and is not a unique-user or commission count. Recheck live health and the latest Action artifact before reusing any number.

## Stop conditions before production

1. **[#148 — real WordPress recovery](https://github.com/Rastty/solar-expert-2/issues/148):** verify a recent host-side database and `wp-content/uploads` backup, a **real separate staging restore rehearsal**, independent release review and the current-live code rollback baseline. A Git theme archive or four matching public asset hashes alone does not restore private affiliate options, SEO metadata, posts or uploads. See [restore attestation](docs/WORDPRESS_RESTORE_ATTESTATION.md) and [release intent](docs/THEME_RELEASE_INTENT.md).
2. **[#151 — integrated Growatt MPPT PV Isc](https://github.com/Rastty/solar-expert-2/issues/151):** per-tracker maximum **absolute PV short-circuit current** for exact current hardware revisions is unverified. The development Builder deliberately excludes these hybrid bundles from purchase/affiliate CTAs. Do not substitute operating PV current or battery charging current. See [technical evidence](docs/GROWATT_INTEGRATED_MPPT_PV_CURRENT_2026-11-07.md).
3. **[#145 — catalog source versus live](https://github.com/Rastty/solar-expert-2/issues/145):** 52 seller-owned source price records were reverified for `dev`, but live price recovery requires an actual guarded deploy and readback. No automatic timestamp roll-forward. See [freshness watch](docs/CATALOG_FRESHNESS_WATCH.md).

Never place WordPress credentials, private backup identifiers, affiliate-option values or eHub deeplinks in public commits, issue bodies or logs. Never open affiliate redirects to “test” a click. Leave production untouched when a recovery/release gate is missing.

## Fast repository map

| Purpose | Source |
| --- | --- |
| WordPress theme, page and tool templates | `*.php`, `template-parts/`, `inc/`, `style.css` |
| Buyer decision engines and first-party attribution | `assets/js/builder.js`, `bundle-composer.js`, `selectors.js`, `analytics.js` |
| Catalog (exact mirrored copies required) | `data/product-seed.json` and `assets/data/product-seed.json` |
| Managed content and SEO ownership | `content/manifest.json`, `content/rewrites/` |
| Deterministic offline safety/conversion regressions | `tests/`, `.github/workflows/validate.yml` |
| Catalog/production age observation | `.github/workflows/catalog-freshness.yml`, `tools/live-catalog-gap.mjs` |
| Guarded theme release workflow | `.github/workflows/auto-deploy-dev.yml`, `ops/theme-deploy-release.json` |
| Older detailed history (not current-status authority) | `docs/STATUS.md` |

Run the focused checks for any changed subsystem and require the PR's **current-head** Validate + WordPress Playground checks before merging into `dev`. For example:

```sh
node tests/engine.test.js
node tests/growatt-tracker-purchase-gate.test.js
node tests/builder-hero-demo.test.js
node tests/tool-referral-selflink.test.js
node --test tests/catalog-freshness.test.mjs tests/live-catalog-gap.test.mjs
```

## Next high-impact sequence

1. **Unblock the existing release**, with genuine WEDOS DB/uploads restore evidence and a full current-live theme baseline; leave release intent disabled until verified.
2. Deploy the reviewed `dev` theme/catalog **once** through the explicit guarded release, then independently check public source hashes, health, managed content, tool usability and legitimate merchant links (no test affiliate clicks).
3. Measure **exposure → user activation → completed sizing → visible real offer → outbound click → attributable approved commission** on new non-overlapping 7/28-day cohorts. Do not equate a click with a paid conversion.
4. Use the existing **Prometheus Solar Expert GSC daily monitor** and its actual current evidence to select one unprotected, non-cannibalizing high-intent SEO opportunity; protect fresh indexed pages from repeated speculative rewrites.

**Source of truth is current GitHub state plus dated read-only public/host evidence, not this snapshot.** Re-check all branch SHAs, workflow outcomes, current prices and release permissions immediately before any write or deployment.
