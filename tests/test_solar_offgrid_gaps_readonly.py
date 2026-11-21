"""No-write and no-content-leak proof for scoped off-grid post discovery."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import editorial_release as publisher
from scripts import editorial_offgrid_gaps_readonly as gap


class OffgridGapAuditTest(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.raw = '<p>PRIVATE-BODY-STRING <a href="/solarni-sestava-na-chatu/">Ready</a></p>'
        self.bad = False

    def fake_wp(self, method, route, *, query=None, body=None):
        self.assertEqual(method, "GET")
        self.assertIsNone(body)
        self.calls.append((route, query))
        if route == "/wp/v2/categories":
            return [{"id": 3, "slug": "solarni-panely"}]
        if route == "/wp/v2/posts":
            def post(idx, slug, content):
                return {
                    "id": idx, "slug": slug, "status": "publish",
                    "link": publisher.SITE + "/" + slug + "/",
                    "modified_gmt": "2026-11-20T07:00:00",
                    "categories": [3], "content": {"raw": content},
                }
            items = [
                post(1, "solarni-panel-pro-kameru-na-chate", self.raw),
                post(2, "jak-vybrat-mppt-pro-ostrovni-chatu", "<p>Unlinked buyer path.</p>"),
                post(3, "fotovoltaika-pro-rodinny-dum", "<p>Never route to off-grid.</p>"),
                post(4, "solarni-panel-pro-cerpadlo", "<p>Missing quote and Builder.</p>"),
            ]
            if self.bad:
                items[1]["link"] = "https://evil.example/suspicious/"
            return items
        raise AssertionError(route)

    def test_verified_candidate_gaps_do_not_expose_raw_wordpress_content(self):
        with patch.object(publisher, "wp", side_effect=self.fake_wp):
            r = gap.inspect()
        self.assertEqual(r["status"], "verified_get_only")
        self.assertEqual(r["posts_examined"], 4)
        self.assertEqual(r["buyer_intent_posts"], 3)
        self.assertEqual(r["with_builder"], 1)
        self.assertEqual(r["missing_both"], 2)
        self.assertEqual([row["post_id"] for row in r["candidates"]], [2, 4])
        self.assertEqual(r["writes"], 0)
        self.assertNotIn("PRIVATE-BODY-STRING", json.dumps(r))
        self.assertNotIn("evil.example", json.dumps(r))
        self.assertFalse(r["publish_authorized"])
        self.assertFalse(r["theme_deploy_authorized"])

    def test_canonical_mismatch_is_explicitly_unverified_not_false_zero(self):
        self.bad = True
        with patch.object(publisher, "wp", side_effect=self.fake_wp):
            result = gap.inspect()
        self.assertEqual(result["status"], "verified_partial_get_only")
        self.assertEqual(result["unverified_rows"], 1)
        self.assertEqual(result["posts_examined"], 3)
        self.assertEqual(result["missing_both"], 1)
        self.assertEqual([row["post_id"] for row in result["candidates"]], [4])
        self.assertEqual(result["writes"], 0)

    def test_no_auth_never_returns_fake_zero_coverage(self):
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(gap, "OUTPUT", Path(tmp) / "result.json"), \
             patch.object(publisher, "wp", side_effect=publisher.Blocked("SECRET")):
            self.assertEqual(gap.main(), 2)
            content = gap.OUTPUT.read_text(encoding="utf-8")
            self.assertNotIn("SECRET", content)
            self.assertIn("blocked_no_evidence", content)


if __name__ == "__main__":
    unittest.main()
