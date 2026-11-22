"""One-PUT source-CAS repair contract for existing active WordPress snippet #14."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_heatpump_airwater_intro_repair as m

class RepairSnippet14(unittest.TestCase):
    def setUp(self):
        m.PUTS=0
        self.code=m.old.PHP_CODE
        self.article_modified=m.WP_MODIFIED
        self.article_id=m.POST_ID
        self.api_calls=[]
        self.public_checks=[]

    def fake_api(self,method,path,user,pwd,body=None):
        self.assertEqual((user,pwd),('owner','app-password'))
        self.api_calls.append((method,path))
        if method=='GET' and path==m.URI:
            return 200,{'id':14,'name':m.old.NAME,
                        'scope':'global','active':True,'code':self.code}
        if method=='GET' and path==m.ARTICLE:
            return 200,[{'id':self.article_id,'slug':m.SLUG,
                         'status':'publish','type':'post',
                         'modified_gmt':self.article_modified,
                         'content':{'raw':'<p>Výběr čerpadla</p><h2>Výkon v mrazu</h2>'}}]
        if method=='PUT' and path==m.URI:
            self.assertEqual(body,{'name':m.old.NAME,'code':m.CODE,
                                  'scope':'global','active':True,
                                  'desc':m.old.DESC})
            self.assertEqual(self.code,m.old.PHP_CODE)
            self.code=m.CODE
            m.PUTS+=1
            return 200,{'id':14}
        self.fail('Forbidden request '+method+' '+path)

    def fake_public(self,after):
        self.public_checks.append(after)
        self.assertEqual(self.code==m.CODE,after)

    def control(self,dir,enabled):
        path=Path(dir)/'intent.json'
        path.write_text(json.dumps({'schema_version':1,'enabled':enabled,
          'revision':1,'mode':m.MODE,'old_source_blob_sha1':m.old.BLOB,
          'new_source_blob_sha1':m.SRC_SHA,'snippet_id':14,'wp_post_id':310,
          'wp_modified_gmt':m.WP_MODIFIED}),encoding='utf-8')
        return path

    def test_source_pinned_exact_existing_snippet(self):
        self.assertEqual(m.BLOB,m.SRC_SHA)
        self.assertEqual(m.old.BLOB,'c15f73fd1dabb14e3c43c37d13f4318015dfd19b')
        self.assertIn('(int)$post->ID !== 310',m.CODE)
        self.assertIn('data-se-placement="heatpump_airwater_intro"',m.CODE)
        self.assertNotIn('if (strpos($content,$merchant)',m.CODE)
        self.assertNotIn('wp_update_post(',m.CODE)

    def test_disabled_control_never_reads_or_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,False)):
                with self.assertRaises(m.Blocked):
                    m.execute('owner','app-password')
        self.assertEqual(self.api_calls,[])
        self.assertEqual(m.PUTS,0)

    def test_one_exact_put_then_readback_public(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,True)),\
                 patch.object(m,'RECEIPT',Path(tmp)/'receipt.json'),\
                 patch.object(m,'api',side_effect=self.fake_api),\
                 patch.object(m.old,'check_public',side_effect=self.fake_public):
                m.execute('owner','app-password')
                receipt=json.loads(m.RECEIPT.read_text())
        self.assertEqual(m.PUTS,1)
        self.assertEqual(receipt['status'],'wp_verified')
        self.assertEqual(receipt['new_snippets'],0)
        self.assertEqual(receipt['native_post_writes'],0)
        self.assertEqual(self.public_checks,[False,True])
        self.assertEqual([x[0] for x in self.api_calls].count('PUT'),1)

    def test_article_cas_drift_fails_before_put(self):
        self.article_modified='2026-11-22T10:00:00'
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,True)),\
                 patch.object(m,'api',side_effect=self.fake_api):
                with self.assertRaisesRegex(m.Blocked,'Exact WP'):
                    m.execute('owner','app-password')
        self.assertEqual(m.PUTS,0)

    def test_source_drift_fails_before_put(self):
        self.code=self.code+'\n/* unreviewed change */'
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(m,'CONTROL',self.control(tmp,True)),\
                 patch.object(m,'api',side_effect=self.fake_api):
                with self.assertRaisesRegex(m.Blocked,'Current exact active'):
                    m.execute('owner','app-password')
        self.assertEqual(m.PUTS,0)

if __name__=='__main__':unittest.main()
