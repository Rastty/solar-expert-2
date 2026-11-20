"""Buyer guide for 2000W inverter: current/BMS, energy and electrical scope."""

from pathlib import Path
import hashlib
import json
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_html, validate_manifest  # noqa: E402


class SolarBatteryInverter2000WGuideTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / "content/rewrites/jakou-baterii-k-menici-2000w.html"
        cls.body = cls.path.read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "ops/editorial-manifests/solar-battery-inverter-2000w-20261120-v1.json").read_text(encoding="utf-8"))

    def test_editorial_html_and_real_selector_routes(self):
        validate_html(self.body, "jakou-baterii-k-menici-2000w")
        for link in (
            "/vyber-baterii/", "/vyber-menice/", "/mppt-kalkulacka/",
            "/solarni-sestava-na-chatu/",
        ):
            self.assertIn('href="' + link + '"', self.body)
        for unsafe in ("<script", "<?php", "ehub.cz", "a_aid=", "desturl=", "zaručeně skladem"):
            self.assertNotIn(unsafe, self.body.lower())

    def test_dc_current_and_runtime_mathematics(self):
        self.assertAlmostEqual(2000 / (12.8 * .90), 173.6111, places=3)
        self.assertAlmostEqual(2000 / (25.6 * .90), 86.8056, places=3)
        self.assertAlmostEqual(2000 / (51.2 * .90), 43.4028, places=3)
        for hours, nominal in ((.25, 694), (.5, 1389), (1, 2778), (2, 5556)):
            self.assertEqual(round(2000 * hours / (.90 * .80)), nominal)
            self.assertIn(str(nominal) + " Wh", self.body)
        self.assertAlmostEqual(25.6 * 100 * .8 * .9, 1843.2, places=1)
        self.assertAlmostEqual(12.8 * 100 * .8 * .9, 921.6, places=1)
        for shown in ("174 A", "87 A", "43 A", "1843 Wh", "922 Wh"):
            self.assertIn(shown, self.body)

    def test_bms_peak_pv_safety_and_primary_documents(self):
        for term in ("BMS", "rozběh", "Voc", "Isc", "pojistka", "230 V", "48V", "výrobce"):
            self.assertIn(term.lower(), self.body.lower())
        self.assertIn("victronenergy.com/media/pg/Lithium_Battery_Smart/en/technical-data.html", self.body)
        self.assertIn("victronenergy.com/media/pg/Lithium_Battery_Smart/en/system-design-and-bms-selection-guide.html", self.body)
        self.assertIn("victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html", self.body)

    def test_future_release_remains_held_and_exact_source_is_pinned(self):
        validate_manifest(self.manifest)
        self.assertEqual(self.manifest["kind"], "post_create")
        self.assertTrue(self.manifest["expect_absent"])
        self.assertEqual(self.manifest["slug"], "jakou-baterii-k-menici-2000w")
        self.assertEqual(self.manifest["source_file"], str(self.path.relative_to(ROOT)))
        self.assertEqual(self.manifest["source_sha256"], hashlib.sha256(self.body.encode("utf-8")).hexdigest())
        control = json.loads((ROOT / "ops/editorial-release.json").read_text(encoding="utf-8"))
        self.assertNotEqual(control["manifest"], "ops/editorial-manifests/solar-battery-inverter-2000w-20261120-v1.json")


if __name__ == "__main__":
    unittest.main()
