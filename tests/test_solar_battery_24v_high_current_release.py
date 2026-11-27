import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import solar_battery_24v_high_current_release as m

class Contract(unittest.TestCase):
    def setUp(self):
        m.POST_ATTEMPTS=0
        m.SNIPPET_ID=None
        self.created=False
        self.active=False
        self.writes=[]
    def public(self,path):
        root='solarExpertBatterySelector()' if path=='/vyber-baterii/' else 'solarExpertInverterSelector()'
        return '<div x-data="'+root+'"></div>'+ (m.JS if self.active and path=='/vyber-baterii/' else '')
    def rest(self,method,path,user,password,body=None):
        if method=='GET' and path==m.PLUGINS:
            return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
        if method=='GET' and path==m.SNIPPETS:
            return 200,[{'name':m.NAME}] if self.created else []
        if method=='GET' and path=='/code-snippets/v1/snippets/42':
            return 200,{'id':42,'name':m.NAME,'scope':'global','active':self.active,'code':m.PHP_CODE}
        if method=='POST' and path=='/code-snippets/v1/snippets':
            self.assertFalse(self.created)
            self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,'scope':'global','active':False,'desc':m.DESC})
            self.created=True
            self.writes.append('create')
            m.POST_ATTEMPTS+=1
            return 201,{'id':42}
        if method=='POST' and path=='/code-snippets/v1/snippets/42/activate':
            self.assertTrue(self.created)
            self.assertFalse(self.active)
            self.active=True
            self.writes.append('activate')
            m.POST_ATTEMPTS+=1
            return 200,{}
        self.fail('unexpected REST call')
    def execute(self,enabled):
        with tempfile.TemporaryDirectory() as d:
            control=Path(d)/'control.json'
            control.write_text(json.dumps({**{"schema_version":1,"enabled":False,"revision":1,"mode":"one_reversible_battery_24v_high_current","source_blob_sha1":"b9465304cd96563ffb82e033cbda8ad739a14906"},'enabled':enabled}))
            with patch.object(m,'CONTROL',control),patch.object(m,'RECEIPT',Path(d)/'receipt.json'),patch.object(m,'public',side_effect=self.public),patch.object(m,'wp',side_effect=self.rest):
                m.execute('u','p')
                return json.loads(m.RECEIPT.read_text())
    def test_exact_scope_source_and_no_network(self):
        self.assertEqual(m.BLOB,m.SOURCE_BLOB)
        self.assertIn("is_page('vyber-baterii')",m.PHP_CODE)
        self.assertNotIn("is_page('vyber-menice')",m.PHP_CODE)
        self.assertNotIn('fetch(',m.JS)
        self.assertNotIn('location.search',m.JS)
    def test_disarmed(self):
        with self.assertRaises(m.Blocked):self.execute(False)
        self.assertEqual(self.writes,[])
    def test_one_create_activate_and_duplicate_block(self):
        r=self.execute(True)
        self.assertEqual(r['status'],'wp_verified')
        self.assertEqual(self.writes,['create','activate'])
        with self.assertRaises(m.Blocked):self.execute(True)
        self.assertEqual(self.writes,['create','activate'])
if __name__=='__main__':unittest.main()
