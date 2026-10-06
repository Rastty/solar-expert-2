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

1. waits until both **Validate Solar Expert** (`validate`) and **WordPress Playground Preview** (`preview`) are successful for the same commit;
2. refuses deployment if either check fails or does not complete in time;
3. calls the secret Deployer for Git Push-to-Deploy URL;
4. polls `/wp-json/solar-expert/v1/health`;
5. succeeds only when the live theme version matches `style.css`, managed content is current and sync errors are zero.

If `SOLAR_EXPERT_DEPLOY_URL` is not configured, the workflow exits safely without deploying.

## Rollback

Production remains repo-driven. If a release is bad, revert the offending commit(s) on `dev`. The same gated auto-deploy path will ship the reverted state after CI passes.

For an urgent manual fallback, use Deployer for Git's normal Pull/Update action.
