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
        self.private_content = "<p>private-at-runtime-only</p>"

    def wp(self, method, route, *, query=None, body=None):
        self.assertEqual(method, "GET")
        self.assertIsNone(body)
        self.requests.append((route, query))
        if route == "/wp/v2/categories":
            return [{"id": 3, "slug": "solarni-panely"}]
        for post_id, slug in evidence.TARGETS:
            item = {
                "id": post_id if self.bad_id != post_id else 999,
                "slug": slug,
                "status": "publish",
                "link": publisher.SITE + "/" + slug + "/",
                "categories": [3],
                "modified_gmt": "2026-11-15T08:12:14",
                "content": {"raw": self.private_content},
            }
            if route == "/wp/v2/posts/" + str(post_id):
                return item
            if route == "/wp/v2/posts" and query and query.get("slug") == slug:
                return [item]
        raise AssertionError("Unexpected REST route")

    def test_three_published_posts_get_fingerprints_no_writes_or_body_leak(self):
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(len(result["posts"]), 3)
        self.assertTrue(all(x["status"] == "verified_current_published_post"
                            for x in result["posts"]))
        self.assertTrue(all(x["current_source_sha256"] == publisher.sha(self.private_content)
                            for x in result["posts"]))
        self.assertEqual(result["writes"], 0)
        self.assertFalse(result["publish_authorized"])
        self.assertFalse(result["theme_deploy_authorized"])
        self.assertNotIn(self.private_content, json.dumps(result))
        self.assertEqual(len(self.requests), 7)

    def test_identity_change_fails_only_affected_post(self):
        self.bad_id = 1612
        with patch.object(publisher, "wp", side_effect=self.wp):
            result = evidence.inspect()
        self.assertEqual(result["posts"][0]["status"], "unknown_or_unavailable")
        self.assertIsNone(result["posts"][0]["current_source_sha256"])
        self.assertEqual(result["posts"][1]["status"], "verified_current_published_post")

    def test_auth_failure_never_archives_private_error_or_body(self):
        with tempfile.TemporaryDirectory() as tmp, \
             patch.object(evidence, "OUTPUT", Path(tmp) / "fingerprints.json"), \
             patch.object(publisher, "wp", side_effect=publisher.Blocked("SECRET")):
            self.assertEqual(evidence.main(), 0)
            saved = evidence.OUTPUT.read_text(encoding="utf-8")
            self.assertNotIn("SECRET", saved)
            self.assertNotIn(self.private_content, saved)
            self.assertTrue(all(row["status"] == "unknown_or_unavailable"
                                for row in json.loads(saved)["posts"]))


if __name__ == "__main__":
    unittest.main()
