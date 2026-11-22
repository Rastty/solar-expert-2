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

    def test_svj_public_html_route_without_false_affiliate_attribution(self):
        html=(
            '<html><head><script>var SolarExpertConfig = '
            +json.dumps({'affiliateBases':{'eon-cz':E_HUB}})+'</script></head><body>'
            '<a href="/kolik-stoji-fotovoltaika/">Srovnat nabídku domu</a>'
            '<a href="https://solar-expert.cz/kolik-stoji-fotovoltaika/">Cena FVE</a>'
            '<a href="https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/">Poptat SVJ</a>'
            '<a href="https://www.eon.cz.evil.test/domacnosti/usporne-technologie/fotovoltaika-pro-svj/">Unsafe</a>'
            '</body></html>'
        )
        d=m.svj_summarize(html)
        self.assertEqual(d['grid_fve_links'],2)
        self.assertEqual(d['exact_eon_svj_links'],1)
        self.assertEqual(d['svj_lead_markup_count'],0)
        self.assertTrue(d['eon_network_config_present'])
        self.assertEqual(d['svj_affiliate_route_status'],
                         'generic_base_candidate_requires_runtime')
        self.assertEqual(d['program_accepts_svj_lead'],'unknown')
        self.assertEqual(d['attributed_affiliate_clicks'],'unknown')
        self.assertEqual(d['paid_commissions'],'unknown')
        self.assertEqual(d['external_link_visits'],0)
        self.assertNotIn('sample',json.dumps(d))

    def test_svj_never_conflates_seller_homepage_or_other_program_with_svj(self):
        html=('<a href="/kolik-stoji-fotovoltaika/?utm_source=test">Query not canonical</a>'
              '<a href="https://www.eon.cz/domacnosti/usporne-technologie/solar/">Residential</a>'
              '<a href="https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/" '
              'data-se-lead-id="eon-svj" '
              'data-se-fallback="https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/">SVJ</a>')
        d=m.svj_summarize(html)
        self.assertEqual(d['grid_fve_links'],0)
        self.assertEqual(d['exact_eon_svj_links'],1)
        self.assertEqual(d['svj_lead_markup_count'],1)
        self.assertFalse(d['eon_network_config_present'])

    def test_svj_exact_ehub_destination_requires_exact_seller_and_campaign(self):
        exact=E_HUB+'&desturl='+__import__('urllib.parse',fromlist=['quote']).quote(
            m.SVJ_MERCHANT_URL,safe='')
        self.assertTrue(m.valid_ehub(E_HUB))
        self.assertFalse(m.svj_exact_ehub_destination(E_HUB))
        self.assertTrue(m.svj_exact_ehub_destination(exact))
        self.assertEqual(m.svj_route_config_status(exact,None),
                         'exact_svj_destination_candidate')
        self.assertEqual(m.svj_route_config_status(None,E_HUB),
                         'generic_base_candidate_requires_runtime')
        self.assertEqual(m.svj_route_config_status(None,None),
                         'no_qualified_svj_affiliate_config')
        for invalid in (
            E_HUB,
            exact.replace('fotovoltaika-pro-svj','tepelne-cerpadlo'),
            exact+'&desturl=https%3A%2F%2Fevil.example%2F',
            exact.replace('https://ehub.cz/','http://ehub.cz/'),
            exact.replace('ehub.cz/','ehub.cz.evil.example/'),
            E_HUB+'&desturl='+m.SVJ_MERCHANT_URL+'&a_bid=duplicate',
            'https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/',
        ):
            with self.subTest(invalid=invalid[:70]):
                self.assertFalse(m.svj_exact_ehub_destination(invalid))
                self.assertEqual(m.svj_route_config_status(invalid,E_HUB),
                                 'unsafe_or_unqualified_exact_override')
        self.assertFalse(m.valid_ehub(E_HUB.replace('https://','http://')))
        self.assertFalse(m.valid_ehub(E_HUB+'&a_aid=second'))
        self.assertFalse(m.valid_ehub(E_HUB+'#fragment'))

    def test_svj_status_never_confuses_generic_ehub_base_with_true_svj_destination(self):
        exact=E_HUB+'&desturl='+__import__('urllib.parse',fromlist=['quote']).quote(
            m.SVJ_MERCHANT_URL,safe='')
        generic='<script>var SolarExpertConfig = '+json.dumps(
            {'affiliateBases':{'eon-cz':E_HUB}})+'</script>'
        d=m.svj_summarize(generic)
        self.assertEqual(d['svj_affiliate_route_status'],
                         'generic_base_candidate_requires_runtime')
        self.assertFalse(d['exact_svj_destination_candidate'])
        self.assertFalse(d['verified_affiliate_navigation'])
        exact_html='<script>var SolarExpertConfig = '+json.dumps(
            {'affiliateMap':{'leads':{'eon-svj':exact}},'affiliateBases':{'eon-cz':E_HUB}})+'</script>'
        e=m.svj_summarize(exact_html)
        self.assertEqual(e['svj_affiliate_route_status'],'exact_svj_destination_candidate')
        self.assertTrue(e['exact_svj_destination_candidate'])
        self.assertFalse(e['verified_affiliate_navigation'])
        self.assertEqual(e['program_accepts_svj_lead'],'unknown')
        self.assertEqual(e['paid_commissions'],'unknown')
        self.assertNotIn('sample',json.dumps(e))
        self.assertNotIn('campaign',json.dumps(e))

    def test_missing_runtime_flags_uncertainty(self):
        data=m.summarize('<html><script>var SolarExpertConfig = {};</script></html>')
        self.assertEqual(data['page']['target_eon_links'],0)
        self.assertFalse(data['page']['lead_runtime_scripts_present'])
        self.assertFalse(data['affiliate_configuration']['potential_trackable_route'])

if __name__=='__main__':
    unittest.main()
