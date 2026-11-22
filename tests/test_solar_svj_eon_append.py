"""Exact-source E.ON SVJ partner CTA appended without replacing live editorial."""
import json
import unittest
from pathlib import Path

from scripts import editorial_release as e

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"content/editorial-append/navratnost-fotovoltaicke-elektrarny-v-bytovem-dome.html"
MANIFEST=ROOT/"ops/editorial-manifests/solar-svj-eon-qualified-lead-append-20261122-v1.json"


class ScopedSvjLead(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
        cls.snippet=SOURCE.read_text(encoding="utf-8")

    def test_exact_wp_post_and_source_references(self):
        m=self.manifest
        e.validate_manifest(m)
        e.validate_append_snippet(self.snippet,m)
        self.assertEqual(m["kind"],"post_append")
        self.assertEqual(m["post_id"],377)
        self.assertEqual(m["slug"],e.SVJ_SLUG)
        self.assertEqual(m["link_target"],e.SVJ_EON_URL)
        self.assertEqual(m["source_commit"],"7b40877c621168be1b5956f4efd4738043fc3344")
        self.assertEqual(e.sha(self.snippet),m["source_sha256"])
        self.assertEqual(m["expected_current_sha256"],
                         "593d57385d028783072865af20ff32220d7c8341e4621c1ea02dae21556bce1f")
        self.assertEqual(m["expected_modified_gmt"],"2026-10-07T11:20:08")
        self.assertIn("může být partnerský",self.snippet)
        self.assertNotIn("ehub.cz",self.snippet)
        self.assertNotIn("a_aid=",self.snippet)

    def test_exact_single_external_lead_markup_and_adversarial_rejections(self):
        m=self.manifest
        url=e.SVJ_EON_URL
        for bad in (
            self.snippet.replace(url,"https://www.eon.cz.evil.example/fotovoltaika-pro-svj/"),
            self.snippet.replace('data-se-lead-id="eon-svj"','data-se-lead-id="eon-solar"'),
            self.snippet.replace('data-se-placement="svj_payback_body"','data-se-placement="foreign"'),
            self.snippet.replace('rel="sponsored nofollow noopener"','rel="noopener"'),
            self.snippet.replace('href="'+url+'"','href="http://www.eon.cz/fotovoltaika-pro-svj/"'),
            self.snippet.replace("</p>","<script>alert(1)</script></p>"),
            self.snippet.replace("</p>",'<a href="'+url+'">duplicate</a></p>'),
            self.snippet.replace("<strong>","<strong onclick='bad()'>"),
        ):
            with self.subTest(bad=bad[:55]),self.assertRaises(e.Blocked):
                e.validate_append_snippet(bad,m)
        for changed in (
            {**m,"post_id":341},
            {**m,"slug":"navratnost-jineho-bytoveho-domu"},
            {**m,"lead_id":"eon-solar"},
            {**m,"link_target":"https://www.eon.cz/domacnosti/usporne-technologie/solar/"},
        ):
            with self.assertRaises(e.Blocked):
                e.validate_manifest(changed)

    def test_existing_html_is_preserved_and_no_duplicate(self):
        original="<p>"+("Existující dobře aktualizovaný EDC a NZÚ průvodce 2026. "*45)+"</p>"
        next_body=e.append_candidate(original,self.snippet,self.manifest)
        self.assertTrue(next_body.startswith(original))
        self.assertEqual(next_body.count('href="'+e.SVJ_EON_URL+'"'),1)
        self.assertEqual(e.append_candidate(next_body,self.snippet,self.manifest),next_body)
        with self.assertRaises(e.Blocked):
            e.append_candidate(original+'<a href="'+e.SVJ_EON_URL+'">Already</a>',
                               self.snippet,self.manifest)


if __name__=="__main__":
    unittest.main()
