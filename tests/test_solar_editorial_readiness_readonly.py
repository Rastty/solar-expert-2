"""Offline fail-closed contract for authenticated read-only Starlink readiness."""
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from scripts import editorial_readiness_readonly as probe
from scripts import editorial_release as release


class TestReadiness(unittest.TestCase):
    def setUp(self):
        self.methods = []
        self.category_calls = 0

    def wp(self, method, route, *, query=None, **kwargs):
        self.methods.append((method, route, query))
        if method != "GET":
            raise AssertionError("Readiness may NEVER attempt a WordPress write")
        if route == "/wp/v2/users/me":
            return {"capabilities": {
                "edit_posts": True, "edit_others_posts": True, "publish_posts": True}}
        if route == "/wp/v2/categories":
            return [{"id": 21, "slug": "solarni-panely"}]
        if route == "/wp/v2/posts":
            return []
        if route == "/wp/v2/pages":
            return []
        raise AssertionError("Unexpected WordPress route: " + route)

    def test_clear_snapshot_has_no_publish_authorization(self):
        with patch.object(release, "wp", side_effect=self.wp), \
             patch.object(release, "recent_posts_gate", return_value=None) as gate:
            data = probe.snapshot()
        self.assertEqual(data["status"], "clear_read_only_snapshot")
        self.assertTrue(data["rolling_24h_posts_clear_at_snapshot"])
        self.assertTrue(data["target_slug_absent_at_snapshot"])
        self.assertTrue(data["editor_capabilities_verified"])
        self.assertFalse(data["other_wordpress_writers_absence_proven"])
        self.assertFalse(data["publish_authorized"])
        self.assertEqual(data["writes"], 0)
        self.assertEqual([m for m, *_ in self.methods], ["GET"] * len(self.methods))
        self.assertEqual(len(self.methods), 4)
        gate.assert_called_once_with()

    def test_recent_post_blocks_but_never_attempts_a_publish(self):
        with patch.object(release, "wp", side_effect=self.wp), \
             patch.object(release, "recent_posts_gate", side_effect=release.Blocked(
                 "A published WordPress post exists within the last 24h UTC; stop")):
            data = probe.snapshot()
        self.assertEqual(data["status"], "blocked_rolling_24h_post")
        self.assertFalse(data["rolling_24h_posts_clear_at_snapshot"])
        self.assertFalse(data["publish_authorized"])

    def test_unverifiable_pagination_fails_closed(self):
        with patch.object(release, "wp", side_effect=self.wp), \
             patch.object(release, "recent_posts_gate",
                          side_effect=release.Blocked("Cannot prove pagination")):
            data = probe.snapshot()
        self.assertEqual(data["status"], "unknown_or_transport")

    def test_slug_post_and_page_collision_each_block(self):
        for target, expected in [
            ("/wp/v2/posts", "blocked_post_slug_occupied"),
            ("/wp/v2/pages", "blocked_page_slug_occupied"),
        ]:
            self.methods = []

            def wp(method, route, *, query=None, **kwargs):
                result = self.wp(method, route, query=query, **kwargs)
                if route == target:
                    return [{"id": 77, "slug": probe.TARGET}]
                return result

            with self.subTest(target=target), \
                 patch.object(release, "wp", side_effect=wp), \
                 patch.object(release, "recent_posts_gate") as gate:
                data = probe.snapshot()
            self.assertEqual(data["status"], expected)
            self.assertFalse(data["rolling_24h_posts_clear_at_snapshot"])
            gate.assert_not_called()

    def test_no_editor_auth_and_bad_capabilities_block(self):
        def no_caps(method, route, *, query=None, **kwargs):
            self.methods.append((method, route, query))
            return {"capabilities": {"edit_posts": True, "publish_posts": False}}

        with patch.object(release, "wp", side_effect=no_caps):
            data = probe.snapshot()
        self.assertEqual(data["status"], "blocked_editor_capability")
        self.assertFalse(data["editor_capabilities_verified"])

        with patch.object(release, "wp", side_effect=release.Blocked("Secret private transport error")):
            data = probe.snapshot()
        self.assertEqual(data["status"], "unknown_or_transport")
        self.assertNotIn("Secret", json.dumps(data))

    def test_only_sanitized_snapshot_artifact(self):
        with tempfile.TemporaryDirectory() as dirname, \
             patch.object(probe, "OUTPUT", Path(dirname) / "status.json"), \
             patch.object(release, "wp", side_effect=self.wp), \
             patch.object(release, "recent_posts_gate", return_value=None):
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertEqual(probe.main(), 0)
            data = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
            self.assertEqual(data["writes"], 0)
            self.assertFalse(data["publish_authorized"])
            self.assertEqual(data["status"], "clear_read_only_snapshot")
            self.assertIn("writes=0 publish_authorized=false", output.getvalue())
            self.assertNotIn("capabilities", output.getvalue())


if __name__ == "__main__":
    unittest.main()
