"""Proof that E.ON link attribution is inspected without fake outbound clicks."""
import json
import unittest
from scripts import solar_eon_lead_path_readonly as m

FALLBACK='https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/'
E_HUB='https://ehub.cz/system/scripts/click.php?a_aid=sample&a_bid=campaign'
def html_with(cfg):
    return ('<html><head><script>var SolarExpertConfig = '+json.dumps(cfg)+';</script></head>'
            '<body><a href="'+FALLBACK+'" data-se-lead-id="eon-heat-pump" '
            'data-se-fallback="'+FALLBACK+'">poptat</a>'
            '<script src="/wp-content/themes/se/assets/js/affiliate-adapter.js"></script>'
            '<script src="/wp-content/themes/se/assets/js/lead-cta.js"></script></body></html>')

class TestEonLeadReadonly(unittest.TestCase):
    def test_ehub_configured_base_and_exact(self):
        for config in (
            {'affiliateMap':{'leads':{'eon-heat-pump':E_HUB}},'affiliateBases':{}},
            {'affiliateMap':{},'affiliateBases':{'eon-cz':E_HUB}}):
            r=m.summarize(html_with(config))
            self.assertTrue(r['affiliate_configuration']['potential_trackable_route'])
            self.assertEqual(r['page']['target_eon_links'],1)
            self.assertTrue(r['page']['lead_runtime_scripts_present'])
            self.assertTrue(r['page']['fallback_matches_markup'])
            self.assertEqual(r['external_link_visits'],0)
            self.assertEqual(r['wordpress_writes'],0)
            self.assertNotIn('sample',json.dumps(r))
            self.assertNotIn('campaign',json.dumps(r))

    def test_missing_or_direct_mapping_is_not_proven_affiliate(self):
        for config in ({},{'affiliateMap':{'leads':{'eon-heat-pump':FALLBACK}}}):
            r=m.summarize(html_with(config))
            self.assertFalse(r['affiliate_configuration']['potential_trackable_route'])
            self.assertFalse(r['proven_commission'])
            self.assertFalse(r['proven_browser_navigation'])

    def test_nonmerchant_or_malformed_not_qualified(self):
        for candidate in ('#','https://solar-expert.cz/','javascript:alert(1)',
                          'https://ehub.cz/system/scripts/click.php?a_aid=sample',
                          'https://ehub.cz/other?a_aid=x&a_bid=y',
                          'https://ehub.cz/system/scripts/click.php?a_aid=x&a_bid='):
            self.assertFalse(m.valid_ehub(candidate))

    def test_missing_runtime_flags_uncertainty(self):
        data=m.summarize('<html><script>var SolarExpertConfig = {};</script></html>')
        self.assertEqual(data['page']['target_eon_links'],0)
        self.assertFalse(data['page']['lead_runtime_scripts_present'])
        self.assertFalse(data['affiliate_configuration']['potential_trackable_route'])

if __name__=='__main__':
    unittest.main()
