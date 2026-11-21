"""Live well-pump article: AC-only Builder CTA, preserving direct-DC path."""
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_append_snippet, validate_manifest  # noqa: E402


class WellPumpACBuilderBridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "content/editorial-append/solarni-cerpadlo-do-studny-bez-elektriny.html"
        cls.body = cls.path.read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "ops/editorial-manifests/solar-well-pump-ac-fullkit-bridge-20261121-v1.json").read_text(encoding="utf-8"))

    def test_one_ac_only_link_and_distinct_dc_hydraulic_caveats(self):
        validate_append_snippet(self.body, self.manifest)
        self.assertEqual(self.body.count('href="/solarni-sestava-na-chatu/"'), 1)
        for phrase in ("230V", "AC", "DC", "MPPT", "rozběhový", "výtlak", "průtok", "nasucho", "není návrhem"):
            self.assertIn(phrase, self.body)
        self.assertNotIn("/quote-checker/", self.body)
        self.assertNotIn("cena", self.body)

    def test_immutable_source_and_wordpress_cas(self):
        validate_manifest(self.manifest)
        self.assertEqual(self.manifest["post_id"], 1641)
        self.assertEqual(self.manifest["kind"], "post_append")
        self.assertEqual(self.manifest["source_file"], str(self.path.relative_to(ROOT)))
        self.assertEqual(self.manifest["source_sha256"], hashlib.sha256(self.body.encode("utf-8")).hexdigest())
        self.assertEqual(self.manifest["expected_current_sha256"], "828291ea8466f2e79708a4242120ccd833fea89cb82e9e9d1e6a67e28a613686")
        self.assertEqual(self.manifest["expected_modified_gmt"], "2026-11-20T13:30:38")
        control = json.loads((ROOT / "ops/editorial-release.json").read_text(encoding="utf-8"))
        if control["manifest"] == "ops/editorial-manifests/solar-well-pump-ac-fullkit-bridge-20261121-v1.json":
            self.assertEqual(control["activation_revision"], 24)
            self.assertTrue(control["enabled"])


if __name__ == "__main__":
    unittest.main()
