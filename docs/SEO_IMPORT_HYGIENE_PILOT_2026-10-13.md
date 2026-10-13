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
