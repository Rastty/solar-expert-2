#!/usr/bin/env python3
"""Authenticated GET-only CAS fingerprints for existing commercial buyer posts.

No raw WordPress body, credentials, error messages, drafts or user information
ever enter logs or public GitHub artifacts. These point-in-time fingerprints do
not authorize a subsequent editorial write or a theme release.
"""
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit
from datetime import datetime, timezone

from scripts import editorial_release as publisher


TARGETS = (
    (341, "jak-zapojit-solarni-panely"),
    (1612, "jak-vybrat-mppt-regulator-pro-400w-panel"),
    (1613, "solarni-sestava-na-chatu-pro-lednici"),
    (1615, "jakou-baterii-k-solarnimu-panelu-400w"),
    (1618, "solarni-panel-na-karavan-200w"),
    (1626, "solarni-panel-pro-wifi-kameru-a-router-na-chate"),
    (1632, "jakou-baterii-a-mppt-k-solarnim-panelum-800w"),
    (1639, "solarni-panel-pro-zahradni-cerpadlo-a-jezirko"),
    (1641, "solarni-cerpadlo-do-studny-bez-elektriny"),
)
# GSC 2026-10-22..11-18: this legacy buyer-intent page had 125
# impressions and no clicks. Discover its exact WordPress post ID first;
# never guess an ID or write based on the public/cached page.
DISCOVERY_SLUGS = (
    "navratnost-fotovoltaicke-elektrarny-v-bytovem-dome",
    "jsou-vzduchova-tepelna-cerpadla-hlucna",
)
OUTPUT = publisher.ROOT / "artifacts/solar-editorial-target-fingerprints-readonly.json"

# Only canonical first-party routes, never raw hrefs or personally identifying URLs.
BUYER_ROUTES = {
    "complete_kit_builder": "/solarni-sestava-na-chatu/",
    "offgrid_quote_checker": "/quote-checker/",
}


class BuyerRouteCounter(HTMLParser):
    """Count only genuine first-party anchor destinations in raw WordPress HTML."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.counts = {key: 0 for key in BUYER_ROUTES}

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return
        href = next((v for k, v in attrs if k.lower() == "href"), None)
        if not isinstance(href, str):
            return
        uri = urlsplit(href)
        allowed = (href.startswith("/") and not href.startswith("//") and
                   not uri.netloc and not uri.scheme) or (
                   uri.scheme == "https" and uri.hostname == "solar-expert.cz" and
                   not uri.username and uri.port is None
                   )
        if not allowed:
            return
        for key, route in BUYER_ROUTES.items():
            if uri.path == route:
                self.counts[key] += 1


def buyer_route_counts(raw_html: str) -> dict:
    parser = BuyerRouteCounter()
    parser.feed(raw_html)
    return parser.counts


def inspect() -> dict:
    snapshot = {
        "schema_version": 1,
        "observed_at_utc": datetime.now(timezone.utc).isoformat(),
        "site": "solar-expert.cz",
        "purpose": "existing_buyer_post_and_gsc_selected_legacy_opportunity_cas_get_only",
        "publish_authorized": False,
        "theme_deploy_authorized": False,
        "writes": 0,
        "posts": [],
    }
    try:
        category = publisher.category_id()
    except (publisher.Blocked, OSError, ValueError, TypeError, KeyError):
        category = None

    # One known existing heat-pump article is NOT in 'solarni-panely'.
    # Discover its exact WordPress taxonomy by allowed slug; never weaken
    # identity/category checks of the nine solar buyer posts or the SVJ post.
    heat_pump_category = None
    try:
        categories = publisher.wp("GET", "/wp/v2/categories", query={
            "slug": "tepelna-cerpadla", "per_page": 10, "_fields": "id,slug",
        })
        if (isinstance(categories, list) and len(categories) == 1 and
                isinstance(categories[0], dict) and
                categories[0].get("slug") == "tepelna-cerpadla" and
                type(categories[0].get("id")) is int and categories[0]["id"] > 0):
            heat_pump_category = categories[0]["id"]
    except (publisher.Blocked, OSError, ValueError, TypeError, KeyError):
        pass

    targets = list(TARGETS)
    for slug in DISCOVERY_SLUGS:
        post_id = None
        if category is not None:
            try:
                rows = publisher.slug_posts(slug)
                publisher.require(isinstance(rows, list) and len(rows) == 1,
                                  "Ambiguous or missing GSC opportunity slug")
                discovered = rows[0]
                publisher.require(isinstance(discovered, dict) and
                                  type(discovered.get("id")) is int and discovered["id"] > 0 and
                                  discovered.get("slug") == slug,
                                  "Discovered WordPress identity is invalid")
                post_id = discovered["id"]
            except (publisher.Blocked, OSError, ValueError, TypeError, KeyError):
                pass
        targets.append((post_id, slug))

    for post_id, slug in targets:
        expected_category = (heat_pump_category if slug ==
                             "jsou-vzduchova-tepelna-cerpadla-hlucna" else category)
        row = {
            "post_id": post_id,
            "slug": slug,
            "status": "unknown_or_unavailable",
            "current_source_sha256": None,
            "modified_gmt": None,
            "buyer_route_counts": None,
        }
        if expected_category is None or type(post_id) is not int:
            snapshot["posts"].append(row)
            continue
        try:
            post = publisher.post(post_id)
            publisher.require(isinstance(post, dict), "Invalid post GET response")
            publisher.require(post.get("id") == post_id and post.get("slug") == slug,
                              "Post identity changed")
            publisher.require(post.get("status") == "publish", "Post not published")
            publisher.require(expected_category in post.get("categories", []),
                              "Category changed")
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
            row["buyer_route_counts"] = buyer_route_counts(raw_html)
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
              " buyer_routes=" + json.dumps(row["buyer_route_counts"], sort_keys=True, separators=(",", ":")) +
              " writes=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
