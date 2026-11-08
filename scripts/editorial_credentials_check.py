#!/usr/bin/env python3
"""Read-only readiness probe for dedicated Solar Expert WordPress editor.

No WordPress writes, secret logs, retries, affiliate requests or user data output.
"""
from __future__ import annotations

import base64
import json
import os
import sys
from urllib import error, request

SITE = "https://solar-expert.cz"


class NoRedirects(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("unexpected_redirect")


def main() -> int:
    user = os.getenv("SOLAR_WP_USER", "")
    password = os.getenv("SOLAR_WP_APP_PASSWORD", "")
    if not user or not password:
        print("SOLAR_EDITORIAL_CREDENTIALS status=configuration_missing writes=0")
        return 2

    basic = base64.b64encode((user + ":" + password).encode("utf-8")).decode("ascii")
    opener = request.build_opener(NoRedirects())

    def get(path: str):
        req = request.Request(
            SITE + "/wp-json" + path,
            headers={
                "Authorization": "Basic " + basic,
                "Accept": "application/json",
                "User-Agent": "SolarExpert-EditorialCredentialReadOnly/1",
            },
            method="GET",
        )
        with opener.open(req, timeout=20) as response:
            if response.status != 200:
                raise RuntimeError("unexpected_http_status")
            return json.loads(response.read(300_000).decode("utf-8"))

    try:
        me = get("/wp/v2/users/me?context=edit&_fields=id,capabilities")
        caps = me.get("capabilities", {}) if isinstance(me, dict) else {}
        if not isinstance(caps, dict) or not all(
            caps.get(x) is True for x in ("edit_posts", "publish_posts", "edit_others_posts")
        ):
            print("SOLAR_EDITORIAL_CREDENTIALS status=insufficient_editor_permissions writes=0")
            return 3
        cat = get("/wp/v2/categories?slug=solarni-panely&_fields=id,slug")
        if not isinstance(cat, list) or len(cat) != 1 or cat[0].get("slug") != "solarni-panely":
            print("SOLAR_EDITORIAL_CREDENTIALS status=category_unverified writes=0")
            return 4
        article = get("/wp/v2/posts/1618?context=edit&_fields=id,slug,content")
        if not isinstance(article, dict) or article.get("id") != 1618 or (
            article.get("slug") != "solarni-panel-na-karavan-200w"
        ) or not isinstance(article.get("content", {}).get("raw"), str):
            print("SOLAR_EDITORIAL_CREDENTIALS status=raw_post_read_unverified writes=0")
            return 5
    except error.HTTPError as exc:
        print("SOLAR_EDITORIAL_CREDENTIALS status=http_" + str(exc.code) + " writes=0")
        return 6
    except (error.URLError, TimeoutError, RuntimeError, ValueError, json.JSONDecodeError):
        print("SOLAR_EDITORIAL_CREDENTIALS status=transport_or_response_block writes=0")
        return 7

    print("SOLAR_EDITORIAL_CREDENTIALS status=ready scope=publish_edit_existing writes=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
