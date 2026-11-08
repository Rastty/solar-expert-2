# Solar Expert: ownership boundary for native editorial WordPress posts

## Why this exists

Solar Expert has two separate content paths:

- The **native main-branch editorial publisher** creates/edits one exact, source-locked WordPress post using REST after its own read-only guards, encrypted prewrite archival and a rolling 24-hour post-creation gate.
- The **dev-theme managed content synchronizer** updates on-disk theme articles, metadata and taxonomies after a separately authorized theme release.

Before this change, a manifest item with `create_if_missing:false` and `preserve_status:true` could still call `wp_update_post()` and silently **replace the body and title of an editor-published post** with older theme HTML. Preserving publication *status* does not protect the content.

## Exact native ownership contract

For a WordPress post created or subsequently maintained through the native editorial publisher, a theme manifest entry must have all of:

```json
{
  "type": "post",
  "slug": "EXACT-CANONICAL-SLUG",
  "file": "content/rewrites/EXACT-CANONICAL-SLUG.html",
  "create_if_missing": false,
  "preserve_status": true,
  "native_editorial_owned": true,
  "category_slug": "solarni-panely",
  "indexable": true
}
```

The source file is retained for editorial review, source linking and subsequent changes through the **native publisher**, NOT as authorization for theme sync to rewrite it.

On the real `solar_expert_sync_managed_content()` path:

- If the exact post does not exist, theme sync skips it and **never creates** a substitute.
- If the post exists, theme sync never calls `wp_update_post()` or `wp_insert_post()` for it, and preserves the actual WordPress **body, title and status** even if the source file has diverged.
- Category assignment remains append-only, and source attribution, Yoast title/description and indexability metadata may be reconciled. This is a **metadata and taxonomy sync**, not a full freeze of WordPress metadata.
- A `native_editorial_owned:true` directive on a page, or with `create_if_missing` not strictly `false` or `preserve_status` not strictly `true`, **fails the entire sync** with an auditable error and leaves the fingerprint uncommitted.
- Ordinary theme-managed pages and posts are unaffected and retain their existing update behavior.

The required CI test `tests/native-editorial-content-preservation.test.php` extracts and executes the actual production PHP sync function under deterministic WordPress stubs. It proves zero content writes, idempotence, no insertion when absent, no authorization via malformed manifests and unchanged normal theme content synchronization.

## Important release sequencing

This code is included in development `dev` only. It does **not** itself publish editorial content or deploy a WordPress theme. The explicit theme release-intent guard remains disabled, and the separate host database/uploads restoration requirement (#148) remains a precondition for real theme release.

The already live caravan guide `solarni-panel-na-karavan-200w` is a candidate for a subsequent manifest source-parity migration with this flag. The pending Wi-Fi router/camera guide `solarni-panel-pro-wifi-kameru-a-router-na-chate` must receive the flag **after** its own native main-branch publish receipt is verified; merely adding its Git source or manifest never authorizes a second WP post.
