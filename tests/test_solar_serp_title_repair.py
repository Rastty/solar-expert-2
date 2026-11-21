"""One in-place Code Snippets PUT: PHP scope, exact baseline and never-retry guards."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from scripts import solar_serp_boundary_title_repair as r
from scripts import solar_serp_boundary_release as s

class TestTitleRepair(unittest.TestCase):
    def setUp(self):
        r.WRITE_ATTEMPTS=0
        r.SNIPPET_ID=None

    def test_patch_exactly_preserves_original_snippet(self):
        self.assertTrue(r.CODE.startswith(s.PHP_CODE))
        self.assertEqual(r.CODE.count("add_filter('wpseo_metadesc'"),1)
        self.assertEqual(r.CODE.count("add_filter('wpseo_title'"),1)
        self.assertEqual(r.CODE.count("add_filter('pre_get_document_title'"),1)
        self.assertIn(s.TITLE,r.PATCH)
        for bad in ('wp_update_post(', 'wp_insert_post(', 'update_option(', 'wp_remote_post(', 'eval('):
            self.assertNotIn(bad,r.CODE)

    def test_php_real_execution_untargeted_title_unchanged(self):
        if not shutil.which('php'):
            self.skipTest('PHP unavailable')
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            (root/'patch.php').write_text('<?php\n'+r.CODE,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(root/'patch.php')],capture_output=True,text=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
            (root/'run.php').write_text("""<?php
$callbacks=[];$slug='other';$type='post';$admin=false;
function add_filter($name,$fn,$priority){global $callbacks;$callbacks[$name]=$fn;}
function is_admin(){global $admin;return $admin;}
function is_singular($allowed){global $type;return in_array($type,$allowed,true);}
function get_queried_object_id(){return 8;}
function get_post_field($key,$id){global $slug;return $slug;}
require __DIR__.'/patch.php';
$out=[];foreach(['other','umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda'] as $slug){
  foreach(['post','page','attachment'] as $type){
    $out[$slug][$type]=[
      $callbacks['pre_get_document_title']('original title'),
      $callbacks['wpseo_title']('other title'),
      $callbacks['wpseo_metadesc']('other description')];
  }
}
$slug='umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda';$type='post';$admin=true;
$out['admin']=$callbacks['pre_get_document_title']('original title');
echo json_encode($out,JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
            run=subprocess.run(['php',str(root/'run.php')],capture_output=True,text=True,timeout=10)
            self.assertEqual(run.returncode,0,run.stderr)
            out=json.loads(run.stdout)
            for kind in ('post','page','attachment'):
                self.assertEqual(out['other'][kind],['original title','other title','other description'])
            self.assertEqual(out[s.SLUG]['attachment'],['original title','other title','other description'])
            for kind in ('post','page'):
                self.assertEqual(out[s.SLUG][kind],[s.TITLE,s.TITLE,s.DESC])
            self.assertEqual(out['admin'],'original title')

    def test_strict_rest_no_post_and_wrong_put(self):
        for method,path,payload in [
            ('POST','/code-snippets/v1/snippets',{'name':s.NAME}),
            ('PUT','/code-snippets/v1/snippets/27',{'code':'danger'}),
            ('DELETE','/code-snippets/v1/snippets/27',None),
            ('PUT','/wp/v2/posts/200',{'title':'danger'})]:
            with self.assertRaises(r.Blocked):
                r.rest(method,path,'u','p',payload)
        self.assertEqual(r.WRITE_ATTEMPTS,0)

    def test_mock_single_existing_snippet_is_repaired_in_place(self):
        store={'code':s.PHP_CODE,'active':True};calls=[]
        r.SNIPPET_ID=None
        def fake_rest(method,path,user,password,payload=None):
            calls.append((method,path,payload))
            if path==s.PLUGINS:
                return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'},
                            {'plugin':'wordpress-seo/wp-seo.php','status':'active'}]
            if path==s.LIST:
                return 200,[{'id':91,'name':s.NAME,'code':store['code'],'active':store['active'],'scope':'global'}]
            if path=='/code-snippets/v1/snippets/91' and method=='GET':
                return 200,{'id':91,'name':s.NAME,'code':store['code'],'scope':'global','active':store['active']}
            if path=='/code-snippets/v1/snippets/91' and method=='PUT':
                self.assertEqual(payload['code'],r.CODE)
                store['code']=payload['code']
                return 200,{}
            raise AssertionError((method,path))
        def fake_head():
            return {'titles':[s.TITLE if store['code']==r.CODE else r.OLD_TITLE],
                    'descriptions':[s.DESC],'canonicals':[s.TARGET], 'robots':[]}
        control=json.dumps({'schema_version':1,'enabled':True,'revision':2,
                            'mode':'one_inplace_active_serp_title_repair'})
        with patch.object(r,'rest',side_effect=fake_rest), patch.object(s,'public_head',side_effect=fake_head), \
             patch.object(r,'receipt') as receipt,patch.object(r,'CONTROL') as configuration:
            configuration.read_text.return_value=control
            r.execute('u','p')
        puts=[x for x in calls if x[0]=='PUT']
        self.assertEqual(len(puts),1)
        self.assertEqual(puts[0][1],'/code-snippets/v1/snippets/91')
        self.assertEqual(receipt.call_args.args[0],'wp_verified')
        self.assertTrue(store['active'])

    def test_changed_source_or_missing_active_state_blocks_before_write(self):
        baseline={'titles':[r.OLD_TITLE],'descriptions':[s.DESC],
                  'canonicals':[s.TARGET],'robots':[]}
        def fake_rest(method,path,user,password,payload=None):
            if path==s.PLUGINS:return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'},
                                            {'plugin':'wordpress-seo/wp-seo.php','status':'active'}]
            if path==s.LIST:return 200,[{'id':91,'name':s.NAME,'code':'OTHER','active':True,'scope':'global'}]
            self.fail('Unexpected REST request')
        with patch.object(r,'rest',side_effect=fake_rest),patch.object(s,'public_head',return_value=baseline):
            with self.assertRaises(r.Blocked):
                r.preflight('u','p')
        self.assertIsNone(r.SNIPPET_ID)
        self.assertEqual(r.WRITE_ATTEMPTS,0)

if __name__=='__main__':
    unittest.main()
