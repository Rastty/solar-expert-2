#!/usr/bin/env python3
"""Authenticated GET-only CAS fingerprints for existing commercial buyer posts.

No raw WordPress body, credentials, error messages, drafts or user information
ever enter logs or public GitHub artifacts. These point-in-time fingerprints do
not authorize a subsequent editorial write or a theme release.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from scripts import editorial_release as publisher


TARGETS = (
    (1612, "jak-vybrat-mppt-regulator-pro-400w-panel"),
    (1613, "solarni-sestava-na-chatu-pro-lednici"),
    (1615, "jakou-baterii-k-solarnimu-panelu-400w"),
)
OUTPUT = publisher.ROOT / "artifacts/solar-editorial-target-fingerprints-readonly.json"


def inspect() -> dict:
    snapshot = {
        "schema_version": 1,
        "observed_at_utc": datetime.now(timezone.utc).isoformat(),
        "site": "solar-expert.cz",
        "purpose": "three_existing_buyer_post_cas_fingerprints_get_only",
        "publish_authorized": False,
        "theme_deploy_authorized": False,
        "writes": 0,
        "posts": [],
    }
    try:
        category = publisher.category_id()
    except (publisher.Blocked, OSError, ValueError, TypeError, KeyError):
        category = None

    for post_id, slug in TARGETS:
        row = {
            "post_id": post_id,
            "slug": slug,
            "status": "unknown_or_unavailable",
            "current_source_sha256": None,
            "modified_gmt": None,
        }
        if category is None:
            snapshot["posts"].append(row)
            continue
        try:
            post = publisher.post(post_id)
            publisher.require(isinstance(post, dict), "Invalid post GET response")
            publisher.require(post.get("id") == post_id and post.get("slug") == slug,
                              "Post identity changed")
            publisher.require(post.get("status") == "publish", "Post not published")
            publisher.require(category in post.get("categories", []), "Category changed")
            publisher.require(post.get("link") == publisher.SITE + "/" + slug + "/",
                              "Canonical link changed")
            rows = publisher.slug_posts(slug)
            publisher.require(isinstance(rows, list) and len(rows) == 1
                              and rows[0].get("id") == post_id,
                              "Ambiguous post slug")
            modified = post.get("modified_gmt")
            publisher.require(isinstance(modified, str) and re.fullmatch(
                r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", modified
            ) is not None, "Invalid modified time")
            publisher.parse_wp_gmt_utc(modified)
            raw_html = publisher.raw(post)
            publisher.require(bool(raw_html.strip()), "Empty WordPress body")
            row["current_source_sha256"] = publisher.sha(raw_html)
            row["modified_gmt"] = modified
            row["status"] = "verified_current_published_post"
        except (publisher.Blocked, OSError, ValueError, TypeError, KeyError):
            # Public-safe status only. Fail closed and hide authenticated errors.
            pass
        snapshot["posts"].append(row)
    return snapshot


def main() -> int:
    result = inspect()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2)
                      + "\n", encoding="utf-8")
    for row in result["posts"]:
        print("SOLAR_BUYER_FINGERPRINT post_id=" + str(row["post_id"]) +
              " status=" + row["status"] +
              " sha256=" + (row["current_source_sha256"] or "unverified") +
              " modified_gmt=" + (row["modified_gmt"] or "unverified") +
              " writes=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
