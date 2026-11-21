#!/usr/bin/env python3
"""Direct GitHub Actions -> WordPress Application Password capability audit.

No WPVibe, no POST, no writing site options, no dumping REST response bodies.
This audit ONLY decides whether a supported, scoped GSC <head> writer exists.
"""
from __future__ import annotations

import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from urllib import error, parse, request

SITE = "https://solar-expert.cz"
OUTPUT = Path("artifacts/solar-gsc-direct-rest-preflight.json")
ALLOW_PATHS = (
    "/wp-json/", "/wp-json/wp/v2/users/me?context=edit",
    "/wp-json/wp/v2/settings?context=edit",
    "/wp-json/wp/v2/plugins?context=edit&per_page=100",
    "/wp-json/wp-abilities/v1/abilities",
)
MAX_JSON_BYTES = 1_000_000


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("redirect blocked")


def fetch_approved(path: str, user: str, password: str) -> tuple[int | None, object]:
    if path not in ALLOW_PATHS:
        raise ValueError("Unapproved URL")
    if not user or not password:
        return None, None
    auth = base64.b64encode((user + ":" + password).encode()).decode("ascii")
    req = request.Request(SITE + path, method="GET",
                          headers={"Authorization": "Basic " + auth,
                                   "Accept": "application/json",
                                   "User-Agent": "Solar-GSC-GitHub-Direct-GET-Only/1.0"})
    opener = request.build_opener(NoRedirect())
    try:
        with opener.open(req, timeout=18) as response:
            code = response.status
            if code != 200 or not response.url.startswith(SITE + "/wp-json/"):
                return code, None
            if "application/json" not in response.headers.get("Content-Type", "").lower():
                return code, None
            raw = response.read(MAX_JSON_BYTES + 1)
            if len(raw) > MAX_JSON_BYTES:
                return code, None
            return code, json.loads(raw)
    except error.HTTPError as exc:
        return exc.code, None
    except (error.URLError, TimeoutError, OSError, ValueError, UnicodeError, json.JSONDecodeError):
        return None, None


def summarize(probes: dict[str, tuple[int | None, object]]) -> dict:
    code, root = probes.get(ALLOW_PATHS[0], (None, None))
    routes = root.get("routes", {}) if code == 200 and isinstance(root, dict) else {}
    route_names = list(routes) if isinstance(routes, dict) else []
    allowed_route_hints = sorted({
        name for name in route_names
        if any(h in name.lower() for h in ("snippet", "wpcode", "header", "verify", "site-connection", "settings", "abilities"))
        and isinstance(name, str)
    })[:40]
    user_status, me = probes.get(ALLOW_PATHS[1], (None, None))
    cap = me.get("capabilities", {}) if user_status == 200 and isinstance(me, dict) else {}
    cap = cap if isinstance(cap, dict) else {}
    settings_status, settings = probes.get(ALLOW_PATHS[2], (None, None))
    setting_keys = list(settings) if settings_status == 200 and isinstance(settings, dict) else []
    settings_candidates = sorted(k for k in setting_keys if
         any(h in k.lower() for h in ("wpseo", "verify", "google", "header", "snippet")))[:30]
    plugins_status, plugins = probes.get(ALLOW_PATHS[3], (None, None))
    plugins = plugins if plugins_status == 200 and isinstance(plugins, list) else []
    plugin_candidates = sorted({
        str(p.get("plugin", "")).split("/")[0]
        for p in plugins if isinstance(p, dict) and
        any(h in str(p.get("plugin", "")).lower() for h in ("wpcode", "snippet", "header", "wordpress-seo", "site-kit"))
    })[:20]
    ability_status, abilities = probes.get(ALLOW_PATHS[4], (None, None))
    abilities = abilities if ability_status == 200 and isinstance(abilities, list) else []
    ability_names = sorted({
        str(a.get("name", ""))
        for a in abilities if isinstance(a, dict) and
        any(h in str(a.get("name", "")).lower() for h in ("verification", "connection", "site-representation", "settings"))
    })[:30]
    return {
      "schema_version": 1, "site": SITE,
      "checked_at_utc": datetime.now(timezone.utc).isoformat(),
      "channel": "github_actions_wordpress_application_password_get_only",
      "http_statuses": {p.split("?")[0]: probes.get(p, (None, None))[0] for p in ALLOW_PATHS},
      "authenticated_user_checked": user_status == 200,
      "can_manage_options": bool(cap.get("manage_options")) if user_status == 200 else None,
      "can_install_plugins": bool(cap.get("install_plugins")) if user_status == 200 else None,
      "can_edit_theme_options": bool(cap.get("edit_theme_options")) if user_status == 200 else None,
      "registered_site_option_keys": settings_candidates,
      "site_specific_route_hints": allowed_route_hints,
      "installed_extension_hints": plugin_candidates,
      "supported_ability_name_hints": ability_names,
      "proof_of_writable_gsc_verification_field": any("google" in k.lower() and "verif" in k.lower() for k in settings_candidates)
        or any("verification" in a.lower() or "site-connection" in a.lower() for a in ability_names),
      "word_press_writes": 0, "wpvibe_calls": 0,
      "gsc_tag_inserted": False, "theme_deployed": False,
    }


def main():
    user = os.getenv("SOLAR_WP_USER", "").strip()
    password = os.getenv("SOLAR_WP_APP_PASSWORD", "").strip()
    # Never print secrets, responses, plugin settings, user identity or option values.
    data = summarize({p: fetch_approved(p, user, password) for p in ALLOW_PATHS})
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOLAR_GSC_DIRECT_REST_PRECHECK auth=" + str(data["authenticated_user_checked"]).lower()
          + " capability=" + str(data["can_manage_options"]).lower()
          + " supported_field=" + str(data["proof_of_writable_gsc_verification_field"]).lower()
          + " writes=0 wpvibe_calls=0")


if __name__ == "__main__":
    main()
