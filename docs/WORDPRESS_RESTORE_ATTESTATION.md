# Solar Expert – release-scoped WordPress data restore gate (P0)

**Applies to the guarded production theme release only after the current-`dev` safety integration PR is merged.** The default release-intent switch remains disabled, so routine development merges do not touch WordPress. This private receipt is a release safety requirement, **not a backup** and not independent proof that an actual staging restore worked. Issue #148 stays open until real host evidence exists.

## Problem this prevents

The Deployer for Git push updates a WordPress theme, but that theme also manages public posts and SEO fields through `managed-content-sync-v1`. A GitHub source archive restores code only; it cannot restore the **MySQL WordPress database, wp_options (including private affiliate mapping), managed posts/metadata, terms or wp-content/uploads media** that may change during a release. The first-parent archive and public file hash check alone cannot prove the managed site can be rolled back.

## Mandatory private evidence before EACH merged PR release

After staging has actually restored an eligible full backup, the host/release owner must independently verify:

1. The hosting provider or trusted backup mechanism produced a **recent DB backup** for solar-expert.cz (the same pre-release WordPress DB that will be mutated).
2. A matching recoverable copy of `wp-content/uploads` exists; verify how its point-in-time relates to the database snapshot. **Theme files are NOT enough.**
3. A restore trial onto a separate staging/test installation has been completed within the preceding 30 days, recovering representative managed pages, SEO meta, private affiliate option values (checked privately; do not publish) and media. Record actual backup and rehearsal identifiers in private host records.
4. The backup snapshot is no older than 24 hours when the workflow reaches the gate, is not future-dated, and belongs to the **exact preceding `dev` SHA** which matches the public four-file pre-deploy snapshot.
5. A responsible reviewer attests in private that both kinds of content are restorable and the staging drill passed. This attestation **does not independently verify the backup bytes or prove the host can restore**, so the reviewer must retain real external restore evidence. Do not invent a backup ID or mark tests as passed without a real restore.

## GitHub secret (not an issue comment, repo file or PR attachment)

Configure one **repository Actions secret** `SOLAR_EXPERT_WORDPRESS_BACKUP_RECEIPT` in GitHub → Settings → Secrets and variables → Actions. Its value is a small JSON object in this exact format:

```json
{
  "site": "solar-expert.cz",
  "previous_dev_sha": "REPLACE_WITH_ACTUAL_PRIOR_DEV_COMMIT_SHA",
  "database_backup_ref": "PRIVATE_REAL_HOST_DATABASE_BACKUP_ID",
  "uploads_backup_ref": "PRIVATE_REAL_HOST_UPLOADS_BACKUP_ID",
  "backup_completed_at_utc": "YYYY-MM-DDTHH:MM:SSZ",
  "restore_rehearsal_ref": "PRIVATE_REAL_STAGING_RESTORE_EVIDENCE_ID",
  "restore_rehearsal_at_utc": "YYYY-MM-DDTHH:MM:SSZ",
  "restore_owner": "RESPONSIBLE_BACKUP_REVIEWER",
  "database_and_uploads_restorable": true,
  "staging_restore_passed": true
}
```

The `previous_dev_sha` is the **actual `dev` HEAD before merging the new release PR**, later checked by CI against the new merge commit's `GITHUB_SHA^1`. It is NOT the PR branch commit SHA, the old WordPress theme version number, or `main` HEAD.

Backup refs must correspond to private host records and staging restore proof. Store neither the backup files nor the actual identifiers in a public GitHub issue, code repository or stdout.

**Expiry & replay resistance:** the gate accepts the snapshot only within 24 hours of the actual CI run, the restore rehearsal only within 30 days, and `previous_dev_sha` must match the merge's first parent exactly. Since each next merge changes the first parent, the same old receipt cannot approve a later release. The workflow prints only generic gate status, not private references.

The secret should be created **after** the genuine backups and restore rehearsal are confirmed. No secret or wrong/stale/malformed/empty receipt -> **nonzero workflow exit before the Deployer trigger**. If a PR is merged before the private receipt was ready, the auto-deploy run will fail closed; later adding a secret alone does not automatically rerun the old event. Re-run through an authorized GitHub mechanism, never bypass the receipt gate just to deploy.

The gate is **not a backup engine** and does **not remotely query backup storage**. It is intentionally an administrator attestation requirement for the current system's constraints. Future automation may replace this with an authenticated per-release host snapshot/restore verification API, but it must be separately reviewed and may not silently convert an unsupported claim into “backup verified”.

## Release order

1. Required code validation and WordPress Playground for the merged PR.
2. **This private DB/uploads backup + tested restore receipt** is checked against the merge's preceding dev SHA and timestamps.
3. Public live prior-code fingerprint compared byte-for-byte with that preceding dev commit; archive and manifest are generated, round-tripped and stored as a GitHub Actions artifact before mutation.
4. Only then may Deployer for Git be called and `managed-content-sync-v1` update WordPress. Full health, source bytes, managed pages, SEO and real CTAs are read back from production.

The same gate applies to all release PRs, including #146–#152. It does **not** independently verify the separate reviewer approval of PR #142; release reviewers must also check branch protections and current-head independent approvals.

## Executable tests

`node --test tests/deploy-wordpress-backup-gate.test.mjs` runs the real inline Bash stage with mocked Git and a controlled private JSON environment. It asserts successful gating, correct PR/source order, missing evidence, wrong prior SHA/domain, stale/future/invalid timestamps, false restore flags, no secret leakage, and missing media/database references. This is a security unit test, **not a real DB restore rehearsal**.

Real restore evidence remains an open requirement in [issue #148](https://github.com/Rastty/solar-expert-2/issues/148).
