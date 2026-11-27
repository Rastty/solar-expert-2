"""An 800Wp off-grid buyer guide may refer only to the matching live quote tool."""
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_append_snippet, validate_manifest, validate_html  # noqa: E402


class Battery800QuoteBridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "content/editorial-append/jakou-baterii-a-mppt-k-solarnim-panelum-800w.html"
        cls.body = cls.path.read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "ops/editorial-manifests/solar-battery800-quote-bridge-20261120-v1.json").read_text(encoding="utf-8"))

    def test_one_bounded_quote_link_and_compatible_scope(self):
        validate_append_snippet(self.body, self.manifest)
        self.assertEqual(self.body.count('href="/quote-checker/"'), 1)
        self.assertIn("ostrovní", self.body)
        self.assertIn("ne posouzení síťové FVE", self.body)
        for term in ("baterie", "měniče", "napětí", "rozběhovou", "800 Wp"):
            self.assertIn(term, self.body)

    def test_exact_pinned_post_and_release_control_contract(self):
        validate_manifest(self.manifest)
        self.assertEqual(self.manifest["kind"], "post_append")
        self.assertEqual(self.manifest["post_id"], 1632)
        self.assertEqual(self.manifest["link_target"], "/quote-checker/")
        self.assertEqual(self.manifest["source_file"], str(self.path.relative_to(ROOT)))
        self.assertEqual(self.manifest["source_sha256"], hashlib.sha256(self.body.encode("utf-8")).hexdigest())
        control = json.loads((ROOT / "ops/editorial-release.json").read_text(encoding="utf-8"))
        if control["manifest"] == "ops/editorial-manifests/solar-battery800-quote-bridge-20261120-v1.json":
            self.assertEqual(control["activation_revision"], 20)
            self.assertTrue(control["enabled"])

    def test_current_800wp_topology_guide_and_preserved_append(self):
        body = (ROOT / "content/rewrites/jakou-baterii-a-mppt-k-solarnim-panelum-800w.html").read_text(encoding="utf-8")
        validate_html(body, "jakou-baterii-a-mppt-k-solarnim-panelum-800w")
        self.assertIn(self.body.strip(), body)
        self.assertEqual(body.count('href="/quote-checker/"'), 1)
        self.assertNotIn("zatím automaticky nedokládá", body)
        for token in ("1S2P", "2S1P", "54,88 V", "109,76 V", "22 A", "11 A",
                      "maximální PV Isc 20 A", "výrobní limit 35 A", "880 Wp",
                      "2 × 400 Wp · 24 V · 1S2P", "Vmp za horka", "návrhový Isc",
                      "předběžnými kontrolami", "nikoliv úplným návrhem"):
            self.assertIn(token, body)
        self.assertEqual(400*2, 800)
        self.assertAlmostEqual(49*1.12, 54.88)
        self.assertAlmostEqual(49*2*1.12, 109.76)
        self.assertEqual(11*2, 22)
        self.assertGreater(22, 20)
        self.assertGreater(49*2*1.12, 100)
        print("SOLAR_800WP_REVIEWED_SOURCE_SHA256=" + hashlib.sha256(body.encode("utf-8")).hexdigest())


if __name__ == "__main__":
    unittest.main()
