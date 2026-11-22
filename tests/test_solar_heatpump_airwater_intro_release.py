"""No-network source-locked article intro lead contract; never fake merchant clicks."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_heatpump_airwater_intro_release as m

class HeatpumpIntroContract(unittest.TestCase):
    def setUp(self):
        self.active=False
        self.created=False
        self.calls=[]
        m.SNIPPET_ID=None
        m.POST_ATTEMPTS=0

    def public(self,path):
        merchant='https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/'
        if path=='/':
            return '<html><h1>Solar Expert</h1></html>'
        if path=='/recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady/':
            return '<html><h1>Samsung tepelné čerpadlo recenze</h1><a href="'+merchant+'">Srovnat</a></html>'
        self.assertEqual(path,
            '/tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji/')
        base=('<html><h1>Tepelné čerpadlo vzduch–voda</h1>'
              '<p>Úvod</p><h2>Technika</h2>'
              '<a href="'+merchant+'">Nezávazně poptat</a>'
              '<script src="/affiliate-adapter.js"></script>'
              '<script src="/lead-cta.js"></script></html>')
        if self.active:
            base=base.replace('<h2>Technika</h2>',
                '<aside data-se-heatpump-intro-offer="v1">'
                '<a data-se-placement="heatpump_airwater_intro"></a>'
                'Partnerský odkaz může Solar Expertu přinést provizi'
                '</aside><h2>Technika</h2>')
        return base

    def wp(self,method,path,user,password,body=None):
        self.assertEqual((user,password),('operator','app-password'))
        if method=='GET' and path==m.PLUGINS:
            return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
        if method=='GET' and path==m.SNIPPETS:
            return 200,([{'name':m.NAME}] if self.created else [])
        if method=='POST' and path=='/code-snippets/v1/snippets':
            self.assertFalse(self.created)
            self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,
                                   'scope':'global','active':False,'desc':m.DESC})
            self.created=True
            m.POST_ATTEMPTS+=1
            self.calls.append('inactive-create')
            return 201,{'id':1083}
        if method=='GET' and path=='/code-snippets/v1/snippets/1083':
            return 200,{'id':1083,'name':m.NAME,'code':m.PHP_CODE,
                        'scope':'global','active':self.active}
        if method=='POST' and path=='/code-snippets/v1/snippets/1083/activate':
            self.assertIsNone(body)
            self.assertFalse(self.active)
            self.active=True
            self.calls.append('activate')
            m.POST_ATTEMPTS+=1
            return 200,{}
        self.fail('Unexpected REST request '+method+' '+path)

    def control(self,dir,enabled):
        p=Path(dir)/'control.json'
        p.write_text(json.dumps({'schema_version':1,'enabled':enabled,
            'revision':1,'mode':m.MODE,'source_blob_sha1':m.SOURCE_BLOB}),
            encoding='utf-8')
        return p

    def test_scoped_draft_and_clear_attribution(self):
        self.assertEqual(m.BLOB,m.SOURCE_BLOB)
        self.assertIn("is_singular('post')",m.PHP_CODE)
        self.assertIn('in_the_loop()',m.PHP_CODE)
        self.assertIn('is_main_query()',m.PHP_CODE)
        self.assertIn("post_name !== 'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji'",m.PHP_CODE)
        self.assertIn("data-se-placement=\"heatpump_airwater_intro\"",m.PHP_CODE)
        self.assertIn('rel="sponsored nofollow noopener"',m.PHP_CODE)
        self.assertIn('data-se-lead-id="eon-heat-pump"',m.PHP_CODE)
        self.assertIn('Partnerský odkaz může Solar Expertu přinést provizi',m.PHP_CODE)
        self.assertNotIn('wp_update_post(',m.PHP_CODE)
        self.assertNotIn('wp_remote_post(',m.PHP_CODE)
        self.assertNotIn('add_action(',m.PHP_CODE)

    def test_disarmed_never_contacts_wp(self):
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'CONTROL',self.control(t,False)):
                with self.assertRaises(m.Blocked):
                    m.execute('operator','app-password')
        self.assertEqual(self.calls,[])
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_unique_eligible_article_creates_then_activates_one_snippet(self):
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'CONTROL',self.control(t,True)),\
                 patch.object(m,'RECEIPT',Path(t)/'receipt.json'),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                m.execute('operator','app-password')
                result=json.loads(m.RECEIPT.read_text())
        self.assertEqual(result['status'],'wp_verified')
        self.assertEqual(result['post_attempts'],2)
        self.assertEqual(result['native_post_writes'],0)
        self.assertFalse(result['theme_deployed'])
        self.assertEqual(self.calls,['inactive-create','activate'])

    def test_duplicate_fails_before_any_write(self):
        self.created=True
        with tempfile.TemporaryDirectory() as t:
            with patch.object(m,'CONTROL',self.control(t,True)),\
                 patch.object(m,'public',side_effect=self.public),\
                 patch.object(m,'wp',side_effect=self.wp):
                with self.assertRaisesRegex(m.Blocked,'Existing heat-pump intro'):
                    m.execute('operator','app-password')
        self.assertEqual(self.calls,[])

    def test_unexpected_existing_intro_fails_closed(self):
        self.active=True
        with patch.object(m,'public',side_effect=self.public):
            with self.assertRaisesRegex(m.Blocked,'already exists'):
                m.check_public(False)
        self.assertEqual(m.POST_ATTEMPTS,0)

if __name__=='__main__':
    unittest.main()
