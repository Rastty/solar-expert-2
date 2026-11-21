#!/usr/bin/env python3
"""GET-only discovery of unlinked off-grid buying posts (no content or secrets in output).

This is a coverage candidate list, NOT GSC demand, conversion evidence, approval
to edit, or a deployment. A later edit requires fresh authenticated CAS.
"""
from __future__ import annotations
import json
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

from scripts import editorial_release as wp
from scripts.editorial_target_fingerprints_readonly import buyer_route_counts

OUTPUT = wp.ROOT / "artifacts/solar-offgrid-buyer-route-gaps-readonly.json"
PER_PAGE = 12
MAX_PAGES = 6
# Specific off-grid/battery use cases; generic grid-connected residential FVE
# is deliberately excluded instead of promoting the off-grid Builder there.
TOPICS = (
    "ostrov", "chata", "chatu", "karavan", "mppt", "bateri",
    "cerpadlo", "kamera", "router", "wifi", "lednic",
    "elektrocentral", "zalozni-zdroj", "solarni-panel-pro",
)
EXCLUDE = ("fotovoltaika-pro-rodinny-dum", "on-grid", "dotace",
           "sitova-fotovoltaika", "fve-na-strechu")


def inspect() -> dict:
    observed = datetime.now(timezone.utc).isoformat()
    snapshot = {
        "schema_version": 1, "observed_at_utc": observed,
        "scope": "up_to_72_recently_modified_solarni_panely_posts",
        "category": "solarni-panely", "site": "solar-expert.cz",
        "status": "unverified", "publish_authorized": False,
        "theme_deploy_authorized": False, "writes": 0,
        "posts_examined": 0, "buyer_intent_posts": 0, "with_builder": 0,
        "with_quote_checker": 0, "missing_both": 0, "candidates": [],
    }
    category = wp.category_id()  # Authenticated GET, fail closed if unavailable
    seen = set()
    for page in range(1, MAX_PAGES + 1):
        rows = wp.wp("GET", "/wp/v2/posts", query={
            "context": "edit", "status": "publish",
            "categories": category, "orderby": "modified", "order": "desc",
            "per_page": PER_PAGE, "page": page,
            "_fields": "id,slug,status,link,modified_gmt,content,categories",
        })
        wp.require(isinstance(rows, list), "Malformed WordPress listing")
        for row in rows:
            wp.require(isinstance(row, dict), "Invalid post row")
            slug = row.get("slug")
            post_id = row.get("id")
            body = row.get("content", {}).get("raw") if isinstance(row.get("content"), dict) else None
            wp.require(type(post_id) is int and post_id > 0 and
                       isinstance(slug, str) and re.fullmatch(r"[a-z0-9-]{8,150}", slug) and
                       isinstance(body, str) and row.get("status") == "publish" and
                       category in row.get("categories", []), "Unverified post/category/body")
            uri = urlsplit(str(row.get("link", "")))
            wp.require(uri.scheme == "https" and uri.hostname == "solar-expert.cz" and
                       uri.path == "/" + slug + "/" and not uri.query and not uri.fragment,
                       "Unverified post URL")
            wp.require(post_id not in seen, "Duplicate page boundary/post")
            seen.add(post_id)
            snapshot["posts_examined"] += 1
            if any(bad in slug for bad in EXCLUDE) or not any(key in slug for key in TOPICS):
                continue
            snapshot["buyer_intent_posts"] += 1
            routes = buyer_route_counts(body)
            builder = routes["complete_kit_builder"]
            quote = routes["offgrid_quote_checker"]
            snapshot["with_builder"] += int(builder > 0)
            snapshot["with_quote_checker"] += int(quote > 0)
            if builder == 0 and quote == 0:
                snapshot["missing_both"] += 1
                snapshot["candidates"].append({
                    "post_id": post_id, "slug": slug,
                    "modified_gmt": row.get("modified_gmt"),
                    "current_source_sha256": wp.sha(body),
                    "builder_links": 0, "quote_checker_links": 0,
                    "buyer_intent_hint": "slug_only_requires_human_scope_review",
                })
        if len(rows) < PER_PAGE:
            break
    snapshot["status"] = "verified_get_only"
    # Do not copy title, body, excerpt, full href, credentials, author data.
    return snapshot


def main() -> int:
    try:
        result = inspect()
    except (wp.Blocked, OSError, ValueError, TypeError, KeyError):
        result = {
            "schema_version": 1, "site": "solar-expert.cz",
            "status": "blocked_no_evidence", "writes": 0,
            "publish_authorized": False, "theme_deploy_authorized": False,
            "candidates": [],
        }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print("SOLAR_OFFGRID_GAP status=" + result["status"] +
          " examined=" + str(result.get("posts_examined", "unverified")) +
          " potential=" + str(result.get("missing_both", "unverified")) +
          " writes=0")
    for row in result["candidates"][:20]:
        print("SOLAR_OFFGRID_GAP_CANDIDATE id=" + str(row["post_id"]) +
              " slug=" + row["slug"] + " builder=0 quote=0")
    return 0 if result["status"] == "verified_get_only" else 2


if __name__ == "__main__":
    raise SystemExit(main())
