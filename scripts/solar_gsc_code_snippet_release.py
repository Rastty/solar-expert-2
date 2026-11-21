#!/usr/bin/env python3
"""GitHub App Password -> Code Snippets native REST: one exact GSC ownership tag.

Two explicitly authorized calls only: create an inactive snippet, then activate
that exact id after authenticated code readback. No WPVibe, theme deployment or
posts. No automatic replay after an uncertain POST.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import error, request
from scripts.solar_gsc_direct_rest_preflight import SITE, NoRedirect
from scripts.solar_gsc_verification_check import TOKEN, read_live

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / "ops/gsc-snippet-release.json"
RECEIPT = ROOT / "artifacts/solar-gsc-snippet-release-receipt.json"
BASE = SITE + "/wp-json"
SLUG = "code-snippets"
NAME = "Solar Expert GSC verification (site owner)"
EXPECTED_CODE = (
    "add_action('wp_head', function () {\n"
    "    if (is_front_page()) {\n"
    "        echo '<meta name=\"google-site-verification\" content=\"" + TOKEN + "\" />' . \"\\n\";\n"
    "    }\n"
    "}, 15);\n"
)
LIST = "/code-snippets/v1/snippets?context=edit&per_page=100"
PLUGINS = "/wp/v2/plugins?context=edit&per_page=100"
MAX_RESPONSE = 700000
POSTS_ATTEMPTED = 0
SNIPPET_ID = None

class Blocked(RuntimeError):
    pass

def require(condition, reason):
    if not condition:
        raise Blocked(reason)

def http(method, path, user, password, data=None):
    """Strict allowlist; no redirects, no raw response/secret logging."""
    global POSTS_ATTEMPTED
    valid_get = path in (LIST, PLUGINS) or re.fullmatch(
        r"/code-snippets/v1/snippets/[1-9][0-9]*", path)
    valid_post = method == "POST" and (
        (path == "/code-snippets/v1/snippets" and data == {
            "name": NAME, "code": EXPECTED_CODE, "scope": "global",
            "active": False, "desc": "Google Search Console ownership: one meta tag on front page."
        }) or (
            SNIPPET_ID is not None and
            path == "/code-snippets/v1/snippets/" + str(SNIPPET_ID) + "/activate" and
            data is None
        )
    )
    require((method == "GET" and valid_get and data is None) or valid_post,
            "Unapproved HTTP route, method or payload")
    require(bool(user and password), "Missing WordPress credentials")
    token = base64.b64encode((user + ":" + password).encode()).decode()
    body = json.dumps(data, separators=(",", ":")).encode() if data is not None else None
    req = request.Request(BASE + path, method=method, data=body,
                          headers={"Authorization": "Basic " + token,
                                   "Accept": "application/json",
                                   "Content-Type": "application/json",
                                   "User-Agent": "SolarGSC-GitHub-ExactSnippet/1.0"})
    if method == "POST":
        POSTS_ATTEMPTED += 1
    try:
        with request.build_opener(NoRedirect()).open(req, timeout=32) as resp:
            response = resp.read(MAX_RESPONSE + 1)
            require(len(response) <= MAX_RESPONSE, "Oversized WordPress response")
            require("application/json" in resp.headers.get("Content-Type", "").lower(),
                    "Non-JSON WordPress response")
            return resp.status, json.loads(response)
    except error.HTTPError as exc:
        raise Blocked("WordPress REST HTTP " + str(exc.code)) from None
    except (error.URLError, TimeoutError, OSError, ValueError, UnicodeError):
        raise Blocked("WordPress REST transport/redirect uncertain; no retry") from None

def as_item(value):
    if isinstance(value, dict) and isinstance(value.get("snippet"), dict):
        return value["snippet"]
    return value

def existing(user, password):
    status, plugins = http("GET", PLUGINS, user, password)
    require(status == 200 and isinstance(plugins, list), "Plugin inventory cannot be proved")
    active = [p for p in plugins if isinstance(p, dict) and
              str(p.get("plugin", "")).startswith(SLUG + "/") and p.get("status") == "active"]
    require(len(active) == 1, "Code Snippets plugin not uniquely active")
    status, snippets = http("GET", LIST, user, password)
    require(status == 200 and isinstance(snippets, list), "Snippet inventory not a list")
    require(len(snippets) < 100, "Snippet pagination could hide duplicates")
    for item in snippets:
        require(isinstance(item, dict), "Unrecognized snippet inventory")
        code = str(item.get("code", ""))
        title = str(item.get("name", ""))
        require(title != NAME and TOKEN not in code,
                "Existing exact name or token snippet; refuse duplicate write")
    return len(snippets)

def exact_readback(user, password, snippet_id, must_be_active):
    status, returned = http("GET",
        "/code-snippets/v1/snippets/" + str(snippet_id), user, password)
    obj = as_item(returned)
    require(status == 200 and isinstance(obj, dict) and
            obj.get("id") == snippet_id and obj.get("name") == NAME and
            str(obj.get("code", "")).strip() == EXPECTED_CODE.strip() and
            obj.get("active") is must_be_active,
            "Snippet identity/code/activation mismatch; no further write")
    return obj

def save(status, **kw):
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    # POST attempts have unknown eventual completion on transport failure.
    data = {"schema_version": 1, "status": status, "site": SITE,
            "snippet_id": SNIPPET_ID, "post_attempts": POSTS_ATTEMPTED,
            "wpvibe_calls": 0, "theme_deployed": False, **kw}
    RECEIPT.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n",
                       encoding="utf-8")
    print("SOLAR_GSC_SNIPPET status=" + status +
          " attempted_posts=" + str(POSTS_ATTEMPTED) + " wpvibe=0")

def execute(user, password):
    global SNIPPET_ID
    release = json.loads(CONTROL.read_text(encoding="utf-8"))
    require(release == {"schema_version": 1, "enabled": True, "revision": 1,
                        "mode": "one_site_owner_gsc_code_snippet"},
            "GSC release control does not exactly authorize this operation")
    head = read_live()
    require(head.get("head_present") is True, "Live homepage HTML head unverifiable")
    require(head.get("total_google_verification_tags_in_head") == 0,
            "Existing Google site verification tag; preserve and stop")
    existing(user, password)
    payload = {"name": NAME, "code": EXPECTED_CODE, "scope": "global",
               "active": False,
               "desc": "Google Search Console ownership: one meta tag on front page."}
    status, created = http("POST", "/code-snippets/v1/snippets", user, password, payload)
    obj = as_item(created)
    require(status in (200, 201) and isinstance(obj, dict) and
            type(obj.get("id")) is int and obj["id"] > 0,
            "Create result lacks exact snippet ID; no activation/retry")
    SNIPPET_ID = obj["id"]
    exact_readback(user, password, SNIPPET_ID, False)
    # Recheck homepage before turning this snippet on: if another agent added
    # verification in parallel, leave only the inactive new snippet (safe).
    fresh_head = read_live()
    require(fresh_head.get("head_present") is True and
            fresh_head.get("total_google_verification_tags_in_head") == 0,
            "Concurrent verification tag appeared; leave snippet inactive")
    activated_status, _ = http("POST",
        "/code-snippets/v1/snippets/" + str(SNIPPET_ID) + "/activate",
        user, password)
    require(activated_status in (200, 201, 204),
            "Snippet activation not explicitly successful; never repeat")
    exact_readback(user, password, SNIPPET_ID, True)
    latest = read_live()
    require(latest.get("verified_on_live_html") is True and
            latest.get("total_google_verification_tags_in_head") == 1,
            "Snippet active but public head not yet verified (possible cache)")
    save("wp_verified", verified_on_live_html=True,
         exact_matching_tags_in_head=1)

def main():
    try:
        execute(os.getenv("SOLAR_WP_USER", "").strip(),
                os.getenv("SOLAR_WP_APP_PASSWORD", "").strip())
    except (Blocked, OSError, ValueError, TypeError, KeyError) as exc:
        # Never display plugin code, WordPress body or raw exception including credentials.
        reason = str(exc)
        if reason.startswith("WordPress") or reason.startswith("Snippet") or reason.startswith("GSC") or reason.startswith("Existing") or reason.startswith("Live") or reason.startswith("Concurrent") or reason.startswith("Code") or reason.startswith("Missing") or reason.startswith("Create"):
            safe = reason[:150]
        else:
            safe = "Release blocked by unverified precondition"
        save("blocked_no_retry", verified_on_live_html=False, reason=safe)
        sys.exit(2)

if __name__ == "__main__":
    main()
