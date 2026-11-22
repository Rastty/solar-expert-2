"""Evidence-based SVJ payback rewrite. Offline only; never create affiliate clicks."""
import hashlib
import re
import unittest
from pathlib import Path

from scripts import editorial_release as publisher

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/rewrites/navratnost-fotovoltaicke-elektrarny-v-bytovem-dome.html"


class SvjPayback2026(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = SOURCE.read_text(encoding="utf-8")

    def test_editorial_and_electrical_safety(self):
        publisher.validate_html(self.body, "navratnost-fotovoltaicke-elektrarny-v-bytovem-dome")
        self.assertTrue(3500 <= len(self.body) <= 90000)
        self.assertIn("cold Voc", self.body)
        self.assertIn("Isc", self.body)
        self.assertNotIn("ehub.cz", self.body)
        self.assertNotIn("a_aid=", self.body)

    def test_actual_svj_route_and_official_evidence(self):
        for url in [
            "https://eru.gov.cz/sdileni-elektriny-energeticka-spolecenstvi",
            "https://www.cezdistribuce.cz/pro-zakazniky/potrebuji-vyresit/stavajici-pripojeni/sdileni-elektriny",
            "https://novazelenausporam.cz/bezurocny-uver-svj-bytova-druzstva/",
            "https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/",
        ]:
            self.assertIn(url, self.body)
        self.assertIn("SVJ", self.body)
        self.assertIn("EDC", self.body)
        self.assertIn("patnáctiminutových intervalech", self.body)
        self.assertIn("smluvně", self.body)

    def test_model_is_not_false_market_price_or_guaranteed_payback(self):
        for formula in ("18 000 kWh", "43 200 Kč", "7 200 Kč", "40 400 Kč", "19,8 roku"):
            self.assertIn(formula, self.body)
        for qualification in ("ilustrativní", "modelové", "není", "bez baterie", "Úvěr není totéž"):
            self.assertIn(qualification, self.body)
        self.assertNotIn("zaručen", self.body.lower())
        self.assertIn("přímý odkaz", self.body.lower())

    def test_three_actual_internal_buyer_paths(self):
        links = re.findall(r'href="(/[^"]+)"', self.body)
        for path in ("/co-je-1-kwp/", "/kolik-stoji-fotovoltaika/",
                     "/kolik-panelu-je-potreba-na-jeden-string/"):
            self.assertIn(path, links)
        self.assertGreaterEqual(len(links), 4)

    def test_print_pinned_sha_for_separate_one_write_manifest(self):
        print("SOLAR_SVJ_SOURCE_SHA256=" + hashlib.sha256(self.body.encode("utf-8")).hexdigest())


if __name__ == "__main__":
    unittest.main()
