# Solar Expert 2.0 — operational state

Updated: 2026-11-20 (UTC). Source of truth: `Rastty/solar-expert-2` and verified live `https://solar-expert.cz`.

## Goal

Earn attributable affiliate/lead revenue with a trustworthy solar decision engine: actual user needs → compatible technical solution → currently verified merchant offers. Reuse validated common growth capabilities from Prometheus Core rather than fork a parallel system.

## Verified state

- `main` runs the independent, one-post-only guarded editorial workflow. **Production-verified cycle 1:** well-pump guide `/solarni-cerpadlo-do-studny-bez-elektriny/`, WordPress #1641, published 2026-11-20T13:30:38Z, HTTP 200; PR #260 merged as `22233f9`, release run `44744832872` passed authenticated readback. **Production-verified cycle 2:** one contextual link in existing pond-pump guide `/solarni-panel-pro-zahradni-cerpadlo-a-jezirko/`, WordPress #1639, `modified_gmt=2026-11-20T13:40:05`, source link verified on live page; PR #262 merged as `7a249e0`, run `44746252279` passed. Content SHA and modification CAS protected the previous live body. No theme deployment was made.
- `dev` includes PR #257/#258 (Builder and analytics), PR #263/#264 (default-off sync and first-migration preflight), **PR #265** (offline first-transition content-preserving archive, merged `81882b0`) and **PR #266** (Pylontech stock correction, merged `b869683`) plus **PR #267** (second seller offer-drift cohort, merged `f4d8f76`). PRs #266/#267 passed Validate, Catalog Freshness and WordPress Playground on 2026-11-20. The #267 dev release-intent job passed and `deploy` was explicitly **skipped**. **None of these dev changes is verified in production.** Public four-asset historical candidate `867d0c1` remains partial code provenance, not full live rollback proof.
- Public WordPress health GET on 2026-11-20 returned `status=ok`, theme `0.12.27`, 24 catalog products and **52/52 price snapshots stale** (30-day policy); this is not an acceptable live offer freshness level.
- **2026-11-20 seller evidence:** exact Pylontech US5000 SKU E8221 at Battery.cz and Solar-Import.cz now says **Na dotaz / `OutOfStock`**, 22,900 Kč incl. VAT. PR #266 demoted it from `premium` to `reference` and both offer rows to `on_request` (verified `2026-11-20`), preserving another 48 V in-stock battery candidate. `dev` source has 52/52 dated-fresh offer records (5 individually rechecked on 2026-11-20, other 47 from 2026-11-07); **live WordPress remains 0/52 fresh**, so no buyer-facing correction is yet claimed.
- **Second seller evidence cohort (PR #267):** a 2026-11-20 read-only check reached 49/52 exact seller URLs; 3 Vselektro URLs returned CAPTCHA, hence are **unknown**, not stockouts. SEPLOS POLO-W + Growatt E9021 at both Battery.cz and Solar-Import.cz is `Na dotaz` / `OutOfStock` at 32,990 Kč; both offers and the deal are `on_request`, excluded from active Builder discounts while retaining exact source evidence. The alternate Battery.cz Victron BlueSolar 190W E8934 price changed 2,496 → 3,486 Kč. A separate 48/1200 inverter's visible `obvykle skladem` remains `usually_in_stock` despite broad schema `InStock`; no false stock upgrade. No claim of paid revenue or production exposure.
- Homepage HTTP 200 and WordPress public REST are reachable. Post-merge live `/health` recheck still returned theme `0.12.27`, 24 products, `catalog_price_fresh=0`, `catalog_price_stale=52`. Endpoint `status=ok` is not an offer-freshness approval.

## Current operation

- Editorial revisions 17 and 18 completed verified production publication. Revision 18 was a bounded append to WP #1639 after an authenticated fingerprint; no other post or theme was mutated. Do not republish or add a duplicate cross-link.
- **2026-11-20 code-only prerequisites:** PR #263 gated NEW-PHP automatic cron/admin/upgrader sync behind strict opt-in; explicit `/deploy-sync` remains. PR #264 added a **read-only, fail-closed** first-migration parity gate. Against historical 4-file live candidate `867d0c1` and `dev` `6241d32`, the gate inspected 63 managed source files and found 8 changed fingerprint inputs: `content/manifest.json` plus 7 HTML sources. The `--require-identical` mode correctly blocks; `release_authorized=false`. First transition can still execute OLD loaded PHP hooks and therefore has **not** been approved/deployed.
- The main growth constraint is live offer trust and monetization: 52/52 aging price snapshots, with no supported claim of verified merchant conversion/commission. The next release should prioritize offer freshness or evidence collection over more stand-alone articles.

## Release blockers

- [#148](https://github.com/Rastty/solar-expert-2/issues/148): protected full-theme deployment still requires DB/upload restore proof and an exact full live rollback path. Owner does not want WEDOS backup work. **A naive code-only Deployer release is also unsafe:** `inc/core.php` automatically triggers managed-content sync via `init` cron, `admin_init`, and `upgrader_process_complete`; skipping the explicit `/deploy-sync` call alone does not prevent WordPress content mutations. See [2026-11-20 investigation](https://github.com/Rastty/solar-expert-2/issues/148#issuecomment-7041125850). Do not fabricate receipts or bypass protection. A separate code-only route needs **identical old-updater managed-content fingerprint inputs or a proven pre-update suppression mechanism**, full code recovery and staging proof. The new read-only source gate currently finds 8 changed inputs.
- [#151](https://github.com/Rastty/solar-expert-2/issues/151): Growatt Isc evidence constraint; do not certify an unverified electrical pairing.
- Merchant commissions and conversion performance have **not** been inferred from click events or editorial publishing.

## Next 3 value cycles (ranked by expected value and authorization)

1. **Complete protected production release of verified offers:** PRs #266/#267 have corrected five individually rechecked merchant offers in `dev`, but 52/52 live snapshots remain stale. Obtain private, release-scoped WordPress DB/uploads restore evidence and staging proof of old-PHP content non-mutation, exact source parity and full rollback before enabling the guarded release (#148). A GitHub merge is not deployment.
2. **Revenue attribution:** connect real query → tool use → affiliate outbound → confirmed partner order/commission through existing Prometheus Core adapters. No commission inferred from clicks or `Na dotaz` items.
3. **Buyer path optimization:** use measured high-intent tool and merchant-path gaps to choose the next conversion experiment; preserve verified electrical/stock/source gating rather than publishing another generic article.
