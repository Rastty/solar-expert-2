# SEO discovery bridges for high-impression heat-pump pages (14 October 2026)

## Source of truth and why now

The [14 Oct Prometheus Solar Expert GSC read-only capture](https://github.com/Rastty/prometheus-growth-os/actions/runs/38562692265), authenticated as site owner, reported for 28 days: **7 clicks, 1,043 impressions** (90 days 17/3,425). Of 16 newly tracked managed SEO URLs: 2 indexed, 11 unknown to Google, 3 other outcomes. Five older managed pages have been unknown for >=7 days, including **`/tepelne-cerpadlo-monoblok/`** and **`/tepelne-cerpadlo-vzduch-vzduch/`**. Submitted XML sitemap is **pending**; no evidence of a robots/noindex/HTTP or structural sitemap failure. Don't claim Google discovery just because a URL appears in public HTML.

Crucially, the GSC report identifies **all 6 high-intent query decision candidates as under a protected 28-day hold** after recent editorial updates. Rewriting titles or content again would destroy the measurement window. Instead add exactly scoped crawlable in-content editorial links at render time without touching post body, canonical, title, updated date, meta or publish status.

## Three direct routes

| Observed source with 28-day GSC signal | Actual signal | First related new destination | Second editorial destination |
|---|---:|---|---|
| `/umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda/` | 103 impressions, average position ~15.7, 0 clicks | `/tepelne-cerpadlo-monoblok/` | `/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/` |
| `/recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady/` | 30 impressions for exact Samsung review +20 for Slovak variant, 0 clicks | `/tepelne-cerpadlo-monoblok/` | `/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/` |
| `/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/` | 10 impressions for “nejlepší tepelná čerpadla”, plus other variants, 0 clicks | `/tepelne-cerpadlo-vzduch-vzduch/` | `/tepelne-cerpadlo-monoblok/` |

Signal scope matters: Samsung numbers are **query-specific subset**, not total page impressions or guaranteed distinct impressions. Do not sum them into an independent whole-site traffic estimate.

Both destinations are **published managed WordPress posts**, indexable, currently still unconfirmed/unknown to Google in GSC. Focus on discoverability before publishing additional redundant topic pages.

## Implementation guardrails

Extend the existing `inc/buyer-discovery.php` **exact slug mapping**, not a broad regex or sitewide keyword auto-linker. Append one `<aside>` with two conventional server-rendered `<a href>` links only to the matching main-post content. No links in feeds, secondary loops, admin, unrelated pages or posts; no duplicate block or duplicate link target; no affiliate URLs or claiming specific equipment automatically satisfies acoustic/hygiene rules. Existing monobloc versus split caveats are explicitly clear.

Preserve all existing 7 buyer routes, 76 exact low-value noindex exclusions, 26 protected GSC owners, price/affiliate attribution and all available controls. No WordPress database write or bulk rewrite.

## Verification and measurable outcome

- CI: 10 exact scope bridges, 3 new GSC source/target rows, all destination URLs managed, repeat-render suppression, no accidental off-topic placement.
- Auto deploy: require actual rendered public HTML with GSC source URL→2 related links, with real HTTP 200.
- Prometheus GSC follow-up 7/14/28 days: `URL is unknown to Google` → discovered/crawled (then indexed only if Google chooses), compare per-page impressions/clicks over settled lag. At 7 days after this deployment, do NOT infer causality solely from status change; rankings/CTR and downstream leads remain distinct.
- Rollback: remove only 3 exact map entries and redeploy; no WP restoration required.
