# Deployment

## Source of truth

- Repository: `Rastty/solar-expert-2`
- Development/release candidate branch: `dev`
- WordPress package type: **theme**
- Theme root: **repository root (`.`)** — `style.css`, `functions.php` and templates live here.
- `plugin/solar-expert-core` is an optional fallback only and is **not required for the MVP**.
- Production domain: `solar-expert.cz`
- Production requires explicit manual approval.

The previous bootstrap path `theme/solar-expert-2` was removed and must not be used for deployment.

## First Deployer for Git connection

1. In WordPress, connect Deployer for Git to GitHub repository `Rastty/solar-expert-2`.
2. Install/connect it as a **theme**, using branch `dev`.
3. The repository root is the theme root; do not select the obsolete `theme/solar-expert-2` subdirectory.
4. Keep automatic production deployment disabled during the first verification.
5. Deploy/update the theme only after GitHub validation and WordPress Playground are green.
6. Do not publish newly managed money pages automatically. The manifest intentionally creates new pages as drafts.
7. Existing managed rewrites preserve their current WordPress status.

## Affiliate setup after the theme is present

Open **Settings → Solar Expert** and populate `solar_expert_affiliate_map`.

Merchant-specific keys use:

```json
{
  "products": {
    "product-id@merchant-id": "https://affiliate.example/...",
    "legacy-product-id": "https://affiliate.example/..."
  },
  "leads": {}
}
```

The merchant-specific key takes priority. Affiliate URLs are stored in the WordPress database, not committed to GitHub. They are not secrets once rendered as outbound links, but they stay out of the public repository for maintainability.

## Deployment health check

After the theme is deployed, open:

`/wp-json/solar-expert/v1/health`

Expected MVP values include:
- `status: ok`
- current theme version,
- 21 catalog products,
- current managed-content item count,
- affiliate mapping counts.

The endpoint intentionally exposes counts and versions only. It never returns affiliate URLs or account credentials.

## Pre-production gate

Before production activation, complete `docs/PREPROD_QA.md`.

Hard blockers:
- CI or Playground failure,
- PHP/JavaScript error,
- broken Builder result,
- merchant label pointing to another merchant's URL,
- wrong 12/24/48 V compatibility,
- broken existing URL or accidental status change,
- missing rollback path.

## Rollback

For the first production release, keep the currently working production theme available until Solar Expert 2.0 passes smoke testing.

If the new release fails:
1. switch back to the previously working theme/version immediately,
2. disable further deployment of the faulty `dev` head,
3. fix the issue on `dev`,
4. require green CI + Playground again before retrying.

Never repair production by making untracked manual code edits.
