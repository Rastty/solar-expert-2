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
        # Preserve the immutable CREATE receipt: its pinned source remains in
        # historical commit 773cad77; a later EDIT does not rewrite that audit.
        self.assertEqual(m["source_sha256"], "657da7a22799f46f4f154b59c257b8bbc19c22df4ff18d0e8e90cef3ee0d1bf3")
        self.assertEqual(m["source_commit"], "773cad77f6ec35705c850c4d9413a305715d747f")
        self.assertTrue(m["expect_absent"])
        # The current HTML is a newly pinned, one-post EDIT; never silently
        # reinterpret the old CREATE manifest as the latest source body.
        revised = json.loads((ROOT / "ops/editorial-manifests/solar-camera-400wp-handoff-update-20261109-v1.json").read_text(encoding="utf-8"))
        publisher.validate_manifest(revised)
        self.assertEqual(revised["kind"], "post_update")
        self.assertEqual(revised["post_id"], 1626)
        self.assertEqual(revised["expected_current_sha256"], m["source_sha256"])
        self.assertEqual(revised["expected_modified_gmt"], "2026-11-09T17:18:49")
        self.assertEqual(revised["source_commit"], "86884f23207364662696744577a7e5955179558f")
        self.assertEqual(hashlib.sha256(self.html.encode("utf-8")).hexdigest(), revised["source_sha256"])

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
            "/jakou-baterii-k-solarnimu-panelu-400w/",
            "/jak-vybrat-mppt-regulator-pro-400w-panel/",
            "/affiliate-transparentnost/", "/jak-doporucujeme/",
        ):
            self.assertIn('href="' + path + '"', self.html)
        self.assertIn("https://www.victronenergy.com/media/pg/", self.html)
        self.assertIn("https://joint-research-centre.ec.europa.eu/", self.html)
        self.assertNotRegex(self.html, r"(?i)ehub\.cz|desturl=|a_aid=|<script|<iframe")
        self.assertNotRegex(self.html, r"(?i)skladem|nejlevnější na trhu|garantovaný výnos")


if __name__ == "__main__":
    unittest.main()
