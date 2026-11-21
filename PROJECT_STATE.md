# Solar Expert 2.0 — PROJECT_STATE

Updated: 2026-11-21 07:15 UTC. Truth: current GitHub `main`, protected WordPress publication receipts and authenticated live reads (not PR intent alone).

## Goal

Grow attributable affiliate and lead profit through a reliable solar decision path: user need → technically compatible configuration → current, purchasable merchant offer. Reuse relevant Prometheus Core capabilities; avoid duplicate engines.

## HOTOVO / production verified

- **Editorial release 23, WordPress #1612** `/jak-vybrat-mppt-regulator-pro-400w-panel/`: one contextual link to the live `/solarni-sestava-na-chatu/`, preserving the prior battery buyer handoff and adding Voc/Isc/off-grid caveats. Source PR #285, release PR #286; [production publisher #44879171892](https://github.com/Rastty/solar-expert-2/actions/runs/44879171892) returned `wp_verified`, archived encrypted prewrite and made one guarded WordPress POST. Separate GET-only recheck [#44878863806](https://github.com/Rastty/solar-expert-2/actions/runs/44878863806) attempt 2 confirmed #1612 `modified_gmt=2026-11-21T07:13:23`, SHA256 `cf03ec95…8bb4d3d`, exactly one Builder anchor, `writes=0` in the recheck.
- **Read-only buyer coverage** [PR #284](https://github.com/Rastty/solar-expert-2/pull/284): production source/identity checked for 8 existing commercial posts (#341, #1612, #1613, #1615, #1618, #1626, #1632, #1639). Builder anchor coverage improved **7/8 → 8/8** after revision 23; these are anchor counts, NOT measured click-through or conversion uplift. #1613 has 4 Builder anchors already; do not append duplicates. No content, buyer URLs or secrets are archived by the monitor.
- **Earlier editorial production releases:** #341 Builder bridge (rev 19, [run #44795604826](https://github.com/Rastty/solar-expert-2/actions/runs/44795604826)), #1632 off-grid Quote Checker (rev 20, [run #44799413810](https://github.com/Rastty/solar-expert-2/actions/runs/44799413810)), #1618 caravan Builder (rev 21, [run #44802015882](https://github.com/Rastty/solar-expert-2/actions/runs/44802015882)), #1626 24/7 Wi-Fi camera Builder (rev 22, [run #44803393284](https://github.com/Rastty/solar-expert-2/actions/runs/44803393284)). All `wp_verified`; additional verified content includes well-pump new post #1641 and pond-pump existing-post link #1639. Do not replay completed editorial revisions.
- All documented editorial changes are **WordPress post** changes. No claim that a `dev` theme, catalog, seller corrections or new application code reached production.

## OVĚŘENO / business evidence and unreleased work

- Latest documented live theme/offer sample (2026-11-20, **not refreshed in this run**): theme `0.12.27`, 24 catalog products, **52/52 price snapshots stale** under the 30-day policy. Seller drift monitor validated 49/52 exact URLs; 3 Vselektro URLs inconclusive. `dev` contains tested offer/Builder fixes, including Pylontech/SEPLOS stock downgrades and alternative fully linked quote, but deployment is not verified.
- Earlier 28-day public aggregate: 208 tool views, 8 starts, 3 affiliate clicks, 0 lead clicks. Events are not unique visitors; no approved/paid commission or causal conversion lift verified.
- **Prepared, not published:** circulation-pump UPS buyer article (PR #270, pinned manifest `solar-circulation-pump-ups-20261120-v1`) and 2000W LiFePO4 inverter-battery guide (PR #274). Last confirmed NEW post was 2026-11-20 13:30:38 UTC. No next new post before **2026-11-21 13:30:38 UTC (14:30:38 Europe/Prague)**, with a fresh absence and most-recent-post check. Release 23 was an existing-post append, not a new post.

## BLOKACE / release gates

- [#148](https://github.com/Rastty/solar-expert-2/issues/148) remains the production theme release gate: old PHP may auto-sync managed content; source parity/staging artifact alone does not prove DB/uploads restoration or exact live rollback. Owner does not want WEDOS backup work. Do not bypass or call a code-only PR a deployed fix. Assets have no separately approved deployment channel.
- Prometheus Core Solar GSC [#2219](https://github.com/Rastty/prometheus-growth-os/issues/2219): repeated `PAGES28_FAILED_403` as of Nov 20; no trustworthy fresh 28/90d search rankings for this site. Don't invent SEO trends or repeat Core diagnosis.
- Publisher is one-write, CAS-guarded, encrypted-prewrite. Never retry ambiguous POST; other agents must check current `ops/editorial-release.json` before arming a next revision.

## DALŠÍ PRIORITA (effect / effort)

1. **High effect, gated:** get a safe production path for tested `dev` offer and Builder improvements (#148) while protecting existing content; exact confirmed seller stock/price must precede buyer-facing offers.
2. **Next isolated SEO publication:** after the 24h NEW-post gate and fresh WordPress absence check, activate **editorial revision 24** for the already prepared UPS circulation-pump guide. Do not use revision 23 again. Later publish 2000W battery guide in its own later 24h window.
3. **Evidence/monetization:** let Prometheus Core restore GSC #2219; reconcile first-party affiliate clicks with partner-confirmed approved/paid commissions. Avoid more repeated Builder links before measured results.

History and detailed prior evidence are preserved in `docs/archive/PROJECT_STATE-20261120-before-compact.md`.
