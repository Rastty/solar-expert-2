# Solar Expert 2.0 — operational state

Updated: 2026-11-20 (UTC). Source of truth: `Rastty/solar-expert-2` and verified live `https://solar-expert.cz`.

## Goal

Earn attributable affiliate/lead revenue with a trustworthy solar decision engine: actual user needs → compatible technical solution → currently verified merchant offers. Reuse validated common growth capabilities from Prometheus Core rather than fork a parallel system.

## Verified state

- `main` runs the independent, one-post-only guarded editorial workflow. Last confirmed public article from this pipeline: `/solarni-panel-do-garaze-bez-elektriny/`, WordPress #1640, published 2026-11-18T18:48:53Z. The push Action from the same SHA succeeded; scheduled runs are read-only.
- `dev` head was `eac6aa4` at inspection; PR #257 (Builder demo) and #258 (self-referral analytics) are integrated and tested in `dev`, **not verified in production**.
- Public WordPress health GET on 2026-11-20 returned `status=ok`, theme `0.12.27`, 24 catalog products and **52/52 price snapshots stale** (30-day policy); this is not an acceptable live offer freshness level.
- Homepage HTTP 200 and WordPress public REST are reachable. `catalog_price_stale=52` is a quality warning even though the endpoint health `status` is `ok`.

## Current operation

- Editorial one-post release revision 17: `/solarni-cerpadlo-do-studny-bez-elektriny/` — a distinct off-grid well-water-pump buyer intent, with exact Git source/SHA guard and validated electrical and hydraulic caveats. **A PR/merge is not proof of WordPress publication.** Confirm GitHub Actions `wp_verified` and public WordPress #ID/URL before marking live.

## Release blockers

- [#148](https://github.com/Rastty/solar-expert-2/issues/148): host-level restorable DB and upload backup + non-production restore rehearsal are not yet proven. **No `dev` theme/catalog deployment** before this gate is satisfied.
- [#151](https://github.com/Rastty/solar-expert-2/issues/151): Growatt Isc evidence constraint; do not certify an unverified electrical pairing.
- Merchant commissions and conversion performance have **not** been inferred from click events or editorial publishing.

## Next 3 value cycles (ranked by expected value and authorization)

1. Deliver and independently verify one bounded, fresh buyer journey for off-grid well pumps (the current safe editorial release). Record the actual outcome and never replay an uncertain POST.
2. Unblock **highest economic upside:** verify WEDOS WordPress DB/uploads restorable snapshots and staging restore; after safety/approval gates, deploy refreshed catalog + Builder from `dev`, verify all price ages, compatibility and CTA/offer paths.
3. Join actual query → tool use → affiliate outbound event → approved/paid commission evidence through existing Prometheus Core adapters; change only buyer paths with measurable missing outcomes. Do not claim commission data without it.
