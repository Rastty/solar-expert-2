"""Offline gate for the first autonomous Solar Expert article candidate."""
import hashlib
import json
from pathlib import Path
import re
import unittest

from scripts import editorial_release as publisher

ROOT = Path(__file__).resolve().parents[1]
SLUG = "solarni-panel-pro-wifi-kameru-a-router-na-chate"
HTML_PATH = ROOT / "content/rewrites" / (SLUG + ".html")
MANIFEST_PATH = ROOT / "ops/editorial-manifests/solar-wifi-router-camera-offgrid-20261108-v1.json"


class BuyerGuideContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = HTML_PATH.read_text(encoding="utf-8")
        cls.manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    def test_immutable_source_has_exact_sha256_and_publish_identity(self):
        m = self.manifest
        publisher.validate_manifest(m)
        publisher.validate_html(self.html, SLUG)
        self.assertEqual(m["kind"], "post_create")
        self.assertEqual(m["slug"], SLUG)
        self.assertEqual(m["source_file"], "content/rewrites/" + SLUG + ".html")
        self.assertEqual(hashlib.sha256(self.html.encode("utf-8")).hexdigest(), m["source_sha256"])
        self.assertRegex(m["source_commit"], "^[0-9a-f]{40}$")
        self.assertTrue(m["expect_absent"])

    def test_specific_problem_and_distinct_buyer_decision(self):
        for expected in (
            "Wi-Fi router", "IP kamera", "384 Wh", "461 Wh", "922 Wh",
            "12,8 V / 50 Ah", "12,8 V / 100 Ah", "512 Wh",
            "1 024 Wh", "300 Wh/den", "600 Wh/den", "2,2 dne",
            "PoE", "PVGIS", "MPPT",
        ):
            self.assertIn(expected, self.html)
        self.assertGreaterEqual(self.html.count("<h2>"), 6)
        self.assertGreaterEqual(self.html.count("<table>"), 2)
        self.assertIn("nepřetržitý", self.html)
        self.assertIn("modelové", self.html)

    def test_live_tool_caveat_and_physical_safety(self):
        for expected in (
            "PV Isc ani počet paralelních větví zatím automaticky neověřuje",
            "výkonem, Voc a Vmp",
            "maximální povolený zkratový proud",
            "BMS", "nízkoteplotní nabíjení",
            "jištění", "datasheet",
        ):
            self.assertIn(expected, self.html)
        self.assertIn("100/20", self.html)
        self.assertIn("290 Wp při 12V", self.html)
        self.assertNotIn("garantuje nepřetržitý provoz", self.html)

    def test_pure_editorial_safe_links_not_fake_affiliate_clicks(self):
        for path in (
            "/vyber-baterii/", "/mppt-kalkulacka/",
            "/vyber-menice/", "/solarni-panel-na-karavan-200w/",
            "/affiliate-transparentnost/", "/jak-doporucujeme/",
        ):
            self.assertIn('href="' + path + '"', self.html)
        self.assertIn("https://www.victronenergy.com/media/pg/", self.html)
        self.assertIn("https://joint-research-centre.ec.europa.eu/", self.html)
        self.assertNotRegex(self.html, r"(?i)ehub\.cz|desturl=|a_aid=|<script|<iframe")
        self.assertNotRegex(self.html, r"(?i)skladem|nejlevnější na trhu|garantovaný výnos")


if __name__ == "__main__":
    unittest.main()
