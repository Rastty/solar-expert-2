# Solar Expert 2.0 — operational state

Updated: 2026-11-20 (UTC). Source of truth: `Rastty/solar-expert-2` and verified live `https://solar-expert.cz`.

## Goal

Earn attributable affiliate/lead revenue with a trustworthy solar decision engine: actual user needs → compatible technical solution → currently verified merchant offers. Reuse validated common growth capabilities from Prometheus Core rather than fork a parallel system.

## Verified state

- `main` runs the independent, one-post-only guarded editorial workflow. **Production-verified cycle 1:** well-pump guide `/solarni-cerpadlo-do-studny-bez-elektriny/`, WordPress #1641, published 2026-11-20T13:30:38Z, HTTP 200; PR #260 merged as `22233f9`, release run `44744832872` passed authenticated readback. **Production-verified cycle 2:** one contextual link in existing pond-pump guide `/solarni-panel-pro-zahradni-cerpadlo-a-jezirko/`, WordPress #1639, `modified_gmt=2026-11-20T13:40:05`, source link verified on live page; PR #262 merged as `7a249e0`, run `44746252279` passed. Content SHA and modification CAS protected the previous live body. No theme deployment was made.
- `dev` head was `eac6aa4` at inspection; PR #257 (Builder demo) and #258 (self-referral analytics) are integrated and tested in `dev`, **not verified in production**. The read-only four-asset provenance audit from current live files found historical Git candidate `867d0c1` (4/4 byte hashes), while current `dev` differs on all four; this is not complete WordPress rollback proof. All 7 existing provenance tests passed on 2026-11-20.
- Public WordPress health GET on 2026-11-20 returned `status=ok`, theme `0.12.27`, 24 catalog products and **52/52 price snapshots stale** (30-day policy); this is not an acceptable live offer freshness level.
- Homepage HTTP 200 and WordPress public REST are reachable. `catalog_price_stale=52` is a quality warning even though the endpoint health `status` is `ok`.

## Current operation

- Editorial revisions 17 and 18 have both completed verified production publication. Revision 18 was a bounded append to WP #1639 after an independent authenticated fingerprint; no other post or theme was mutated. Do not republish or add a duplicate cross-link.
- The main growth constraint is live offer trust and monetization: 52/52 aging price snapshots, with no supported claim of verified merchant conversion/commission. The next release should prioritize offer freshness or evidence collection over more stand-alone articles.

## Release blockers

- [#148](https://github.com/Rastty/solar-expert-2/issues/148): protected full-theme deployment still requires DB/upload restore proof and an exact full live rollback path. Owner does not want WEDOS backup work. **A naive code-only Deployer release is also unsafe:** `inc/core.php` automatically triggers managed-content sync via `init` cron, `admin_init`, and `upgrader_process_complete`; skipping the explicit `/deploy-sync` call alone does not prevent WordPress content mutations. See [2026-11-20 investigation](https://github.com/Rastty/solar-expert-2/issues/148#issuecomment-7041125850). Do not fabricate receipts or bypass protection. A separate code-only route needs demonstrated suppression of all automatic sync hooks (including previously loaded code), full code recovery and staging proof.
- [#151](https://github.com/Rastty/solar-expert-2/issues/151): Growatt Isc evidence constraint; do not certify an unverified electrical pairing.
- Merchant commissions and conversion performance have **not** been inferred from click events or editorial publishing.

## Next 3 value cycles (ranked by expected value and authorization)

1. **Offer freshness / conversion:** 52 live stale snapshots versus 52 source records dated 2026-11-07. Reverify exact high-value merchant SKUs when needed, then design/test a separately reviewed release path that demonstrably prevents every implicit content-sync write before any code-only deploy; preserved four-file SHA is insufficient. Keep the full-theme gate fail-closed.
2. **Revenue attribution:** join actual query → tool use → affiliate outbound event → approved/paid commission evidence through existing Prometheus Core adapters. Do not infer commissions from clicks.
3. **Buyer path optimization:** based on measured user journeys, improve the highest-value tool → merchant/lead CTA path. Avoid another generic article or duplicate link.
