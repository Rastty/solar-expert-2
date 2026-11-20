"""Bounded first-party total-kit handoff for the existing 200Wp caravan guide."""
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_append_snippet, validate_manifest  # noqa: E402


class CaravanBuilderBridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "content/editorial-append/solarni-panel-na-karavan-200w.html"
        cls.body = cls.path.read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "ops/editorial-manifests/solar-caravan-builder-bridge-20261120-v1.json").read_text(encoding="utf-8"))

    def test_one_bounded_on_site_builder_handoff_with_vehicle_caveat(self):
        validate_append_snippet(self.body, self.manifest)
        self.assertEqual(self.body.count('href="/solarni-sestava-na-chatu/"'), 1)
        for term in ("190–200Wp", "MPPT", "12V palubní", "alternátorem", "jištění", "chaty"):
            self.assertIn(term, self.body)
        self.assertNotIn("/quote-checker/", self.body)

    def test_existing_post_exact_manifest_and_activation_contract(self):
        validate_manifest(self.manifest)
        self.assertEqual(self.manifest["kind"], "post_append")
        self.assertEqual(self.manifest["post_id"], 1618)
        self.assertEqual(self.manifest["link_target"], "/solarni-sestava-na-chatu/")
        self.assertEqual(self.manifest["source_file"], str(self.path.relative_to(ROOT)))
        self.assertEqual(self.manifest["source_sha256"], hashlib.sha256(self.body.encode("utf-8")).hexdigest())
        control = json.loads((ROOT / "ops/editorial-release.json").read_text(encoding="utf-8"))
        if control["manifest"] == "ops/editorial-manifests/solar-caravan-builder-bridge-20261120-v1.json":
            self.assertEqual(control["activation_revision"], 21)
            self.assertTrue(control["enabled"])


if __name__ == "__main__":
    unittest.main()
