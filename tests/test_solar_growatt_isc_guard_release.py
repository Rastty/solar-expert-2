"""Offline source-CAS/no-retry WP Code Snippet for exact Growatt PV Isc gate."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_growatt_isc_guard_release as m

class GrowattLiveIscGuardRelease(unittest.TestCase):
    def setUp(self):
        self.active=False
        self.created=False
        self.post_actions=[]
        m.SNIPPET_ID=None
        m.POST_ATTEMPTS=0

    def public(self,path):
        self.assertIn(path,('/','/solarni-sestava-na-chatu/','/vyber-baterii/'))
        if path=='/vyber-baterii/':return '<html>Battery Selector independent</html>'
        html='<html><div x-data="solarExpertBuilder()"></div><script id="solar-expert-bundles-js" src="/assets/js/bundle-composer.js"></script></html>'
        return html+(m.JS if self.active else '')

    def wp(self,method,path,user,password,body=None):
        self.assertEqual((user,password),('operator','app-password'))
        if method=='GET' and path==m.PLUGINS:
            return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
        if method=='GET' and path==m.SNIPPETS:
            return 200,[{'name':m.NAME,'code':m.PHP_CODE,'active':self.active}] if self.created else []
        if method=='POST' and path=='/code-snippets/v1/snippets':
            self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,'scope':'global',
                                   'active':False,'desc':m.DESC})
            self.assertFalse(self.created)
            self.created=True
            m.POST_ATTEMPTS+=1
            self.post_actions.append('create-inactive')
            return 201,{'id':173}
        if method=='GET' and path=='/code-snippets/v1/snippets/173':
            return 200,{'id':173,'name':m.NAME,'scope':'global',
                        'active':self.active,'code':m.PHP_CODE}
        if method=='POST' and path=='/code-snippets/v1/snippets/173/activate':
            self.assertIsNone(body)
            self.assertFalse(self.active)
            m.POST_ATTEMPTS+=1
            self.active=True
            self.post_actions.append('activate')
            return 200,{}
        self.fail('Unapproved WordPress method/path: '+method+' '+path)

    def control(self,tmp,enabled):
        file=Path(tmp)/'control.json'
        file.write_text(json.dumps({'schema_version':1,'enabled':enabled,
          'revision':1,'mode':m.MODE,'source_blob_sha1':m.SOURCE_BLOB}),encoding='utf-8')
        return file

    def test_source_scope_and_no_fake_affiliate_or_current_rating(self):
        self.assertEqual(m.BLOB,m.SOURCE_BLOB)
        self.assertIn("wp_add_inline_script('solar-expert-bundles', $js, 'after')",m.PHP_CODE)
        self.assertIn("wp_script_is('solar-expert-bundles', 'enqueued')",m.PHP_CODE)
        self.assertIn("is_front_page()",m.PHP_CODE)
        self.assertIn("is_page('solarni-sestava-na-chatu')",m.PHP_CODE)
        self.assertIn("'inverter-growatt-48-3500':true",m.JS)
        self.assertIn("'inverter-growatt-48-6000':true",m.JS)
        self.assertIn('bundle.complete=false',m.JS)
        self.assertIn("bundle.status='pv_isc_limit_unverified'",m.JS)
        self.assertNotIn('fetch(',m.JS)
        self.assertNotIn('gtag(',m.JS)
        self.assertNotIn('navigator.sendBeacon',m.JS)
        self.assertNotIn('XMLHttpRequest',m.JS)
        self.assertNotIn('trackOffer(',m.JS)
        self.assertNotIn('window.dataLayer',m.JS)
        self.assertNotIn('wp_update_post(',m.PHP_CODE)

    def test_disarmed_gate_zero_wordpress_calls(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,False)):
                with self.assertRaises(m.Blocked):
                    m.execute('operator','app-password')
        self.assertEqual(m.POST_ATTEMPTS,0)
        self.assertEqual(self.post_actions,[])

    def test_single_inactive_create_then_exact_active_readback(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,True)),\
                 patch.object(m,'RECEIPT',Path(tmp)/'receipt.json'),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                m.execute('operator','app-password')
                receipt=json.loads(m.RECEIPT.read_text())
        self.assertEqual(receipt['status'],'wp_verified')
        self.assertEqual(receipt['post_attempts'],2)
        self.assertEqual(receipt['native_post_writes'],0)
        self.assertEqual(receipt['affiliate_clicks'],0)
        self.assertFalse(receipt['theme_deployed'])
        self.assertEqual(self.post_actions,['create-inactive','activate'])

    def test_existing_duplicate_fails_before_any_write(self):
        self.created=True
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,True)),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                with self.assertRaisesRegex(m.Blocked,'Existing Growatt'):
                    m.execute('operator','app-password')
        self.assertEqual(self.post_actions,[])
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_site_without_expected_bundle_script_is_not_eligible(self):
        with patch.object(m,'public',side_effect=lambda p:'<html></html>'):
            with self.assertRaises(m.Blocked):
                m.check_public(False)

if __name__=='__main__':unittest.main()
