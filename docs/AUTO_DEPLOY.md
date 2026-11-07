# Solar Expert auto-deploy

Solar Expert uses **Deployer for Git → Push-to-Deploy** as the production deployment trigger.

## One-time setup

1. In WordPress admin open **Deployer for Git** and the connected Solar Expert theme package.
2. Confirm the package tracks branch **`dev`**.
3. Click **Show Push-to-Deploy URL** and copy the full generated URL.
4. In GitHub open **Rastty/solar-expert-2 → Settings → Secrets and variables → Actions**.
5. Create a repository secret named exactly **`SOLAR_EXPERT_DEPLOY_URL`** and paste the Push-to-Deploy URL as its value.
6. Never commit or paste the URL into repository files, issues, PRs or logs.

## What happens after setup

Every push to `dev` starts **Auto Deploy Solar Expert Dev**.

The workflow:

1. verifies the `dev` commit came from a merged pull request; direct pushes to `dev` are not auto-deployed;
2. waits for **Validate Solar Expert** (`validate`) on the merge commit;
3. resolves the merged PR head and requires its **WordPress Playground Preview** (`preview`) to be successful;
4. requires the release-scoped private database/uploads backup receipt and staging-restore attestation; then snapshots previous live theme source before mutations;
5. calls the secret Deployer for Git Push-to-Deploy URL;
5. polls `/wp-json/solar-expert/v1/health`;
6. succeeds only when the live theme version matches `style.css`, managed content is current and sync errors are zero.

If `SOLAR_EXPERT_DEPLOY_URL` is not configured, the workflow exits safely without deploying.

## Mandatory pre-release WordPress database + media recovery attestation

A release is **blocked before the first Deployer request** unless the private GitHub Actions secret `SOLAR_EXPERT_WORDPRESS_BACKUP_RECEIPT` contains a valid owner-attested snapshot **for this exact previous `dev` commit**, backed by BOTH a database and `wp-content/uploads` backup no older than 24 hours and a successful staging restore rehearsal no older than 30 days. Missing evidence, wrong SHA, stale timestamps, missing upload copy or a failed rehearsal **hard fail the release**. The guard is checked even when the Deployer webhook secret is configured.

