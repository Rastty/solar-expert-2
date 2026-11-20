# Solar Expert 2.0 — operational state

Updated: 2026-11-20 (UTC). Source of truth: `Rastty/solar-expert-2` and verified live `https://solar-expert.cz`.

## Goal

Earn attributable affiliate/lead revenue with a trustworthy solar decision engine: actual user needs → compatible technical solution → currently verified merchant offers. Reuse validated common growth capabilities from Prometheus Core rather than fork a parallel system.

## Verified state

- `main` runs the independent, one-post-only guarded editorial workflow. The latest **confirmed production** publication is `/solarni-cerpadlo-do-studny-bez-elektriny/`, WordPress #1641, 2026-11-20T13:30:38Z, HTTP 200. PR #260 was merged as `22233f9`; the GitHub Action run `44744832872` passed its one-write and authenticated-readback jobs. No theme deployment was made.
- `dev` head was `eac6aa4` at inspection; PR #257 (Builder demo) and #258 (self-referral analytics) are integrated and tested in `dev`, **not verified in production**.
- Public WordPress health GET on 2026-11-20 returned `status=ok`, theme `0.12.27`, 24 catalog products and **52/52 price snapshots stale** (30-day policy); this is not an acceptable live offer freshness level.
- Homepage HTTP 200 and WordPress public REST are reachable. `catalog_price_stale=52` is a quality warning even though the endpoint health `status` is `ok`.

## Current operation

- Editorial release revision 17 was confirmed live as WP #1641. Next bounded cycle: obtain authenticated read-only SHA and modified timestamp for published pond-pump guide WP #1639 before one possible CAS-guarded contextual link to the new well-pump buyer guide; no post write is authorized by this fingerprint-only change.

## Release blockers

- [#148](https://github.com/Rastty/solar-expert-2/issues/148): the existing protected full-theme workflow still requires DB/upload restore proof and exact live source baseline. On 2026-11-20 the owner explicitly stated WEDOS backup work is unwanted and requested faster iteration. Do not fabricate the required receipt or bypass workflow protection; use independent low-risk, one-post editorial releases while evaluating a separately reviewed code-only release path.
- [#151](https://github.com/Rastty/solar-expert-2/issues/151): Growatt Isc evidence constraint; do not certify an unverified electrical pairing.
- Merchant commissions and conversion performance have **not** been inferred from click events or editorial publishing.

## Next 3 value cycles (ranked by expected value and authorization)

1. Add one verified contextual link from the distinct pond-pump article to the newly live well-pump buyer guide, with exact current WordPress content CAS and encrypted prewrite. This is a follow-up conversion/discovery bridge, not a new article.
2. Unblock **highest economic upside:** evaluate a reviewed minimal code-only theme release excluding managed content sync and protected DB mutations. Existing full-theme workflow must remain fail-closed without its current restore evidence; do not use unbacked release receipts. Validate live source fingerprint, current code tests, compatibility and CTA/offer paths before any alternate production mutation.
3. Join actual query → tool use → affiliate outbound event → approved/paid commission evidence through existing Prometheus Core adapters; change only buyer paths with measurable missing outcomes. Do not claim commission data without it.
