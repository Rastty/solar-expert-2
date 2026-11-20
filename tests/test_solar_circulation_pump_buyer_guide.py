"""Source-locked high-intent heating-pump backup guide; offline only.

No WordPress mutation, electrical installation, merchant request or invented
performance measurement. The editorial publisher retains its global 24h gate.
"""
from pathlib import Path
import re
import unittest

from scripts import editorial_release as publisher


ROOT = Path(__file__).resolve().parents[1]
SLUG = "zalozni-zdroj-pro-obehove-cerpadlo"
ARTICLE = ROOT / "content" / "rewrites" / f"{SLUG}.html"


class HeatingPumpBuyerGuide(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = ARTICLE.read_text(encoding="utf-8")

    def test_full_source_is_safe_for_single_post_editorial_lane(self):
        publisher.validate_html(self.body, SLUG)
        self.assertGreaterEqual(self.body.count("<h2>"), 5)
        self.assertNotIn("href=\"https://ehub.cz/", self.body)
        self.assertNotRegex(self.body, r"(?i)<(?:script|iframe|form|img)\b")

    def test_energy_math_accounts_for_inverter_losses_and_idle_draw(self):
        # Explicit editorial example, not a catalog SKU claim.
        dc_w = 40 / 0.90 + 10
        for hours, expected_nominal in [(4, 272), (8, 544), (12, 817), (24, 1633)]:
            self.assertAlmostEqual(dc_w * hours / 0.80, expected_nominal, delta=1)
            self.assertRegex(self.body, rf"{hours} hodin[\s\S]*?{expected_nominal} Wh")
        self.assertAlmostEqual((100 / 0.90 + 10) * 8 / 0.80, 1211, delta=1)
        self.assertIn("1211 Wh", self.body)
        self.assertIn("12,8 × 100 = 1280 Wh", self.body)

    def test_safe_ups_boundaries_and_real_buyer_handoffs(self):
        for phrase in ["ochrany proti přehřátí", "tuhá paliva", "přepnutí při výpadku",
                       "čistá sinusovka", "příkon", "bms", "voc", "isc",
                       "napájet síť zpět", "certifikovanou ups"]:
            self.assertIn(phrase, self.body.casefold())
        for path in ["/vyber-baterii/", "/vyber-menice/", "/mppt-kalkulacka/",
                     "/solarni-cerpadlo-do-studny-bez-elektriny/",
                     "/solarni-sestava-na-chatu/"]:
            self.assertIn(f'href="{path}"', self.body)
        for domain in ["atmos.eu", "api.grundfos.com", "victronenergy.com",
                       "joint-research-centre.ec.europa.eu"]:
            self.assertIn(domain, self.body)
        self.assertFalse(re.search(r"(?i)kupte teď|nejlevnější|100 % bezpečné", self.body))


if __name__ == "__main__":
    unittest.main()