This is a **private administrator attestation** and a replay-resistant code safety check, not proof that GitHub examined actual database/media backup bytes or performed a real restoration. **Do not invent an attestation before host-level backup and staging restore have actually been verified.** Complete receipt format and workflow: [WordPress Restore Attestation](WORDPRESS_RESTORE_ATTESTATION.md) and [issue #148](https://github.com/Rastty/solar-expert-2/issues/148).

**Offline regression:** `node --test tests/deploy-wordpress-backup-gate.test.mjs` executes the actual inline Bash preflight with mocked sources and rejects missing, stale, malformed, wrongly bound and unapproved backup receipts.

## Verified previous-theme source package — pre-deploy gate

Before **any** Deployer request on an approved `dev` PR merge, the guarded workflow now:

1. Uses the merge commit's **first parent** as a previous-code rollback *candidate*, fetched with `actions/checkout` depth 2.
2. Fetches four real public live theme files via cache-busted, read-only URLs: `style.css`, `assets/js/selectors.js`, `assets/js/affiliate-adapter.js`, and `assets/data/product-seed.json`. Each **SHA256 must equal the byte content from that candidate Git commit**, not just a reused theme version string. A missing file, unexpected redirect, transport failure or changed hash **blocks the release before WordPress is mutated**.
3. Creates a `git archive` snapshot from that exact old Git commit and an SHA256 manifest with its public verification fingerprint, two commit IDs and explicit restore limitations.
4. Uploads the source package as `solar-expert-verified-predeploy-<run-id>`, retained for **90 days**. The **upload must succeed before Deployer can be triggered**; no secrets, private WP affiliate options, WordPress database or customer files are included.

This is **persisted previous-theme CODE evidence, not a verified end-to-end WordPress rollback**. A code archive alone does not restore the managed-post database, private affiliate settings or content-sync side effects. Before authorizing a live release, maintain a separately reviewed/verified *WordPress content/data rollback procedure*, including the ability to restore the pre-release database or safely reconcile post state. If the prior live state differs from Git's first parent, investigate the source drift; never override the mismatch just to ship.

**Offline regression:** `node --test tests/deploy-rollback-evidence.test.mjs` executes the real preflight shell against mocked prior git/public live bytes, checking both successful archive creation and fail-closed mismatch/unknown-parent cases. It never calls an actual production endpoint.

## Rollback

Production remains repo-driven. If a release is bad, revert the offending commit(s) on `dev`. The same gated auto-deploy path will ship the reverted state after CI passes.

For an urgent manual fallback, use Deployer for Git's normal Pull/Update action.

## Safety rule

Production auto-deploy is intentionally PR-only. A direct push to `dev` can still run validation, but the deployment workflow refuses to call production because there is no reviewed/previewed PR to prove the WordPress preview gate passed.

## Deployment switchover

Deployer for Git may make the public site or health endpoint unreachable for a few seconds while theme files are switched. The verifier therefore waits briefly and retries transport/invalid-JSON failures. A valid health payload that reports managed-content errors still fails the deployment immediately.

## Reliable release verification

The health endpoint reads the deployed version directly from the active theme's `style.css`, avoiding stale WordPress theme-header cache after file replacement. If the new release is live but managed content is still pending, CI calls `wp-cron.php` to process due sync events and keeps polling until health is current or the guarded timeout is reached.

## Deployer response contract

The webhook endpoint returns JSON. CI now requires `success=true` and logs only the non-secret response fields (`message`, `package_type`, `package_slug`). A HTTP 200 carrying `success=false` is treated as a failed deployment.

## Fresh branch ZIP delay

Deployer for Git documents that GitHub may briefly serve a stale branch ZIP immediately after a push. The workflow therefore waits 15 seconds after CI/preview gates before calling Push-to-Deploy. HTTP 200 is the plugin's documented primary success signal; if a JSON body is returned, an explicit `success=false` still blocks deployment.

## Cache-safe trigger

Although Deployer for Git accepts both GET and POST, Solar Expert uses POST with a unique `ci_nonce` query value. This prevents an intermediary cache from serving a previous response to the static Push-to-Deploy URL without executing WordPress.

## Production host method

The production host returned HTTP 422 for POST even though the plugin endpoint supports it in general. Solar Expert therefore uses GET, which is accepted by this host, plus the per-release `ci_nonce` to prevent cached webhook responses.

## Canonical endpoint normalization

The GitHub secret may contain the full URL copied from Deployer for Git. CI extracts only its `secret` query value in-memory and rebuilds the documented Solar Expert endpoint `/wp-json/dfg/v1/package_update?secret=…&type=theme&package=solar-expert-2`. The secret and reconstructed URL are never printed. No-cache request headers are used instead of adding unsupported query parameters.

The canonical endpoint is constructed in-memory inside the shell step without YAML heredocs; the reconstructed secret URL is masked before use.

## Managed-content cron lock

CI must not pass its own `doing_wp_cron` value. That parameter is WordPress's internal cron-lock token and is normally created by WordPress itself. Solar Expert therefore calls `wp-cron.php` with only a harmless cache-busting release parameter; WordPress creates and validates its own cron lock, allowing the due managed-content sync event to execute.

## Deterministic managed-content convergence

After Deployer reports a successful theme update, CI POSTs the expected theme version and fixed intent `managed-content-sync-v1` to `/wp-json/solar-expert/v1/deploy-sync`. The endpoint accepts no content payload, URLs, post IDs or arbitrary fields; it can only apply the static managed manifest already present in the active deployed theme. A mismatched release version is rejected, concurrent syncs are locked, and an already-current site is a no-op. WP-Cron remains available only as a fallback for non-CI/manual deployments.

## Boolean health parsing

The verifier must preserve explicit JSON `false` values. In jq, `false // true` evaluates to `true`, so Solar Expert uses an explicit `has("content_sync_required")` check before converting the boolean to text.

## Publicly rendered solar CTA gate

The deploy workflow also validates the real HTML of `/fve-panely-na-strechu/` after the version, managed-content and crawler checks. A cache-busted fetch must contain the residential FVE comparison checklist CTA and existing E.ON `solar_legacy_article` attribution, while excluding the superseded generic Quote Checker instruction. A stale CDN/WordPress page cache or unrefreshed `the_content` renderer now fails the release instead of letting a correct theme version masquerade as a verified live conversion path.
