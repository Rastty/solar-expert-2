"""Synthetic checks of the narrow, secret-free buyer post GET fingerprint."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import editorial_release as publisher
from scripts import editorial_target_fingerprints_readonly as evidence


class FingerprintsReadOnlyContract(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.bad_id = None
        self.ambiguous_discovery = False
        self.heat_category_missing = False
        self.heat_category_wrong = False
        self.private_content = "<p>private-at-runtime-only</p>"

    def wp(self, method, route, *, query=None, body=None):
        self.assertEqual(method, "GET")
        self.assertIsNone(body)
        self.requests.append((route, query))
        if route == "/wp/v2/categories":
            if query and query.get("slug") == "tepelna-cerpadla":
                if self.heat_category_missing:
                    return []
                return [{"id": 7, "slug": "tepelna-cerpadla"}]
            return [{"id": 3, "slug": "solarni-panely"}]
        if self.ambiguous_discovery and route == "/wp/v2/posts" and query and query.get("slug") in evidence.DISCOVERY_SLUGS:
            return [{"id": 1777, "slug": query["slug"]}, {"id": 1778, "slug": query["slug"]}]
        for post_id, slug in (*evidence.TARGETS, (1777, evidence.DISCOVERY_SLUGS[0]),
                              (1779, evidence.DISCOVERY_SLUGS[1])):
            item = {
                "id": post_id if self.bad_id != post_id else 999,
                "slug": slug,
                "status": "publish",
                "link": publisher.SITE + "/" + slug + "/",
                "categories": ([3] if self.heat_category_wrong else [7])
                              if slug == evidence.DISCOVERY_SLUGS[1] else [3],
                "modified_gmt": "2026-11-15T08:12:14",
                "content": {"raw": self.private_content},
            }
            if route == "/wp/v2/posts/" + str(post_id):
                return item
            if route == "/wp/v2/posts" and query and query.get("slug") == slug:
                return [item]
        raise AssertionError("Unexpected REST route")

    def test_eleven_published_posts_get_fingerprints_no_writes_or_body_leak(self):
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(len(result["posts"]), 11)
        self.assertTrue(all(x["status"] == "verified_current_published_post"
                            for x in result["posts"]))
        self.assertTrue(all(x["current_source_sha256"] == publisher.sha(self.private_content)
                            for x in result["posts"]))
        self.assertEqual(result["writes"], 0)
        self.assertFalse(result["publish_authorized"])
        self.assertFalse(result["theme_deploy_authorized"])
        self.assertNotIn(self.private_content, json.dumps(result))
        self.assertEqual(len(self.requests), 26)
        self.assertTrue(all(row["buyer_route_counts"] == {"complete_kit_builder": 0, "offgrid_quote_checker": 0} for row in result["posts"]))

    def test_count_real_anchors_only_and_never_store_body_or_urls(self):
        self.private_content = (
            '<p>Private evidence <a href="/solarni-sestava-na-chatu/">Builder</a> '
            '<a href="https://solar-expert.cz/quote-checker/?ref=internal">Quote</a> '
            '<a href="https://evil.example/solarni-sestava-na-chatu/">Unsafe</a> '
            '<a href="//evil.example/quote-checker/">Offsite</a> '
            '<a href="/solarni-sestava-na-chatu/faq">Subpath</a></p>'
            '<pre>href="/solarni-sestava-na-chatu/"</pre>'
        )
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        for row in result["posts"]:
            self.assertEqual(row["buyer_route_counts"], {
                "complete_kit_builder": 1, "offgrid_quote_checker": 1
            })
        self.assertNotIn(self.private_content, json.dumps(result))
        self.assertNotIn("evil.example", json.dumps(result))
        self.assertEqual(result["writes"], 0)

    def test_heatpump_never_inherits_solar_category(self):
        self.heat_category_wrong = True
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(len(result["posts"]), 11)
        self.assertEqual(result["posts"][-1]["slug"], evidence.DISCOVERY_SLUGS[1])
        self.assertEqual(result["posts"][-1]["status"], "unknown_or_unavailable")
        self.assertTrue(all(row["status"] == "verified_current_published_post"
                            for row in result["posts"][:-1]))
        self.assertEqual(result["writes"], 0)

    def test_unverified_heatpump_taxonomy_never_grants_authorization(self):
        self.heat_category_missing = True
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(result["posts"][-1]["status"], "unknown_or_unavailable")
        self.assertIsNone(result["posts"][-1]["current_source_sha256"])
        self.assertFalse(result["publish_authorized"])
        self.assertEqual(result["writes"], 0)

    def test_identity_change_fails_only_affected_post(self):
        self.bad_id = 341
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(result["posts"][0]["status"], "unknown_or_unavailable")
        self.assertIsNone(result["posts"][0]["current_source_sha256"])
        self.assertIsNone(result["posts"][0]["buyer_route_counts"])
        self.assertEqual(result["posts"][1]["status"], "verified_current_published_post")

    def test_ambiguous_gsc_slug_fails_closed_without_affecting_others(self):
        self.ambiguous_discovery = True
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(len(result["posts"]), 11)
        self.assertTrue(all(row["status"] == "verified_current_published_post"
                            for row in result["posts"][:9]))
        for row in result["posts"][9:]:
            self.assertIn(row["slug"], evidence.DISCOVERY_SLUGS)
            self.assertIsNone(row["post_id"])
            self.assertEqual(row["status"], "unknown_or_unavailable")
            self.assertIsNone(row["current_source_sha256"])
        self.assertEqual(result["writes"], 0)

    def test_auth_failure_never_archives_private_error_or_body(self):
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(evidence, "OUTPUT", Path(tmp) / "fingerprints.json"), \
             patch.object(publisher, "wp", side_effect=publisher.Blocked("SECRET")):
            self.assertEqual(evidence.main(), 0)
            saved = evidence.OUTPUT.read_text(encoding="utf-8")
            self.assertNotIn("SECRET", saved)
            self.assertNotIn(self.private_content, saved)
            self.assertTrue(all(r["buyer_route_counts"] is None for r in json.loads(saved)["posts"]))
            self.assertTrue(all(row["status"] == "unknown_or_unavailable"
                                for row in json.loads(saved)["posts"]))


if __name__ == "__main__":
    unittest.main()
