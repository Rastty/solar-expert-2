import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_kwp_cabin_balance_release as m
class Contract(unittest.TestCase):
    def setUp(self):
        m.SNIPPET_ID=None;m.POST_ATTEMPTS=0
        self.created=False;self.active=False;self.writes=[]
    def rest(self,method,path,u,p,body=None):
        if method=='GET' and path==m.PLUGINS:return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
        if method=='GET' and path==m.SNIPPETS:return 200,[{'name':m.NAME}] if self.created else []
        if method=='GET' and path=='/code-snippets/v1/snippets/42':return 200,{'id':42,'name':m.NAME,'scope':'global','active':self.active,'code':m.PHP_CODE}
        if method=='POST' and path=='/code-snippets/v1/snippets':
            self.assertFalse(self.created);self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,'scope':'global','active':False,'desc':m.DESC})
            self.created=True;self.writes.append('create');m.POST_ATTEMPTS+=1;return 201,{'id':42}
        if method=='POST' and path=='/code-snippets/v1/snippets/42/activate':
            self.assertTrue(self.created);self.assertFalse(self.active);self.active=True;self.writes.append('activate');m.POST_ATTEMPTS+=1;return 200,{}
        self.fail('unexpected REST operation')
    def execute(self,enabled):
        with tempfile.TemporaryDirectory() as d:
            control=Path(d)/'control.json'
            control.write_text(json.dumps({'schema_version':1,'enabled':enabled,'revision':1,'mode':m.MODE,'source_blob_sha1':m.SOURCE_BLOB}))
            with patch.object(m,'CONTROL',control),patch.object(m,'RECEIPT',Path(d)/'receipt.json'),patch.object(m,'wp',side_effect=self.rest),patch.object(m,'check_public'):
                m.execute('u','p');return json.loads(m.RECEIPT.read_text())
    def test_exact_create_activate_and_no_replay(self):
        self.assertEqual(self.execute(True)['status'],'wp_verified')
        with self.assertRaises(m.Blocked):self.execute(True)
        self.assertEqual(self.writes,['create','activate'])
    def test_disarmed(self):
        with self.assertRaises(m.Blocked):self.execute(False)
        self.assertEqual(self.writes,[])
    def test_source_has_no_new_lead(self):
        self.assertEqual(m.BLOB,m.SOURCE_BLOB)
        self.assertNotIn('eon.cz',m.PHP_CODE)
        self.assertNotIn('wpseo_',m.PHP_CODE)
if __name__=='__main__':unittest.main()
