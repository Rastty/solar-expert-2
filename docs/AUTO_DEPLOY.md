# Solar Expert production theme release — guarded runbook

## What does NOT deploy

Normal pushes and PR merges to `dev` run code validation, WordPress
Playground, and the Catalog Freshness Watch. They **do not** publish a new
theme or update WordPress. `ops/theme-deploy-release.json` starts with
`enabled:false`. The `release-intent` job succeeds but `deploy` is
skipped when that explicit control did not change on the current push.
The workflow uses non-cancelling release concurrency so an in-flight
production verification cannot be cut short by a newer merge.

The separate main-branch `ops/editorial-release.json` is a single-post
editorial authorization, **not** permission to deploy the whole theme.
It has independent 24h and one-write safety controls.

## Preconditions for a real release

1. Complete and independently verify the **host-level WordPress database
   and `wp-content/uploads` snapshot**, including managed pages/posts,
   SEO/categories/options and private affiliate mapping. Rehearse an
   actual restore on staging. This is **open blocker
   [#148](https://github.com/Rastty/solar-expert-2/issues/148)**, not
   something CI can generate or attest on its own.
2. Produce the private, release-scoped JSON
   `SOLAR_EXPERT_WORDPRESS_BACKUP_RECEIPT` per
   [restore attestation contract](WORDPRESS_RESTORE_ATTESTATION.md).
   Its refs must identify **real external** host backups and staging drill;
   the previous `dev` SHA must match the actual first parent of the
   upcoming release. No credentials or backup files in GitHub issues,
   public commits or log output.
3. Review the complete release scope and acquire current-head green
   `Validate Solar Expert` and `WordPress Playground Preview` results.
   Verify existing production version and the exact prior-live source
   fingerprint. Do not assume previous `dev` equals live when several
   feature merges were integrated without deployment.
4. In a **separate reviewed PR** to `dev`, deliberately change
   `ops/theme-deploy-release.json` to `enabled:true` and a unique
   `solar-theme-*` release ID. Only that changed control on the merged
   push passes the release-intent guard. A later push that merely leaves
   `enabled:true` unchanged cannot authorize a new release.

## Order of production checks

Before the first potential production mutation, `deploy`:

- Confirms a merged PR for the exact commit and green validation/preview.
- Verifies a recent, first-parent-SHA-bound **private DB + uploads backup
  receipt** (snapshot within 24 hours; staging restore within 30 days).
  The receipt is **not** independently validated backup contents.
- Compares four public live theme source files byte-for-byte to the
  previous Git rollback candidate: `style.css`,
  `assets/js/selectors.js`, `assets/js/affiliate-adapter.js` and
  `assets/data/product-seed.json`. Unknown code drift **blocks**.
- Archives and round-trip verifies that previous source snapshot; an
  artifact uploaded with 90-day retention must succeed first.
  This is a **theme CODE archive**, never a WordPress database/media
  backup.
- Confirms `dev` still points at the exact approved commit, then issues
  exactly **one** Deployer for Git request. It does **not** automatically
  retry the mutation after a timeout or follow a redirect; an HTTP 200
  is not sufficient without a single JSON receipt with
  `success:true`, `package_type:"theme"`,
  `package_slug:"solar-expert-2"`.
- Reconfirms `dev` before the managed-content sync POST. Known
  non-mutating readiness responses may be retried, but ambiguous
  transport or 503 results **never** trigger an automatic second POST.
- Reads public version/content health, exact shipped public source
  bytes, SEO, theme and buyer tools, routes, attribution and CTA checks.
  No commission/revenue claim is made from a passing technical check.

WordPress managed posts tagged `native_editorial_owned:true` and
strictly `create_if_missing:false,preserve_status:true` cannot have
their body/title/status replaced by theme sync. Other managed content
can change on deployment: this is why a real WordPress DB backup is
mandatory.

## Recovery and release drift

If a source mismatch appears, **stop**. The current public theme can be
older than the last `dev` commit because integration merges are not
releases; a new release cannot be approved simply by skipping the hash.
The release owner must reconcile the actual public code baseline and
test an authorized migration/rollback plan, then rerun current checks.

If a deployment response is ambiguous, investigate through read-only
health/WordPress inspection **without repeating the live mutation**.
Use the genuine external database/media backups and restore rehearsal,
plus the verified archived old theme code when executing an approved
rollback. A simple `git revert` on `dev` is not a full data rollback and
does not itself authorize a second deployment.

Disable the explicit release control in a separate reviewed PR after
the release. The disarm push will not deploy.

## Endpoints / secret discipline

The configured `SOLAR_EXPERT_DEPLOY_URL` is a private GitHub Actions
secret. The workflow reconstructs the expected theme-specific
`/wp-json/dfg/v1/package_update` request from it without printing the
secret. Do not paste the URL into public logs/issues. Current host
requires GET on this endpoint. Public readback uses cache-busted GETs;
managed-content sync uses its narrowly scoped version+intent contract.
No `wp-cron.php` manual spoofing or generic website writes are allowed.

The exact software safety checks run on each `dev` PR as part of the
repository's offline validation. They do not replace independent
human/host verification that DB and media can actually be restored.
