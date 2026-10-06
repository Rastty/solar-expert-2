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
4. calls the secret Deployer for Git Push-to-Deploy URL;
5. polls `/wp-json/solar-expert/v1/health`;
6. succeeds only when the live theme version matches `style.css`, managed content is current and sync errors are zero.

If `SOLAR_EXPERT_DEPLOY_URL` is not configured, the workflow exits safely without deploying.

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
