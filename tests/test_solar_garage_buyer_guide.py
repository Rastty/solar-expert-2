"""Garage guide: standalone buying intent, correct model math, safe voltage advice."""

from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_html  # noqa: E402


class GarageBuyerGuideTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = (ROOT / "content/rewrites/solarni-panel-do-garaze-bez-elektriny.html").read_text(
            encoding="utf-8"
        )

    def test_article_is_valid_unique_intent_and_buyer_handoff(self):
        validate_html(self.body, "solarni-panel-do-garaze-bez-elektriny")
        for route in (
            "/vyber-baterii/",
            "/mppt-kalkulacka/",
            "/solarni-panel-pro-wifi-kameru-a-router-na-chate/",
        ):
            self.assertIn(f'href="{route}"', self.body)
        self.assertIn("garážových vrat", self.body)
        self.assertNotIn("ehub.cz", self.body)
        self.assertNotIn("a_aid=", self.body)

    def test_energy_examples_are_reproducible_not_current_seller_quotes(self):
        self.assertEqual(12 * 3 + 8 * 24 + 10 * 24, 468)
        self.assertAlmostEqual(400 * (4 * 15) / 3600, 6.6666667, places=5)
        self.assertEqual(4 * 24, 96)
        self.assertEqual(8 * 24, 192)
        self.assertEqual(468 * 2, 936)
        self.assertEqual(12.8 * 100 * .80, 1024)
        for fact in (
            "468 Wh", "936 Wh", "1024 Wh", "192 Wh", "Voc", "Isc",
            "modelové", "Pohotovostní", "výrobc", "příkon", "PVGIS",
        ):
            self.assertIn(fact.lower(), self.body.lower())
        self.assertIn("vymyšlené modelové hodnoty", self.body.lower())
        self.assertIn("nikoli", self.body.lower())


if __name__ == "__main__":
    unittest.main()
