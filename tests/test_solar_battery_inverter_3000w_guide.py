"""Source-only 3000W LiFePO4 buyer guide: no release authorization or WP writes."""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_html  # noqa: E402


class SolarBatteryInverter3000WGuideTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = (ROOT / "content/rewrites/jakou-baterii-k-menici-3000w.html").read_text(encoding="utf-8")

    def test_safe_editable_html_and_valid_buyer_navigation(self):
        validate_html(self.body, "jakou-baterii-k-menici-3000w")
        for route in ("/vyber-baterii/", "/vyber-menice/", "/mppt-kalkulacka/", "/solarni-sestava-na-chatu/"):
            self.assertIn('href="' + route + '"', self.body)
        for disallowed in ("<script", "<?php", "a_aid=", "ehub.cz", "desturl=", "zaručeně skladem"):
            self.assertNotIn(disallowed, self.body.lower())

    def test_dc_current_and_energy_contract(self):
        for voltage, shown in ((12.8, "260 A"), (25.6, "130 A"), (51.2, "65 A")):
            self.assertIn(shown, self.body)
            self.assertAlmostEqual(3000 / (voltage * .90),
                                   {12.8: 260.4166667, 25.6: 130.2083333, 51.2: 65.1041667}[voltage],
                                   places=4)
        for hours, expected in ((.25, 1042), (.5, 2083), (1, 4167), (2, 8333)):
            self.assertEqual(round(3000 * hours / (.9 * .8)), expected)
            self.assertIn(str(expected) + " Wh", self.body)
        self.assertEqual(round(51.2 * 100 * .9 * .8), 3686)

    def test_safety_and_nondeployment_boundaries(self):
        for term in ("BMS", "rozběh", "Voc", "Isc", "pojist", "48V", "výrobce", "230 V"):
            self.assertIn(term.lower(), self.body.lower())
        self.assertIn("victronenergy.com/media/pg/Lithium_Battery_Smart/en/technical-data.html", self.body)
        self.assertIn("victronenergy.com/media/pg/Lithium_Battery_Smart/en/system-design-and-bms-selection-guide.html", self.body)
        self.assertIn("pouze", self.body.lower())
        # Source-only in this PR: no editorial manifest or release activation.
        self.assertFalse((ROOT / "ops/editorial-manifests/solar-battery-inverter-3000w-20261122-v1.json").exists())


if __name__ == "__main__":
    unittest.main()
