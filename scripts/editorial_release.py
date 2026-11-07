#!/usr/bin/env python3
"""GitHub Actions -> Solar Expert WordPress REST: ONE guarded editorial write.

Source is an immutable, SHA256-checked HTML file from an exact GitHub commit.
Reviewable operations live in the DEFAULT (main) branch, independent from the
WordPress theme's dev branch. No theme deploy, WPVibe, SQL, or bulk publishing.
One POST attempt; on uncertainty never retry the write automatically.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib import error, parse, request

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / "ops/editorial-release.json"
BACKUP = ROOT / "artifacts/editorial-prewrite-private.json"
RECEIPT = ROOT / "artifacts/editorial-release-receipt.json"
SITE = "https://solar-expert.cz"
REPO = "Rastty/solar-expert-2"
KINDS = {"post_create", "post_update"}
MAX_BODY = 90000


class Blocked(RuntimeError):
    """Source, identity, safety or transport gate blocked execution."""


def sha(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def canonical(data: object) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def receipt(state: str, **fields: object) -> None:
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    safe = {"status": state, "at_utc": datetime.now(timezone.utc).isoformat(), **fields}
    RECEIPT.write_text(json.dumps(safe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as out:
            out.write("status=" + state + "\n")
    print("SOLAR_EDITORIAL status=" + state + " operation=" + str(fields.get("operation_id", "none")))


def require(value: bool, problem: str) -> None:
    if not value:
        raise Blocked(problem)


def load_operation() -> tuple[dict, str] | None:
    control = json.loads(CONTROL.read_text(encoding="utf-8"))
    require(type(control) is dict and control.get("schema_version") == 1, "Invalid release control")
    if control.get("enabled") is False:
        return None
    require(control.get("enabled") is True and control.get("mode") == "one_editorial_post",
            "Release disabled or unsupported")
    rel = control.get("manifest")
    require(isinstance(rel, str) and
            re.fullmatch(r"ops/editorial-manifests/[a-z0-9-]{12,110}\.json", rel) is not None,
            "Manifest must be explicitly selected under ops/editorial-manifests")
    manifest = json.loads((ROOT / rel).read_text(encoding="utf-8"))
    validate_manifest(manifest)
    return manifest, sha(canonical(manifest))


def validate_manifest(m: dict) -> None:
    require(type(m) is dict and m.get("schema_version") == 1, "Invalid manifest schema")
    require(m.get("authorization") == "owner_standing_editorial", "Not authorized for routine editorial")
    require(m.get("kind") in KINDS, "Only one post create/update is allowed")
    require(re.fullmatch(r"solar-[a-z0-9-]{12,110}", str(m.get("operation_id", ""))) is not None,
            "Operation identity must be unique and immutable")
    slug = m.get("slug")
    require(isinstance(slug, str) and re.fullmatch(r"[a-z0-9-]{10,150}", slug) is not None,
            "Invalid canonical post slug")
    require(m.get("expected_status") == "publish", "Only published editorial posts")
    require(m.get("category_slug") == "solarni-panely", "Explicit existing site taxonomy required")
    require(isinstance(m.get("title"), str) and 28 <= len(m["title"]) <= 150, "Invalid post title")
    require(isinstance(m.get("excerpt"), str) and 60 <= len(m["excerpt"]) <= 440, "Invalid excerpt")
    require(re.fullmatch(r"[0-9a-f]{40}", str(m.get("source_commit", ""))) is not None,
            "Source must refer to an immutable Git commit, not branch HEAD")
    require(m.get("source_file") == "content/rewrites/" + slug + ".html",
            "Only a slug-matching Git managed article is permitted")
    require(re.fullmatch(r"[0-9a-f]{64}", str(m.get("source_sha256", ""))) is not None,
            "Pinned source SHA256 required")
    require("posts" not in m and "batch" not in m and "queries" not in m,
            "No batch, SQL, raw WordPress data or destructive edits")
    if m["kind"] == "post_create":
        require(m.get("expect_absent") is True and not m.get("post_id"),
                "New post must be explicitly absent; never overwrite a collision")
    else:
        require(type(m.get("post_id")) is int and m["post_id"] > 1, "Exact existing post id required")
        require(re.fullmatch(r"[0-9a-f]{64}", str(m.get("expected_current_sha256", ""))) is not None,
                "Current raw WordPress body digest required")
        require(re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d",
                             str(m.get("expected_modified_gmt", ""))) is not None,
                "Current post modification time is mandatory")


class HtmlGuard(HTMLParser):
    DENY = {"script", "iframe", "form", "object", "embed", "video", "audio",
            "svg", "math", "input", "button", "style", "link", "meta"}
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.h2 = 0
        self.internal = 0
        self.external = 0
        self.bad: list[str] = []
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.DENY:
            self.bad.append("disallowed HTML element")
        if tag == "h2":
            self.h2 += 1
        for key, val in attrs:
            if key.startswith("on") or key in {"srcdoc", "formaction"}:
                self.bad.append("event handler or form attribute")
            if key == "style":
                self.bad.append("inline CSS can hide or manipulate content")
            if key not in {"href", "src"}:
                continue
            href = val or ""
            parsed = parse.urlsplit(href)
            if href.startswith("/") and not href.startswith("//") and not parsed.query:
                self.internal += 1 if key == "href" else 0
            elif parsed.scheme == "https" and parsed.netloc and not parsed.username:
                if parsed.hostname == "solar-expert.cz":
                    self.internal += 1 if key == "href" else 0
                else:
                    self.external += 1 if key == "href" else 0
                if key == "src" and parsed.hostname != "solar-expert.cz":
                    self.bad.append("third-party embedded media not approved")
            else:
                self.bad.append("unsafe URL, non-HTTPS reference or tracking query")
            if "a_aid=" in href or "desturl=" in href or "/system/scripts/click.php" in href:
                self.bad.append("hardcoded merchant tracking/affiliate redirect")


def validate_html(body: str, slug: str) -> None:
    require(isinstance(body, str) and 3500 <= len(body) <= MAX_BODY,
            "Article must be editorially substantial and bounded")
    html = HtmlGuard()
    html.feed(body)
    require(not html.bad, "Article source contains disallowed embedded content or unsafe URLs")
    require(html.h2 >= 3 and html.internal >= 3 and html.external >= 1,
            "Require multiple useful sections, real internal buyer paths and source citation")
    require("Voc" in body and "Isc" in body,
            "Electrical buyer claim requires actual voltage and current caveats")
    require("<script" not in body.lower() and "<?php" not in body.lower(),
            "Executable code is forbidden in editorial WordPress content")


class NoRedirects(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Blocked("Redirect not accepted from authenticated endpoint")


OPENER = request.build_opener(NoRedirects())


def wp(method: str, route: str, *, query: dict | None = None,
       body: dict | None = None) -> object:
    username = os.getenv("SOLAR_WP_USER", "")
    password = os.getenv("SOLAR_WP_APP_PASSWORD", "")
    require(bool(username and password), "WordPress application credentials are not configured")
    require(method in {"GET", "POST"} and route.startswith("/wp/v2/"),
            "Only WordPress Core post/category REST methods are permitted")
    url = SITE + "/wp-json" + route
    if query:
        url += "?" + parse.urlencode(query)
    token = base64.b64encode((username + ":" + password).encode()).decode()
    headers = {"Accept": "application/json", "Authorization": "Basic " + token,
               "User-Agent": "SolarExpert-GitHub-EditorialPublisher/1"}
    payload = None
    if body is not None:
        require(method == "POST", "Body allowed only for exactly one WordPress mutation")
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = request.Request(url, data=payload, method=method, headers=headers)
    try:
        with OPENER.open(req, timeout=20) as response:
            require(response.status in (200, 201), "Unexpected WordPress HTTP response")
            return json.loads(response.read(500_000).decode("utf-8"))
    except (error.HTTPError, error.URLError, TimeoutError) as exc:
        # Never log response bodies, Basic credentials, generated post body or private options.
        status = getattr(exc, "code", "network")
        raise Blocked("WordPress REST " + method + " outcome/status " + str(status)) from None


def github_source(m: dict) -> str:
    token = os.getenv("GITHUB_TOKEN", "")
    require(bool(token), "GitHub source-read token not configured")
    url = ("https://api.github.com/repos/" + REPO + "/contents/" +
           parse.quote(m["source_file"], safe="/") + "?ref=" + m["source_commit"])
    req = request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + token,
        "User-Agent": "SolarExpert-EditorialSource/1",
    })
    try:
        with OPENER.open(req, timeout=20) as response:
            require(response.status == 200, "GitHub source read failed")
            doc = json.loads(response.read(300_000).decode("utf-8"))
    except (error.HTTPError, error.URLError, TimeoutError) as exc:
        raise Blocked("Immutable GitHub source unavailable") from None
    require(doc.get("type") == "file" and doc.get("path") == m["source_file"] and
            doc.get("encoding") == "base64", "Untrusted GitHub source response")
    try:
        source = base64.b64decode(doc["content"], validate=False).decode("utf-8")
    except (ValueError, UnicodeDecodeError, KeyError):
        raise Blocked("Invalid GitHub source body") from None
    require(sha(source) == m["source_sha256"], "Source SHA256 changed; no WordPress write")
    validate_html(source, m["slug"])
    return source


def slug_posts(slug: str) -> list:
    rows = wp("GET", "/wp/v2/posts", query={
        "slug": slug, "context": "edit", "status": "any", "per_page": 100,
        "_fields": "id,slug,status,modified_gmt,link,content,categories",
    })
    require(type(rows) is list, "Cannot establish slug uniqueness")
    return rows


def post(post_id: int) -> dict:
    out = wp("GET", "/wp/v2/posts/" + str(post_id), query={
        "context": "edit",
        "_fields": "id,slug,status,modified_gmt,link,content,categories",
    })
    require(type(out) is dict and out.get("id") == post_id,
            "WordPress post identity mismatch")
    return out


def raw(p: dict) -> str:
    content = p.get("content")
    require(type(content) is dict and isinstance(content.get("raw"), str),
            "WordPress authenticated raw post_content is not available")
    return content["raw"]


def canonical_post(p: dict, m: dict, category_id: int) -> None:
    require(p.get("slug") == m["slug"] and p.get("status") == "publish",
            "Unexpected published identity or status drift")
    parsed = parse.urlsplit(p.get("link", ""))
    require(parsed.scheme == "https" and parsed.netloc == "solar-expert.cz"
            and parsed.path.rstrip("/") == "/" + m["slug"] and
            not parsed.query and not parsed.fragment, "Post permalink is not exact canonical URL")
    require(category_id in (p.get("categories") or []), "Expected category is absent")


def category_id() -> int:
    rows = wp("GET", "/wp/v2/categories", query={
        "slug": "solarni-panely", "per_page": 10, "_fields": "id,slug",
    })
    require(type(rows) is list and len(rows) == 1 and rows[0].get("slug") == "solarni-panely",
            "Site taxonomy not uniquely verified")
    result = rows[0]["id"]
    require(type(result) is int and result > 0, "Invalid WordPress category ID")
    return result


def recent_posts_gate() -> None:
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
    rows = wp("GET", "/wp/v2/posts", query={
        "after": since, "context": "edit", "status": "publish",
        "per_page": 100, "_fields": "id,date_gmt,slug",
    })
    require(type(rows) is list, "Cannot prove last-24h publication count")
    require(len(rows) == 0, "At most one new site-wide post in 24 hours; stop")


def check_existing(m: dict, source: str, cat: int, *, for_update: bool) -> tuple[str, dict | None]:
    rows = slug_posts(m["slug"])
    require(len(rows) <= 1, "Duplicate post slug found; blocked")
    if for_update:
        require(len(rows) == 1 and rows[0].get("id") == m["post_id"],
                "Existing post ID/slug mismatch; blocked")
        current = post(m["post_id"])
        canonical_post(current, m, cat)
        current_body = raw(current)
        if current_body == source:
            return "already_live_verified", current
        require(sha(current_body) == m["expected_current_sha256"] and
                current.get("modified_gmt") == m["expected_modified_gmt"],
                "Existing post changed since exact source evidence")
        return "needs_update", current
    # New post: if any slug collision has identical body and status, no POST.
    if rows:
        current = post(rows[0]["id"])
        canonical_post(current, m, cat)
        require(raw(current) == source,
                "Slug occupied by another body; do not edit or duplicate it")
        return "already_live_verified", current
    pages = wp("GET", "/wp/v2/pages", query={
        "slug": m["slug"], "context": "edit", "status": "any",
        "per_page": 10, "_fields": "id,slug",
    })
    require(type(pages) is list and len(pages) == 0,
            "WordPress page already uses requested canonical slug")
    recent_posts_gate()
    return "needs_create", None


def prepare(m: dict, manifest_sha: str) -> None:
    source = github_source(m)
    cat = category_id()
    state, current = check_existing(m, source, cat, for_update=(m["kind"] == "post_update"))
    if state == "already_live_verified":
        receipt(state, operation_id=m["operation_id"], post_id=current["id"],
                canonical_url=current["link"], authenticated_readback=True,
                writes=0, source_sha256=sha(source))
        return
    backup = {
        "schema_version": 1, "operation_id": m["operation_id"],
        "manifest_sha256": manifest_sha, "kind": m["kind"],
        "slug": m["slug"], "category_id": cat, "source_sha256": sha(source),
        "source_body": source, "prestate": state,
        "post_id": current["id"] if current else None,
        "original_modified_gmt": current.get("modified_gmt") if current else None,
        "original_sha256": sha(raw(current)) if current else None,
        "original_content": raw(current) if current else None,
    }
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    BACKUP.write_text(json.dumps(backup, ensure_ascii=False) + "\n", encoding="utf-8")
    receipt("prepared", operation_id=m["operation_id"], writes=0,
            source_sha256=sha(source), prestate=state)


def verify_after(m: dict, expected_sha: str, cat: int, post_id: int) -> tuple[bool, dict]:
    last = {}
    for attempt in range(3):
        last = post(post_id)
        canonical_post(last, m, cat)
        if sha(raw(last)) == expected_sha:
            rows = slug_posts(m["slug"])
            require(len(rows) == 1 and rows[0].get("id") == post_id,
                    "Postwrite slug uniqueness not established")
            return True, last
        if attempt < 2:
            time.sleep(2)  # GET ONLY; never another POST
    return False, last


def public_probe(url: str, sample: str) -> str:
    # Read-only, best-effort. Cache propagation may lag; do not reissue POST.
    try:
        req = request.Request(url, headers={"User-Agent": "SolarExpert-PostReadback/1"})
        with OPENER.open(req, timeout=12) as response:
            page = response.read(350_000).decode("utf-8", errors="replace")
        return "public_content_seen" if response.status == 200 and sample in page else "public_pending"
    except Exception:
        return "public_unavailable"


def apply(m: dict, manifest_sha: str) -> None:
    require(os.getenv("SOLAR_EDITORIAL_LIVE") == "YES",
            "Only approved main-branch workflow may attempt live WordPress writes")
    require(BACKUP.is_file(), "No successfully uploaded private prewrite snapshot")
    b = json.loads(BACKUP.read_text(encoding="utf-8"))
    require(b.get("operation_id") == m["operation_id"] and
            b.get("manifest_sha256") == manifest_sha and
            b.get("kind") == m["kind"] and b.get("slug") == m["slug"],
            "Snapshot operation or manifest drift")
    source = b.get("source_body")
    require(isinstance(source, str) and sha(source) == m["source_sha256"] and
            b.get("source_sha256") == m["source_sha256"],
            "Source body differs from archived snapshot")
    validate_html(source, m["slug"])
    cat = category_id()
    require(cat == b.get("category_id"), "WordPress taxonomy ID changed between phases")
    state, current = check_existing(m, source, cat, for_update=(m["kind"] == "post_update"))
    if state == "already_live_verified":
        receipt(state, operation_id=m["operation_id"], writes=0,
                post_id=current["id"], canonical_url=current["link"],
                authenticated_readback=True)
        return
    require(state == b.get("prestate"),
            "Prewrite state drift since private snapshot")
    if m["kind"] == "post_update":
        require(current["id"] == b.get("post_id") and
                current.get("modified_gmt") == b.get("original_modified_gmt") and
                sha(raw(current)) == b.get("original_sha256"),
                "Content drift: do not overwrite concurrent editor")
        endpoint = "/wp/v2/posts/" + str(m["post_id"])
        post_body = {"content": source}
    else:
        require(current is None and b.get("post_id") is None,
                "New post appeared after preflight; no duplicate")
        endpoint = "/wp/v2/posts"
        post_body = {"title": m["title"], "slug": m["slug"], "status": "publish",
                     "content": source, "excerpt": m["excerpt"], "categories": [cat],
                     "comment_status": "closed", "ping_status": "closed"}
    # No atomic WP Core compare-and-swap. ONE POST per main run after fresh GET,
    # persistent artifact AND SHA guard. An ambiguous response is NEVER retried.
    try:
        result = wp("POST", endpoint, body=post_body)
    except Exception:
        receipt("outcome_unknown_do_not_retry", operation_id=m["operation_id"],
                writes_attempted=1, canonical_url=SITE + "/" + m["slug"] + "/")
        raise
    result_id = result.get("id") if type(result) is dict else None
    require(type(result_id) is int and result_id > 0,
            "WordPress POST response lacked post ID; outcome unknown, no retry")
    try:
        ok, after = verify_after(m, sha(source), cat, result_id)
        if not ok:
            receipt("postwrite_mismatch_do_not_retry", operation_id=m["operation_id"],
                    post_id=result_id, writes_attempted=1)
            raise Blocked("Authenticated content differs after one WordPress POST")
        # Use unique sample of actual source text, not a fabricated browser check.
        sample = re.sub(r"<[^>]*>", "", source.split("</h2>", 1)[0]).strip()[-65:]
        public = public_probe(after["link"], sample) if sample else "public_unavailable"
        receipt("wp_verified", operation_id=m["operation_id"], post_id=result_id,
                canonical_url=after["link"], authenticated_readback=True,
                source_sha256=sha(source), writes=1, public_readback=public)
    except Exception as exc:
        if not RECEIPT.is_file() or json.loads(RECEIPT.read_text(encoding="utf-8")).get("status") != "postwrite_mismatch_do_not_retry":
            receipt("readback_inconclusive_do_not_retry", operation_id=m["operation_id"],
                    writes_attempted=1, post_id=result_id)
        raise Blocked("Postwrite verification failed: do not replay") from exc


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prepare", action="store_true")
    group.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    loaded = load_operation()
    if loaded is None:
        receipt("idle_disabled", writes=0)
        return
    m, digest = loaded
    if not os.getenv("SOLAR_WP_USER") or not os.getenv("SOLAR_WP_APP_PASSWORD"):
        receipt("configuration_missing", operation_id=m["operation_id"], writes=0)
        return
    if args.prepare:
        prepare(m, digest)
    else:
        apply(m, digest)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        try:
            current = json.loads(RECEIPT.read_text(encoding="utf-8")) if RECEIPT.exists() else {}
            if current.get("status") not in {
                "outcome_unknown_do_not_retry", "postwrite_mismatch_do_not_retry",
                "readback_inconclusive_do_not_retry"
            }:
                receipt("blocked_no_write", error_code=type(exc).__name__, writes=0)
        except Exception:
            pass
        print("SOLAR_EDITORIAL_BLOCKED " + type(exc).__name__, file=sys.stderr)
        sys.exit(2)
