"""No-network, no-merchant proof of source-locked Alpine native-init WP snippet."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import solar_catalog_single_init_release as m

class SingleInitReleaseContract(unittest.TestCase):
    def setUp(self):
        self.active=False
        self.created=False
        self.posts=[]
        self.corrupt_page=False
        m.SNIPPET_ID=None
        m.POST_ATTEMPTS=0

    def public(self,path):
        targets={
          '/':'solarExpertBuilder()',
          '/solarni-sestava-na-chatu/':'solarExpertBuilder()',
          '/vyber-baterii/':'solarExpertBatterySelector()',
          '/mppt-kalkulacka/':'solarExpertMPPTSelector()',
          '/vyber-menice/':'solarExpertInverterSelector()'}
        self.assertIn(path,targets)
        root=targets[path]
        if self.corrupt_page and path=='/mppt-kalkulacka/':
            root='unreviewedAlpineWidget()'
        return ('<html><div x-data="'+root+'" x-init="init()"></div>'
                '<script src="/alpine-js"></script>'+
                (m.JS if self.active else '')+'</html>')

    def wp(self,method,path,user,password,body=None):
        self.assertEqual((user,password),('owner','application-password'))
        if method=='GET' and path==m.PLUGINS:
            return (200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}])
        if method=='GET' and path==m.SNIPPETS:
            return (200,[{'name':m.NAME,'active':self.active}] if self.created else [])
        if method=='POST' and path=='/code-snippets/v1/snippets':
            self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,
                                   'scope':'global','active':False,'desc':m.DESC})
            self.assertFalse(self.created)
            self.created=True
            m.POST_ATTEMPTS+=1
            self.posts.append('inactive-create')
            return (201,{'id':5911})
        if method=='GET' and path=='/code-snippets/v1/snippets/5911':
            self.assertTrue(self.created)
            return (200,{'id':5911,'name':m.NAME,'code':m.PHP_CODE,
                         'scope':'global','active':self.active})
        if method=='POST' and path=='/code-snippets/v1/snippets/5911/activate':
            self.assertIsNone(body)
            self.assertFalse(self.active)
            m.POST_ATTEMPTS+=1
            self.active=True
            self.posts.append('activate')
            return (200,{})
        self.fail('Unexpected WordPress REST call '+method+' '+path)

    def control(self,tmp,enabled):
        target=Path(tmp)/'control.json'
        target.write_text(json.dumps({'schema_version':1,'enabled':enabled,
            'revision':1,'mode':m.MODE,'source_blob_sha1':m.SOURCE_BLOB}),
            encoding='utf-8')
        return target

    def test_source_only_affects_alpine_init_and_exact_five_routes(self):
        self.assertEqual(m.SOURCE_BLOB,m.BLOB)
        self.assertIn("wp_add_inline_script('alpine', $js, 'before')",m.PHP_CODE)
        self.assertIn("wp_script_is('alpine','enqueued')",m.PHP_CODE)
        for route in ('solarni-sestava-na-chatu','vyber-baterii',
                      'mppt-kalkulacka','vyber-menice'):
            self.assertIn("is_page('"+route+"')",m.PHP_CODE)
        for factory in ('solarExpertBuilder()','solarExpertBatterySelector()',
                        'solarExpertMPPTSelector()','solarExpertInverterSelector()'):
            self.assertIn(factory,m.JS)
        self.assertIn("el.removeAttribute('x-init')",m.JS)
        self.assertNotIn('fetch(',m.JS)
        self.assertNotIn('affiliate_click',m.JS)
        self.assertNotIn('localStorage',m.JS)
        self.assertNotIn('XMLHttpRequest',m.JS)
        self.assertNotIn('gtag(',m.JS)

    def test_control_disarmed_never_reads_or_writes_wp(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(m,'CONTROL',self.control(d,False)):
                with self.assertRaises(m.Blocked):
                    m.execute('owner','application-password')
        self.assertEqual(self.posts,[])
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_create_inactive_then_only_exact_activation(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(m,'CONTROL',self.control(d,True)),\
                 patch.object(m,'RECEIPT',Path(d)/'receipt.json'),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                m.execute('owner','application-password')
                report=json.loads(m.RECEIPT.read_text())
        self.assertEqual(report['status'],'wp_verified')
        self.assertEqual(report['post_attempts'],2)
        self.assertEqual(report['native_post_writes'],0)
        self.assertEqual(report['catalog_writes'],0)
        self.assertEqual(report['affiliate_clicks'],0)
        self.assertFalse(report['theme_deployed'])
        self.assertEqual(self.posts,['inactive-create','activate'])

    def test_duplicate_fails_closed_before_any_wp_post(self):
        self.created=True
        with tempfile.TemporaryDirectory() as d:
            with patch.object(m,'CONTROL',self.control(d,True)),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                with self.assertRaisesRegex(m.Blocked,'Existing catalog single-init'):
                    m.execute('owner','application-password')
        self.assertEqual(self.posts,[])
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_unknown_or_changed_tool_markup_blocks_release(self):
        self.corrupt_page=True
        with patch.object(m,'public',side_effect=self.public):
            with self.assertRaises(m.Blocked):
                m.check_public(False)
        self.assertEqual(m.POST_ATTEMPTS,0)

if __name__=='__main__':
    unittest.main()
