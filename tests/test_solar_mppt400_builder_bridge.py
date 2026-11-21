"""Live-existing MPPT 400Wp article: one extra off-grid full-kit Builder path."""
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_append_snippet, validate_manifest  # noqa: E402


class MPPT400BuilderBridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "content/editorial-append/jak-vybrat-mppt-regulator-pro-400w-panel.html"
        cls.body = cls.path.read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "ops/editorial-manifests/solar-mppt400-fullkit-bridge-20261121-v1.json").read_text(encoding="utf-8"))

    def test_one_safely_scoped_builder_link(self):
        validate_append_snippet(self.body, self.manifest)
        self.assertEqual(self.body.count('href="/solarni-sestava-na-chatu/"'), 1)
        for phrase in ("400 W", "Voc", "Isc", "MPPT", "baterii", "ostrovní", "ne pro síťovou FVE"):
            self.assertIn(phrase, self.body)
        self.assertNotIn("/quote-checker/", self.body)

    def test_cas_and_immutable_source(self):
        validate_manifest(self.manifest)
        self.assertEqual(self.manifest["post_id"], 1612)
        self.assertEqual(self.manifest["kind"], "post_append")
        self.assertEqual(self.manifest["source_file"], str(self.path.relative_to(ROOT)))
        self.assertEqual(self.manifest["source_sha256"], hashlib.sha256(self.body.encode("utf-8")).hexdigest())
        self.assertEqual(self.manifest["expected_current_sha256"],
                         "49c73c1d0d6a7f8b6a8cfa2ba1620eb692a8eab0b7d90908952a881e40bd30bc")
        self.assertEqual(self.manifest["expected_modified_gmt"], "2026-11-15T09:23:53")
        control = json.loads((ROOT / "ops/editorial-release.json").read_text(encoding="utf-8"))
        if control["manifest"] == "ops/editorial-manifests/solar-mppt400-fullkit-bridge-20261121-v1.json":
            self.assertEqual(control["activation_revision"], 23)
            self.assertTrue(control["enabled"])


if __name__ == "__main__":
    unittest.main()
