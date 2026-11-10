"""Offline GET-only WordPress source fingerprint for one published Starlink post."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import editorial_release as publisher
from scripts import editorial_starlink_cas_readonly as evidence


class TestCurrentStarlinkSource(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(evidence.MANIFEST.read_text(encoding="utf-8"))
        cls.article = (
            publisher.ROOT / cls.manifest["source_file"]
        ).read_text(encoding="utf-8")
        assert publisher.sha(cls.article) == cls.manifest["source_sha256"]

    def setUp(self):
        self.requests = []
        self.content = self.article
        self.modified = "2026-11-10T19:05:38"
        self.id = evidence.POST_ID
        self.slug_rows = 1

    def fake_wp(self, method, route, *, query=None, body=None):
        self.assertEqual(method, "GET", "No network writes permitted by snapshot")
        self.assertIsNone(body, "No WordPress request body permitted")
        self.requests.append((method, route, query))
        if route == "/wp/v2/categories":
            return [{"id": 3, "slug": "solarni-panely"}]
        item = {
            "id": self.id,
            "slug": evidence.SLUG,
            "status": "publish",
            "modified_gmt": self.modified,
            "link": publisher.SITE + "/" + evidence.SLUG + "/",
            "content": {"raw": self.content},
            "categories": [3],
        }
        if route == "/wp/v2/posts/" + str(evidence.POST_ID):
            return item
        if route == "/wp/v2/posts" and query and query.get("slug"):
            return [item] * self.slug_rows
        raise AssertionError("Unexpected REST route")

    def check(self):
        with patch.object(publisher, "wp", side_effect=self.fake_wp):
            return evidence.inspect()

    def test_exact_source_produces_update_cas_evidence_but_not_authorization(self):
        d = self.check()
        self.assertEqual(d["status"], "original_published_body_exact_at_snapshot")
        self.assertEqual(d["expected_current_sha256"], self.manifest["source_sha256"])
        self.assertEqual(d["expected_modified_gmt"], self.modified)
        self.assertTrue(d["original_source_sha256_verified"])
        self.assertFalse(d["publish_authorized"])
        self.assertFalse(d["theme_deploy_authorized"])
        self.assertEqual(d["writes"], 0)
        self.assertEqual(len(self.requests), 3)
        self.assertTrue(all(method == "GET" for method, _, _ in self.requests))

    def test_changed_live_body_never_yields_reusable_source_evidence(self):
        self.content += "<p>Unreviewed edit</p>"
        d = self.check()
        self.assertEqual(d["status"], "blocked_live_content_changed")
        self.assertIsNone(d["expected_current_sha256"])
        self.assertIsNone(d["expected_modified_gmt"])

    def test_duplicate_slug_and_identity_mismatch_fail_closed(self):
        self.slug_rows = 2
        d = self.check()
        self.assertEqual(d["status"], "unknown_or_unavailable")
        self.id = 999
        self.slug_rows = 1
        d = self.check()
        self.assertEqual(d["status"], "unknown_or_unavailable")

    def test_missing_modified_date_fails_closed(self):
        self.modified = "not-a-date"
        d = self.check()
        self.assertEqual(d["status"], "unknown_or_unavailable")
        self.assertIsNone(d["expected_modified_gmt"])

    def test_network_failure_and_artifact_never_leak_post_body(self):
        with patch.object(publisher, "wp", side_effect=publisher.Blocked("Private WP response")):
            d = evidence.inspect()
        self.assertEqual(d["status"], "unknown_or_unavailable")
        self.assertNotIn("Private WP", json.dumps(d))
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(evidence, "OUTPUT", Path(tmp) / "cas.json"), \
             patch.object(publisher, "wp", side_effect=self.fake_wp):
            self.assertEqual(evidence.main(), 0)
            saved = evidence.OUTPUT.read_text(encoding="utf-8")
            self.assertNotIn(self.article, saved)
            self.assertNotIn("Authorization", saved)
            self.assertEqual(json.loads(saved)["writes"], 0)


if __name__ == "__main__":
    unittest.main()
