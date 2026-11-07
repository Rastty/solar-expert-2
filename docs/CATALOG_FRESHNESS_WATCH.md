# Solar Expert — autonomous catalog price-evidence freshness watch

This is a **read-only source-evidence age monitor**. It never claims a real-time retailer price/stock check. It never updates `verified_at`, prices, seller URLs, affiliate links, WordPress, or any buyer-visible content.

## Inputs and output

- Canonical source: `data/product-seed.json`, required to match `assets/data/product-seed.json` **byte-for-byte**. Mismatch fails the job.
- The 30-day time rule exactly follows `assets/js/product-matcher.js`: age in complete UTC days is `floor((now - verified_at 00:00Z) / 86,400,000)`. An offer is stale when age is **greater than 30**; `verified_at=2026-10-13` first becomes stale at **2026-11-13 00:00 UTC**.
- A 7-day warning window marks offer rows as `expiring_soon`, not stale. Explicit `unknown` and `future_dated` classifications prevent silent fake evidence.
- All **product** and **bundle/set** offers are evaluated separately, preserving merchant identity. Discontinued rows without real offers are skipped; duplicate IDs per merchant fail validation.
- Output: GitHub Actions job summary + `artifacts/catalog-freshness.json` retained 30 days. A stale-price alert emits a visible Actions warning but does **not** fail, block deployment, remove customer links, or invent new source observations. Catalog parity or invalid source still fails closed.

## Checks

- `node --test tests/catalog-freshness.test.mjs`
- `node tools/catalog-freshness.mjs`
- Optional reproducible time: `CATALOG_NOW_UTC=2026-11-07T12:00:00Z node tools/catalog-freshness.mjs`

The watch runs on `dev` changes and by `workflow_dispatch` after it is reviewed and merged. The workflow specifies a **05:19 UTC daily** cron, with `ref: dev` for scheduled runs to ensure the real production source is audited.

**Activation caveat (critical):** GitHub scheduled Actions load workflow definitions **only from the repository default branch**, which is currently `main`, while Solar Expert actually develops and deploys from `dev`. Merging this PR into `dev` does NOT by itself activate the daily cron. A separately reviewed **workflow-only sync of this file to `main`** is required. Do not merge all `dev` application code into `main` just to activate scheduling, and do not claim daily monitoring is running until a successful scheduled Actions run is observed. Alternatively the existing portfolio scheduler can dispatch the read-only monitor on `dev`.

## Current expected baseline

- Before the catalog-refresh PR #146 lands in `dev`, the 2026-11-07 source snapshot has **45 stale product offers**, **4 stale bundle-deal offers**, and **3 VSelektro offers with October 13 verification approaching expiry**.
- PR #146 now provides **all 48 newly checked product merchant offers, plus 4 exact checked bundle-deal merchant listings**, including **3 independently rechecked VSelektro MPPT models** with matching 2026-11-07 public prices and stock. Following that approved release, **52/52** source offers are fresh as-of 2026-11-07 and next expire on **2026-12-09 00:00 UTC** if never reverified.
- The watcher cannot establish product identity, VAT-inclusive price, stock, merchant affiliate attribution, or actual commission. A vendor's HTTP 200 is not evidence of those facts. Use exact retailer pages before updating the catalog.

## Release safety

This workflow is deliberately independent from the production deploy action. It does not ask for or receive `SOLAR_EXPERT_DEPLOY_URL` and never calls the Deployer webhook. It uses read-only repository permission and does not require WordPress credentials. Existing PR #142 independent release-safety approval and persisted rollback remain mandatory before any production merge.
