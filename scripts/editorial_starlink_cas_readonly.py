#!/usr/bin/env python3
"""Authenticate and read ONLY current Starlink Mini WordPress post CAS evidence.

Never logs or archives WordPress body, usernames, tokens or other content.
Output is a point-in-time source fingerprint, NOT an update authorization.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from scripts import editorial_release as publisher

POST_ID = 1630
MANIFEST = publisher.ROOT / "ops/editorial-manifests/solar-starlink-mini-offgrid-20261109-v1.json"
OUTPUT = publisher.ROOT / "artifacts/solar-starlink-current-source-readonly.json"
SLUG = "starlink-mini-na-chate-solarni-panel-baterie-mppt"


def inspect() -> dict:
    result = {
        "schema_version": 1,
        "observed_at_utc": datetime.now(timezone.utc).isoformat(),
        "site": "solar-expert.cz",
        "purpose": "single_existing_post_compare_and_swap_source_evidence",
        "post_id": POST_ID,
        "canonical_url": publisher.SITE + "/" + SLUG + "/",
        "status": "unknown_or_unavailable",
        "expected_current_sha256": None,
        "expected_modified_gmt": None,
        "original_source_sha256_verified": False,
        "publish_authorized": False,
        "theme_deploy_authorized": False,
        "writes": 0
    }
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        publisher.validate_manifest(manifest)
        if manifest["slug"] != SLUG or manifest["kind"] != "post_create":
            result["status"] = "blocked_original_manifest"
            return result

        category = publisher.category_id()  # authorized GET only
        current = publisher.post(POST_ID)    # authenticated raw content GET
        publisher.canonical_post(current, manifest, category)
        rows = publisher.slug_posts(SLUG)
        publisher.require(len(rows) == 1 and rows[0].get("id") == POST_ID,
                          "Slug must remain unique and owned by original WP post")

        original_sha = manifest["source_sha256"]
        current_sha = publisher.sha(publisher.raw(current))
        if current_sha != original_sha:
            result["status"] = "blocked_live_content_changed"
            return result
        modified = current.get("modified_gmt")
        publisher.require(isinstance(modified, str) and re.fullmatch(
            r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", modified
        ) is not None, "Current modified_gmt invalid")
        publisher.parse_wp_gmt_utc(modified)
        result["expected_current_sha256"] = current_sha
        result["expected_modified_gmt"] = modified
        result["original_source_sha256_verified"] = True
        result["status"] = "original_published_body_exact_at_snapshot"
    except (OSError, ValueError, TypeError, KeyError, publisher.Blocked):
        # No WP post body or private exception text is allowed into artifacts.
        pass
    return result


def main() -> int:
    result = inspect()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n",
                      encoding="utf-8")
    print("SOLAR_STARLINK_CAS_READONLY status=" + result["status"] +
          " writes=0 publish_authorized=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
