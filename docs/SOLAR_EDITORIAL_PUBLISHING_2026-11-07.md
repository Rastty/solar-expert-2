# Solar Expert: safe editorial publication lane (2026-11-07)

## Goal

Publish **useful high-intent Czech buyer guides**, with Git as editorial source-of-truth, directly into existing WordPress posts without waiting for whole-theme deployments, and reconcile the same source/manifest when the separate reviewed theme release is eventually approved. A published WordPress post is NOT proof that a theme PR has shipped; likewise a green CI/PR is NOT an actual post publication.

## Execution owner and cadence

The user requested the same bounded publication capability as the other portfolio websites on 2026-11-07. ChatGPT's scheduled automation limit is **five active tasks**, so a new separate Solar Growth Runner could not be created. The existing hourly **Portfolio Control worker** was updated to allow a **scoped Solar Expert editorial lane** while retaining its other site priorities. This does NOT mean the worker has completed any future publication yet.

At most **one new unique post per 24 hours**, only if the topic is genuinely distinct, source-backed and commercially relevant. Small measured contextual link fixes are more useful than mass-generated shallow posts. Avoid fake GSC search volumes, novelty claims, fabricated retailers/prices or blanket affiliate rankings.

## Routine publication, no theme deploy

1. **Current state first:** read latest `Rastty/solar-expert-2` dev, open PRs, `content/manifest.json`, actual WP post slugs/status, buyer guide clusters and any trustworthy recent GSC evidence. Check for pre-existing post or draft to avoid duplicate slugs.
2. **Editorial source first:** create or update `content/rewrites/<slug>.html` on a dedicated GitHub branch, use `content/manifest.json` with `create_if_missing:true`, `status:publish`, `publish_ready:true`, `indexable:true`, exact category and canonical slug, plus safe `inc/core.php` SEO metadata. Add deterministic technical/source/buyer-route regression tests. Open a PR against dev. Never merge into dev merely to publish a post, because `dev` also triggers the production-theme release workflow.
3. **Bounded WP REST write:** for an explicitly owner-authorized low-risk new editorial item, use authenticated WordPress `POST /wp/v2/posts` with that *exact* GitHub HTML, slug, title, status=publish, category ID confirmed live. Record returned post ID/status/link. Never assume a POST error means it failed: GET the exact slug before retrying. Use GET/readback to prove status and uniqueness.
4. **Edits:** retrieve exact old raw snippet via `/wpvibe/v1/content/search` where available, prove exactly one occurrence, then use match-once `/wpvibe/v1/content/edit`. Confirm old count=0/new count=1; if 521/timeout, read back before any repeat. Do not round-trip full post HTML through copy/replace when a snippet edit suffices. Keep the GitHub source the same.
5. **Buyer bridge:** add contextually useful links from an existing published buyer guide, preserving unrelated content and link attribution. Update Git source and WP raw content consistently. The homepage/theme discovery change remains **Git-only** until a separately safe theme deployment.
6. **Record actual receipt:** `WP_CREATED` count and post IDs, `WP_EDITED` count, exact real post URL, REST readback, associated GitHub commit/PR, release blockers and *no claimed revenue without network proof*.

Do not use new post creation as a shortcut to bypass release controls for code or risky global WordPress database mutations. No theme files, plugin activations, direct database SQL or global content sync are modified through this low-risk lane.

## 2026-11-07 first publication receipt

**WordPress post #1618 — CREATED & published:**

- URL: https://solar-expert.cz/solarni-panel-na-karavan-200w/
- Exact slug `solarni-panel-na-karavan-200w`, category slug `solarni-panely` (WordPress category ID 2), published status confirmed through authenticated REST.
- Source: `content/rewrites/solarni-panel-na-karavan-200w.html`; model 190Wp Victron panel is source-backed; 200Wp phrase is a general buying intent, **not** a fabricated specific 200Wp product.
- The first attempt to change an overpromising Isc CTA returned HTTP 521. A subsequent **read-only exact-snippet search** found the original once; ONE controlled retry replaced it once; readback found old=0 and new=1. This ensures no false promise that unreleased MPPT Isc features already exist.

**WordPress post #1615 — EDITED:**

- URL: https://solar-expert.cz/jakou-baterii-k-solarnimu-panelu-400w/
- Appended one contextual link to the new caravan page via a byte-exact match-once edit; verified actual count=1. Git-managed article source updated equally.

**GitHub:** PR #153 has source article, managed manifest entry, source-controlled Yoast metadata, safer live tool copy, homepage future-release discovery, contextual backlink and specific content/taxonomy/SEO tests. WordPress production theme **not** updated.

**Independent public HTML probe limitation:** external web fetch from this execution environment could not load the new URL; authenticated WP API confirmed `status=publish`, post ID, slug/link and exact raw content edits. Do not report an independent public HTTP/Google crawl or live homepage link until separately proven.

## Code release gate remains intact

[PR #142](https://github.com/Rastty/solar-expert-2/pull/142) (release source rollback + private DB/uploads attestation), [issue #148](https://github.com/Rastty/solar-expert-2/issues/148) (real host backup and staging restore proof), [PR #146](https://github.com/Rastty/solar-expert-2/pull/146), [#147](https://github.com/Rastty/solar-expert-2/pull/147), [#149](https://github.com/Rastty/solar-expert-2/pull/149), [#150](https://github.com/Rastty/solar-expert-2/pull/150) and [#152](https://github.com/Rastty/solar-expert-2/pull/152) are separate from individual editorial REST writes. No production theme deploy/merged release occurs without their required review and host recovery evidence.

## Longer-term publisher hardening

The direct WordPress REST connector supports this first bounded publication, but a Dalko/KLIX-style **GitHub Actions → WordPress REST publisher** requires separate reviewer-approved workflow, scoped WordPress application-password secret, write-once operation IDs, prior raw revision guard, prewrite private backup, single POST, authenticated + public readback and immediate safe stop on ambiguous outcomes. Do **not** claim such GitHub Actions publisher is already active on Solar Expert. Keep publication limited and traceable until it is proven.
