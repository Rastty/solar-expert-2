import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_candidate_offer_measurement as m
class Contract(unittest.TestCase):
    def setUp(self):
        m.PUTS=0
        self.code=m.old.PHP_CODE
    def api(self,method,path,u,p,body=None):
        if method=='GET' and path==m.old.SNIPPETS:return 200,[{'id':17,'name':m.old.NAME}]
        if method=='GET' and path==m.PATH:return 200,{'id':17,'name':m.old.NAME,'active':True,'scope':'global','code':self.code}
        if method=='PUT' and path==m.PATH:
            self.assertEqual(body,m.PAYLOAD)
            self.assertEqual(self.code,m.old.PHP_CODE)
            self.code=body['code']
            m.PUTS+=1
            return 200,{}
        self.fail('unexpected REST operation')
    def execute(self,enabled):
        with tempfile.TemporaryDirectory() as d:
            control=Path(d)/'control.json'
            control.write_text(json.dumps({'schema_version':1,'enabled':enabled,'revision':1,'mode':m.MODE,'source_blob_sha1':m.BLOB}))
            with patch.object(m,'CONTROL',control),patch.object(m,'RECEIPT',Path(d)/'receipt.json'),patch.object(m,'api',side_effect=self.api),patch.object(m,'public'):
                m.execute('u','p')
                return json.loads(m.RECEIPT.read_text())
    def test_one_put_no_replay(self):
        self.assertEqual(self.execute(True)['status'],'wp_verified')
        with self.assertRaises(m.Blocked):self.execute(True)
        self.assertEqual(m.PUTS,1)
    def test_disarmed(self):
        with self.assertRaises(m.Blocked):self.execute(False)
        self.assertEqual(m.PUTS,0)
    def test_scope_and_existing_analytics(self):
        self.assertIn("is_page('vyber-baterii')",m.CODE)
        self.assertIn("event.isTrusted",m.JS)
        self.assertIn("analytics.track('affiliate_click'",m.JS)
        self.assertNotIn('fetch(',m.JS)
        self.assertNotIn('localStorage',m.JS)
if __name__=='__main__':unittest.main()
