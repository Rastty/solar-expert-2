# Solar Expert 2.0 — operational state

Updated: 2026-11-20 (UTC). Source of truth: `Rastty/solar-expert-2` and verified live `https://solar-expert.cz`.

## Goal

Earn attributable affiliate/lead revenue with a trustworthy solar decision engine: actual user needs → compatible technical solution → currently verified merchant offers. Reuse validated common growth capabilities from Prometheus Core rather than fork a parallel system.

## Verified state

- `main` runs the independent, one-post-only guarded editorial workflow. **Production-verified cycle 1:** well-pump guide `/solarni-cerpadlo-do-studny-bez-elektriny/`, WordPress #1641, published 2026-11-20T13:30:38Z, HTTP 200; PR #260 merged as `22233f9`, release run `44744832872` passed authenticated readback. **Production-verified cycle 2:** one contextual link in existing pond-pump guide `/solarni-panel-pro-zahradni-cerpadlo-a-jezirko/`, WordPress #1639, `modified_gmt=2026-11-20T13:40:05`, source link verified on live page; PR #262 merged as `7a249e0`, run `44746252279` passed. Content SHA and modification CAS protected the previous live body. No theme deployment was made.
- `dev` head was `eac6aa4` at inspection; PR #257 (Builder demo) and #258 (self-referral analytics) are integrated and tested in `dev`, **not verified in production**.
- Public WordPress health GET on 2026-11-20 returned `status=ok`, theme `0.12.27`, 24 catalog products and **52/52 price snapshots stale** (30-day policy); this is not an acceptable live offer freshness level.
- Homepage HTTP 200 and WordPress public REST are reachable. `catalog_price_stale=52` is a quality warning even though the endpoint health `status` is `ok`.

## Current operation

- Editorial revisions 17 and 18 have both completed verified production publication. Revision 18 was a bounded append to WP #1639 after an independent authenticated fingerprint; no other post or theme was mutated. Do not republish or add a duplicate cross-link.
- The main growth constraint is live offer trust and monetization: 52/52 aging price snapshots, with no supported claim of verified merchant conversion/commission. The next release should prioritize offer freshness or evidence collection over more stand-alone articles.

## Release blockers

- [#148](https://github.com/Rastty/solar-expert-2/issues/148): the existing protected full-theme workflow still requires DB/upload restore proof and exact live source baseline. On 2026-11-20 the owner explicitly stated WEDOS backup work is unwanted and requested faster iteration. Do not fabricate the required receipt or bypass workflow protection; use independent low-risk, one-post editorial releases while evaluating a separately reviewed code-only release path.
- [#151](https://github.com/Rastty/solar-expert-2/issues/151): Growatt Isc evidence constraint; do not certify an unverified electrical pairing.
- Merchant commissions and conversion performance have **not** been inferred from click events or editorial publishing.

## Next 3 value cycles (ranked by expected value and authorization)

1. **Offer freshness / conversion:** identify the actual authority and refresh route for 52 stale price snapshots; improve live offer verification and avoid misleading prices. If a release is needed, prepare a separately reviewed minimal code-only path (no DB/upload sync), with exact live source fingerprint, rollback and evidence. Preserve the fail-closed full-theme gate at issue #148.
2. **Revenue attribution:** join actual query → tool use → affiliate outbound event → approved/paid commission evidence through existing Prometheus Core adapters. Do not infer commissions from clicks.
3. **Buyer path optimization:** based on measured user journeys, improve the highest-value tool → merchant/lead CTA path. Avoid another generic article or duplicate link.
