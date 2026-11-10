#!/usr/bin/env python3
"""Read-only authenticated WordPress snapshot for pending Starlink Mini CREATE.

This is evidence for a human/guarded publisher, NEVER release authorization.
All remote requests are WordPress GET calls via editorial_release.wp. Do not
log user capabilities, auth values, post bodies, raw error messages or drafts.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from scripts import editorial_release as e

SOURCE = e.ROOT / "ops/editorial-manifests/solar-starlink-mini-offgrid-20261109-v1.json"
OUTPUT = e.ROOT / "artifacts/solar-editorial-readiness-readonly.json"
TARGET = "starlink-mini-na-chate-solarni-panel-baterie-mppt"


def snapshot() -> dict:
    result = {
        "schema_version": 1,
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "site": "solar-expert.cz",
        "purpose": "starlink_mini_read_only_post_create_preflight",
        "status": "unknown_or_transport",
        "rolling_24h_posts_clear_at_snapshot": False,
        "target_slug_absent_at_snapshot": False,
        "editor_capabilities_verified": False,
        "same_github_writer_concurrency": "solar-editorial-wp-single-writer",
        "other_wordpress_writers_absence_proven": False,
        "publish_authorized": False,
        "writes": 0,
    }
    try:
        m = json.loads(SOURCE.read_text(encoding="utf-8"))
        e.validate_manifest(m)
        if m.get("slug") != TARGET or m.get("kind") != "post_create":
            result["status"] = "blocked_manifest"
            return result
    except (OSError, ValueError, TypeError, e.Blocked):
        result["status"] = "blocked_manifest"
        return result

    # Do not treat a public GET or a GitHub green CI run as proof of an
    # authenticated WP editor. Verify the actual limited publisher account.
    try:
        me = e.wp("GET", "/wp/v2/users/me",
                  query={"context": "edit", "_fields": "capabilities"})
        caps = me.get("capabilities", {}) if isinstance(me, dict) else {}
        if not isinstance(caps, dict) or not all(caps.get(key) is True for key in (
                "edit_posts", "edit_others_posts", "publish_posts")):
            result["status"] = "blocked_editor_capability"
            return result
        result["editor_capabilities_verified"] = True

        e.category_id()  # exact existing solarni-panely category; no write
        existing = e.slug_posts(TARGET)
        if existing:
            result["status"] = "blocked_post_slug_occupied"
            return result
        result["target_slug_absent_at_snapshot"] = True

        pages = e.wp("GET", "/wp/v2/pages", query={
            "slug": TARGET, "context": "edit", "status": "any",
            "per_page": 10, "_fields": "id,slug"
        })
        if not isinstance(pages, list):
            result["status"] = "unknown_or_transport"
            return result
        if pages:
            result["status"] = "blocked_page_slug_occupied"
            return result

        # Reuse the production publisher's exact UTC cutoff/parsing and
        # complete pagination; never invent a second weaker time gate.
        try:
            e.recent_posts_gate()
        except e.Blocked as exc:
            if str(exc) == "A published WordPress post exists within the last 24h UTC; stop":
                result["status"] = "blocked_rolling_24h_post"
            else:
                result["status"] = "unknown_or_transport"
            return result
        result["rolling_24h_posts_clear_at_snapshot"] = True
        result["status"] = "clear_read_only_snapshot"
    except (e.Blocked, OSError, ValueError, TypeError, KeyError):
        # Never reveal WP authenticated response bodies or URLs in CI logs.
        result["status"] = "unknown_or_transport"
    return result


def main() -> int:
    result = snapshot()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n",
                      encoding="utf-8")
    print("SOLAR_EDITORIAL_READONLY status=" + result["status"] +
          " writes=0 publish_authorized=false")
    # A blocked or unknown snapshot is useful evidence, not a failed workflow;
    # no automatic POST or merge is connected to this result.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
