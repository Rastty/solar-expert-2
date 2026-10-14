# SEO hygiene pilot: old imported foreign-market posts (2026-10-13)

## What was verified

- Live connected WordPress REST inventory: `solarni-panely` has **370** published posts and `tepelna-cerpadla` **96**; category counts are *not* the site's indexed URL counts and may overlap.
- Recent live solar posts contain a **repeated title** `Dnes v energetice – US Energy Information Administration (EIA)`, with URLs suffixed from `-1` to `-19`; WP REST verified `...-19/` is public and published.
- Other exact imported URLs cover US federal energy data and US tax credit rules (e.g. IRS Form 5695), or historic Jamaica news. These topics do not answer the Czech buyer's FVE/MPPT/heat-pump decision.
- Latest available Prometheus GSC daily snapshot (13 Oct, [run 38413995034](https://github.com/Rastty/prometheus-growth-os/actions/runs/38413995034)): 28d **6 clicks / 1,044 impressions**; 90d **16 clicks / 3,435 impressions**; 12 of 14 monitored recently created managed pages `URL unknown to Google`. The root sitemap was submitted 12 Oct but GSC still marked pending. This snapshot **does not prove every foreign import has zero impressions**. Do not present it as a complete URL-level audit.

## Executed pilot

- Only **29 explicitly identified candidate slugs**:
  - One same-title EIA base + bounded `-1` through `-19`: 20 identifiers.
  - Five exact US EIA energy-data slugs, two US tax-code slugs and two unrelated Jamaica news slugs: nine identifiers.
- The theme suppresses these identifiers **only if WordPress has a published Post with a matching exact slug**. Nonexistent candidates do nothing.
- Yoast `wpseo_robots`: `noindex, follow` on matching individual published posts.
- Yoast `wpseo_exclude_from_sitemap_by_post_ids`: exclude actual matching published IDs, merged with existing redirect exclusions; one bounded exact-slug WP query, never all posts.
- **No deletion, no 301/410, no post body rewrite, no URL/date/canonical/product/affiliate mutation, no robots.txt disallow.** Originals stay accessible (HTTP 200) to Google until it processes `noindex`.
- Manifest-protected editorial posts/pages always remain eligible. If the managed-content manifest is unreadable or invalid, cleanup **fails open** (no new indexing exclusions).
- CI checks all 29 slugs, source-manifest disjointness, specific known GSC near-wins, WordPress post type/status scope, Yoast filters, query boundedness, and safe fail-open.
- Production release smoke checks **two actual imported public posts** display `noindex`, a known indexed technical near-win stays indexable, and logs sitemap propagation. The general crawler gate continues to verify all managed URLs/sitemaps.

## Follow-up and rollback

- **No instant SEO uplift claimed.** Google may still crawl `noindex` URLs until it records the tag; removal from XML sitemap alone does not force or guarantee deindexation or improved rankings.
- Evaluate at days 7/14/28: GSC indexed-page states, overall impressions and clicks; compare discovery of the off-grid MPPT and cottage guide URLs. Distinguish normal GSC processing delay from an actual technical block.
- If an imported URL proves to have valuable Czech buyer queries/backlinks and merits an editorial refresh, remove its *exact slug* from `solar_expert_import_cleanup_slugs()` (or add it to the managed manifest with reviewed content). Theme/PR rollback removes both sitemap exclusion and `noindex` without database restoration.
- Do **not** broadly suppress unreviewed legacy posts by age or blanket category membership, and do not manufacture Google indexing via the Indexing API.


## Bulk expansion: 13 October 2026 — 66 identified URLs

Second read-only WP-CLI audit enumerated **all 476 published WordPress posts** across pagination (100 + 100 + 100 + 100 + 76), not only the most recent page. This figure is the published **post** count, not page count or GSC indexed count. The review identified **37 additional exact-slug foreign-market imports**, on top of the 29-candidate pilot:

- US-only EIA/SEIA/California/Washington, local programs, US tax/incentives, foreign manufacturer business stories and syndicated press items.
- Australia/Queensland/Tasmania/Irish/Delhi and international news with no direct Czech home-installation purchase relevance.
- Explicit foreign third-party news coverage that is not original Czech technical decision guidance. Broad topical articles without a strong foreign-market marker **remain indexable** pending content review; e.g. Czech solar installation deposits, solar cell fundamentals, batteries, thermal pump articles.

**Scope: exactly 66 exact candidate slugs, 0 automatic blanket matches, no deletions and no redirects.** Existing URLs remain publicly viewable at HTTP 200. A match applies only to a published post, excluding managed-manifest content and a distinct **26-slug allowlist of GSC near-wins / query owners** from 13 October Prometheus read-only evidence [run 38413995034](https://github.com/Rastty/prometheus-growth-os/actions/runs/38413995034). The latest GSC feed is a *near-wins subset*, not a complete query for every one of the 476 posts. Therefore do not assume zero clicks for the noindexed imports.

### Bug found and corrected in this batch

The pilot's sitemap exclusion queried by exact slug but incorrectly capped WP_Query at **40 results**, which would silently leave part of the enlarged batch in the post sitemap. The limit is now `count(solar_expert_import_cleanup_slugs())` (66), with hard upper bound by the audited whitelist. Regression creates **all 66 matching WordPress posts** plus a protected ranking URL and checks all 66 are excluded from the sitemap, without modifying those public posts.

### Real production verification and rollback

- CI: 66 exact unique slugs, 26 GSC-protected slugs, manifest intersection=zero, all-post sitemap coverage and fail-open when manifest absent.
- Live QA: two old and three newly selected imports return HTTP 200 with `noindex, follow`; indexed string tutorial still returns without noindex. Sitewide buyer SEO, Yoast sitemap and affiliate gates remain unchanged.
- Yoast XML sitemap eligibility is updated immediately at theme level but cache/GSC may lag; check indexed state and crawl in 7/14/28 days. IndexNow does not make this a Google indexing request.
- To reverse, delete a precise slug from `solar_expert_import_cleanup_slugs()` and redeploy. No WP database restoration necessary; content was never removed. If a GSC source later proves a candidate is profitable or contextually relevant, prioritize editorial rehabilitation.

## Second cleanup cohort: 10 non-buyer trivia/listicle posts (2026-10-13)

The full 476-post inventory was further compared using `MD5(post_content)` and normalized 700-character intros on live WordPress (read-only SQL). **One** pair has exactly identical 15,128-character bodies: `tepelne-cerpadla-lg-vyhody-nevyhody-ceny` (post 549) and `tepelna-cerpadla-lg-vyhody-nevyhody-ceny` (post 1584). **Already consolidated by the existing 301 from the latter URL to the former**, which is the GSC observed query owner; do not invert the redirect or noindex the destination. The repeated EIA news series also shares the same imported boilerplate intro, and is already inside the foreign-import noindex cohort. The two other old definitions/news pages matching at 700 chars diverge by 1,500 chars; not an exact duplicate and not automatically suppressed.

Separately, 10 explicitly reviewed low-intent articles with numbered trivia/climate/history lists were identified, distinct from technical decision guides:

- `2-pozoruhodna-fakta-ktera-ilustruji-klesajici-naklady-na-solarni-energii`
- `10-faktu-o-solarni-energii-ktera-vas-mozna-prekvapi`
- `7-zajimavych-faktu-o-obnovitelne-energii`
- `14-zajimavych-faktu-o-solarni-energii-ktere-potrebujete-vedet`
- `9-faktu-ktere-jste-o-solarni-energii-pravdepodobne-nevedeli`
- `10-nejlepsich-faktu-o-solarni-energii-solarni-pruvodce`
- `8-faktu-o-zmene-klimatu`
- `6-vyvracenych-mytu-o-solarni-energii`
- `6-mist-pro-uceni-o-solarni-energii`
- `prekvapiva-historie-solarnich-panelu-detsky-pruvodce-obnovitelnymi-zdroji-energie`

These 10 received `noindex, follow` and removal from Yoast post sitemap by exact slug in addition to the existing 66 imported posts: **76 total**. Body/text sampling directly in the connected WP database confirmed these are generic facts and environmental descriptions, in several cases with legacy `[su_button url="https://solar-expert.cz/poptavka"...]` shortcode and externally copied markup. **This cohort is a reversible editorial relevance judgment, not a claim that the ten article bodies are identical or have zero GSC traffic.** The Prometheus near-win/query subset protects 26 historically relevant URL slugs, but is NOT a complete crawl/backlink/traffic export for every page.

Keep articles with plausible purchase intent despite similar title words, e.g. `fakta-o-solarnich-panelech-ktera-byste-meli-vedet-pred-nakupem`, plus the reviewed canonical technical guides and managed-manifest posts. The application only targets existing published WordPress posts and fails open without the managed manifest. No WordPress database mutation, deletions, URL changes, redirects or affiliate edits. The 76 candidate limit is exhaustive and now exercised by CI with all 76 fixture IDs; the production release checks real public Yoast robots tags on 3 of the new generic entries in addition to 5 previous import examples.

Follow up with GSC at 7/14/28 days and promote/review any manually judged page which turns out to receive relevant buyer queries or high-quality inbound links. To roll back, remove the individual slug and redeploy, restoring Yoast index eligibility.
