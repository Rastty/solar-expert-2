import unittest
from scripts.solar_gsc_direct_rest_preflight import ALLOW_PATHS, summarize, SITE


class DirectGscRestAuditTest(unittest.TestCase):
    def test_available_settings_and_capabilities_are_keys_only(self):
        probes = {
            ALLOW_PATHS[0]: (200, {"routes": {
                "/wp/v2/settings": {"endpoints": ["SECRET"]},
                "/wpcode/v1/snippets": {"description": "SECRET"},
            }}),
            ALLOW_PATHS[1]: (200, {"name": "PRIVATE NAME", "capabilities": {
                "manage_options": True, "install_plugins": False,
                "edit_theme_options": True,
            }}),
            ALLOW_PATHS[2]: (200, {"wpseo_google_verify": "PRIVATE TOKEN",
                                      "blogname": "PRIVATE BLOG"}),
            ALLOW_PATHS[3]: (200, [{"plugin":"wordpress-seo/wp-seo.php",
                                       "description": "SECRET"}]),
            ALLOW_PATHS[4]: (200, [{"name":"yoast-seo/update-site-representation",
                                       "description":"SECRET"}]),
        }
        v = summarize(probes)
        self.assertTrue(v["authenticated_user_checked"])
        self.assertTrue(v["can_manage_options"])
        self.assertTrue(v["proof_of_writable_gsc_verification_field"])
        self.assertIn("wpseo_google_verify", v["registered_site_option_keys"])
        self.assertIn("/wpcode/v1/snippets", v["site_specific_route_hints"])
        self.assertIn("wordpress-seo", v["installed_extension_hints"])
        self.assertEqual(v["word_press_writes"], 0)
        self.assertEqual(v["wpvibe_calls"], 0)
        for forbidden in ("PRIVATE NAME", "PRIVATE TOKEN", "PRIVATE BLOG", "SECRET"):
            self.assertNotIn(forbidden, str(v))

    def test_denied_auth_never_assumes_any_writer(self):
        v = summarize({p: (403, None) for p in ALLOW_PATHS})
        self.assertFalse(v["authenticated_user_checked"])
        self.assertFalse(v["proof_of_writable_gsc_verification_field"])
        self.assertIsNone(v["can_manage_options"])
        self.assertEqual(v["registered_site_option_keys"], [])
        self.assertEqual(v["word_press_writes"], 0)

    def test_yoast_read_only_abilities_are_not_sufficient(self):
        probes={p:(404,None) for p in ALLOW_PATHS}
        probes[ALLOW_PATHS[4]]=(200,[{"name":"yoast-seo/update-post-seo-data"}])
        v=summarize(probes)
        self.assertFalse(v["proof_of_writable_gsc_verification_field"])
        self.assertFalse(v["gsc_tag_inserted"])


if __name__ == "__main__":
    unittest.main()
