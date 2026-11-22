"""Offline proof of a reversible source-pinned Builder fast result Code Snippet."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_builder_fast_result_release as m

class BuilderFastResultReleaseContract(unittest.TestCase):
    def setUp(self):
        self.active=False
        self.created=False
        self.posts=[]
        m.SNIPPET_ID=None
        m.POST_ATTEMPTS=0

    def public(self,path):
        self.assertIn(path,('/','/solarni-sestava-na-chatu/','/vyber-baterii/'))
        if path=='/vyber-baterii/':return '<html>Battery Selector unchanged</html>'
        html=('<html><div id="builder" x-data="solarExpertBuilder()">'
              '<button @click="advanceToUsage()">Pokračovat →</button>'
              '<script src="/solar-expert-builder.js"></script></div></html>')
        return html+(m.JS if self.active else '')

    def wp(self,method,path,user,password,body=None):
        self.assertEqual((user,password),('operator','app-password'))
        self.assertIn(method,('GET','POST'))
        if method=='GET' and path==m.PLUGINS:
            return (200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}])
        if method=='GET' and path==m.SNIPPETS:
            return (200,[{'name':m.NAME,'active':self.active}] if self.created else [])
        if method=='POST' and path=='/code-snippets/v1/snippets':
            self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,'scope':'global',
                                    'active':False,'desc':m.DESC})
            self.assertFalse(self.created)
            self.created=True
            m.POST_ATTEMPTS+=1
            self.posts.append('create_inactive')
            return (201,{'id':4812})
        if method=='GET' and path=='/code-snippets/v1/snippets/4812':
            self.assertTrue(self.created)
            return (200,{'id':4812,'name':m.NAME,'code':m.PHP_CODE,
                         'scope':'global','active':self.active})
        if method=='POST' and path=='/code-snippets/v1/snippets/4812/activate':
            self.assertIsNone(body)
            self.assertFalse(self.active)
            m.POST_ATTEMPTS+=1
            self.active=True
            self.posts.append('activate_exact')
            return (200,{})
        self.fail('unexpected WordPress route/method '+method+' '+path)

    def control(self,dir,enabled):
        p=Path(dir)/'control.json'
        p.write_text(json.dumps({'schema_version':1,'enabled':enabled,
            'revision':1,'mode':m.MODE,'source_blob_sha1':m.SOURCE_BLOB}),encoding='utf-8')
        return p

    def test_source_locked_and_scoped_without_electrical_or_affiliate_override(self):
        self.assertEqual(m.BLOB,m.SOURCE_BLOB)
        self.assertIn("is_front_page()",m.PHP_CODE)
        self.assertIn("is_page('solarni-sestava-na-chatu')",m.PHP_CODE)
        self.assertIn("wp_add_inline_script('solar-expert-builder'",m.PHP_CODE)
        self.assertIn('state.calc(false)',m.PHP_CODE)
        self.assertIn('state.validateSelections()',m.PHP_CODE)
        self.assertIn('state.season=',m.PHP_CODE)
        self.assertIn("state.autonomy=1",m.PHP_CODE)
        self.assertNotIn('state.quickPreview(',m.JS)
        self.assertNotIn('affiliate_click',m.JS)
        self.assertNotIn('fetch(',m.JS)
        self.assertNotIn('navigator.sendBeacon',m.JS)

    def test_disabled_control_never_touches_wp(self):
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'CONTROL',self.control(t,False)):
                with self.assertRaises(m.Blocked):
                    m.execute('operator','app-password')
        self.assertEqual(m.POST_ATTEMPTS,0)
        self.assertEqual(self.posts,[])

    def test_exact_inactive_create_then_activate_and_readback(self):
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'CONTROL',self.control(t,True)),\
                 patch.object(m,'RECEIPT',Path(t)/'receipt.json'),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                m.execute('operator','app-password')
                result=json.loads(m.RECEIPT.read_text(encoding='utf-8'))
        self.assertEqual(result['status'],'wp_verified')
        self.assertEqual(result['post_attempts'],2)
        self.assertEqual(result['native_post_writes'],0)
        self.assertEqual(result['affiliate_clicks'],0)
        self.assertFalse(result['theme_deployed'])
        self.assertEqual(self.posts,['create_inactive','activate_exact'])

    def test_existing_duplicate_fails_before_any_post(self):
        self.created=True
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'CONTROL',self.control(t,True)),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                with self.assertRaisesRegex(m.Blocked,'Existing fast result'):
                    m.execute('operator','app-password')
        self.assertEqual(self.posts,[])
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_battery_page_and_absent_before_state_required(self):
        self.active=True
        with patch.object(m,'public',side_effect=self.public):
            with self.assertRaises(m.Blocked):
                m.check_public(False)
        self.active=False
        with patch.object(m,'public',side_effect=self.public):
            m.check_public(False)

if __name__=='__main__':unittest.main()
