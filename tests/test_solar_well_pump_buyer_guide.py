"""The well-pump guide is distinct from pond pumps and does not invent offers."""

from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_html  # noqa: E402


class SolarWellPumpBuyerGuideTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = (ROOT / "content/rewrites/solarni-cerpadlo-do-studny-bez-elektriny.html").read_text(
            encoding="utf-8"
        )

    def test_publisher_guard_and_actionable_onsite_routes(self):
        validate_html(self.body, "solarni-cerpadlo-do-studny-bez-elektriny")
        for destination in (
            "/vyber-baterii/", "/vyber-menice/", "/mppt-kalkulacka/",
            "/solarni-panel-pro-zahradni-cerpadlo-a-jezirko/",
        ):
            self.assertIn(f'href="{destination}"', self.body)
        for forbidden in ("ehub.cz", "a_aid=", "affiliate_id=", "<script", "<?php"):
            self.assertNotIn(forbidden, self.body.lower())

    def test_distinct_water_hydraulic_and_electric_safety(self):
        for requirement in (
            "dynamickou hladinu", "výtlačnou výšku", "průtok", "chod", "nasucho",
            "Voc", "Isc", "rozběh", "PVGIS", "modelové", "pitnou vodu",
        ):
            self.assertIn(requirement.lower(), self.body.lower())

    def test_model_values_are_arithmetic_not_product_claims(self):
        self.assertEqual(500 * .5, 250)
        self.assertEqual(12 * 24, 288)
        self.assertEqual(250 + 288, 538)
        self.assertEqual(538 * 2, 1076)
        self.assertEqual(12.8 * 100 * .8, 1024)
        self.assertEqual(400 * 3 * .75, 900)
        self.assertEqual(400 * 1 * .75, 300)
        self.assertEqual(600 * 3 * .75, 1350)
        for number in ("250 Wh", "288 Wh", "538 Wh", "1076 Wh", "1024 Wh", "900 Wh", "300 Wh", "1350 Wh"):
            self.assertIn(number, self.body)


if __name__ == "__main__":
    unittest.main()
