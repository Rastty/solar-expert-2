"""Guard the distinct garden-pump buyer intent and truthful sizing math."""

from pathlib import Path
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import validate_html  # noqa: E402


class GardenPumpGuideTest(unittest.TestCase):
    def setUp(self):
        self.body = (ROOT / "content/rewrites/solarni-panel-pro-zahradni-cerpadlo-a-jezirko.html").read_text(encoding="utf-8")

    def test_editorial_safety_and_buying_routes(self):
        validate_html(self.body, "solarni-panel-pro-zahradni-cerpadlo-a-jezirko")
        for target in ("/vyber-baterii/", "/mppt-kalkulacka/", "/solarni-sestava-na-chatu/"):
            self.assertIn(f'href="{target}"', self.body)
        self.assertNotIn("ehub.cz", self.body)

    def test_models_remain_honest(self):
        for expected in ("240 Wh", "840 Wh", "360 Wh", "225 Wh", "338 Wh", "300 Wh", "512 Wh", "0,61 dne"):
            self.assertIn(expected, self.body)
        for caveat in ("rozběhov", "Isc", "Voc", "modelové", "kvalifikovan"):
            self.assertIn(caveat, self.body)


if __name__ == "__main__":
    unittest.main()
