import unittest
from scripts.solar_gsc_verification_check import TOKEN, inspect_html


class GSCMetaTest(unittest.TestCase):
    def test_exact_in_head(self):
        html = '<html><HEAD><META content="' + TOKEN + '" name="google-site-verification" /></HEAD><body></body></html>'
        self.assertEqual(inspect_html(html), {
            "head_present": True, "exact_matching_tags_in_head": 1,
            "total_google_verification_tags_in_head": 1, "verified_on_live_html": True})

    def test_wrong_token(self):
        p = inspect_html('<html><head><meta name="google-site-verification" content="wrong"></head></html>')
        self.assertEqual(p["exact_matching_tags_in_head"], 0)
        self.assertFalse(p["verified_on_live_html"])

    def test_body_only(self):
        p = inspect_html('<html><head></head><body><meta name="google-site-verification" content="' + TOKEN + '"></body></html>')
        self.assertFalse(p["verified_on_live_html"])

    def test_duplicate(self):
        tag = '<meta name="google-site-verification" content="' + TOKEN + '">'
        p = inspect_html("<html><head>" + tag + tag + "</head></html>")
        self.assertEqual(p["exact_matching_tags_in_head"], 2)
        self.assertFalse(p["verified_on_live_html"])

    def test_no_head(self):
        p = inspect_html('<meta name="google-site-verification" content="' + TOKEN + '">')
        self.assertFalse(p["head_present"])
        self.assertFalse(p["verified_on_live_html"])


if __name__ == "__main__":
    unittest.main()
