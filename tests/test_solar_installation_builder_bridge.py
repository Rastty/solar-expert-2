"""Existing installation guide: one preserved-body path to a live off-grid kit Builder."""

import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.editorial_release import append_candidate, validate_append_snippet  # noqa: E402


class SolarInstallationBuilderBridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = ROOT / "content/editorial-append/jak-zapojit-solarni-panely.html"
        cls.snippet = cls.source.read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "ops/editorial-manifests/solar-installation-builder-bridge-20261120-v1.json").read_text(encoding="utf-8"))

    def test_one_canonical_contextual_builder_link(self):
        validate_append_snippet(self.snippet, self.manifest)
        self.assertEqual(self.snippet.count('href="/solarni-sestava-na-chatu/"'), 1)
        self.assertEqual(self.snippet.count("<a "), 1)
        self.assertNotIn("href=\"https://", self.snippet)

    def test_offgrid_safety_and_noncertain_commerce(self):
        for term in ("ostrovní", "Voc", "Isc", "jištění", "dostupnost", "síťová FVE", "odborný"):
            self.assertIn(term, self.snippet)
        for unsafe in ("skladem", "garant", "nejlev", "a_aid=", "desturl=", "<script"):
            self.assertNotIn(unsafe, self.snippet.lower())

    def test_manifest_pinned_to_one_existing_post(self):
        self.assertEqual(self.manifest["kind"], "post_append")
        self.assertEqual(self.manifest["post_id"], 341)
        self.assertEqual(self.manifest["link_target"], "/solarni-sestava-na-chatu/")
        self.assertEqual(self.manifest["slug"], "jak-zapojit-solarni-panely")
        self.assertEqual(self.manifest["source_file"], str(self.source.relative_to(ROOT)))
        self.assertEqual(self.manifest["source_sha256"], hashlib.sha256(self.snippet.encode("utf-8")).hexdigest())

    def test_only_append_preserves_existing_body_and_deduplicates(self):
        original = ("<p>Zachovaný původní obsah o zapojení fotovoltaických panelů.</p>" * 12)
        candidate = append_candidate(original, self.snippet, self.manifest)
        self.assertTrue(candidate.startswith(original))
        self.assertEqual(candidate.count(self.snippet.strip()), 1)
        self.assertEqual(append_candidate(candidate, self.snippet, self.manifest), candidate)


if __name__ == "__main__":
    unittest.main()
