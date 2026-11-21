"""Real-PHP and one-shot WordPress REST safety for scoped Builder buyer recovery."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_builder_recovery_release as g

HEALTH={'build_marker':'dev-rc-0.12.27','managed_content_items':60,
        'content_sync_status':'current','content_sync_required':False}

class BuilderRecoveryTests(unittest.TestCase):
    def setUp(self):
        g.POST_ATTEMPTS=0
        g.SNIPPET_ID=None

    def test_php_source_keeps_all_technical_rules_and_affiliate_options_unchanged(self):
        src=g.PHP_CODE
        self.assertIn("is_page('solarni-sestava-na-chatu')",src)
        self.assertIn("'solar-expert-builder', 'enqueued'",src)
        self.assertIn("'wp_enqueue_scripts',",src)
        self.assertIn("document.addEventListener('alpine:initialized', wire",src)
        self.assertIn("window.Alpine.effect(function()",src)
        self.assertIn("state.completeBundles.length > 0",src)
        self.assertIn("state.step === 4 && !!state.catalogReady",src)
        self.assertIn("note.hidden = !show",src)
        self.assertIn("Number(result?.voltage) !== 12",src)
        self.assertIn('href="/vyber-baterii/?scenario=panel400"',src)
        for forbidden in ('wp_insert_post(', 'wp_update_post(', 'wp_delete_post(',
                          'update_option(', 'update_post_meta(', 'eval(',
                          'wp_remote_post(', 'trackOffer(', 'SolarExpertConfig.catalogUrl'):
            self.assertNotIn(forbidden,src)

    def test_php_real_runtime_only_scoped_one_page(self):
        if not shutil.which('php'):self.skipTest('No PHP executable')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'release.php').write_text('<?php\n'+g.PHP_CODE,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(root/'release.php')],
                text=True,capture_output=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
            runner="""<?php
$hooks=[];$scripts=[];$current='solarni-sestava-na-chatu';$admin=false;$loaded=true;
function add_action($event,$fn,$priority=10){global $hooks;$hooks[$event][$priority][]=$fn;}
function is_admin(){global $admin;return $admin;}
function is_page($slug){global $current;return $current===$slug;}
function wp_script_is($name,$status){global $loaded;return $loaded&&$name==='solar-expert-builder'&&$status==='enqueued';}
function wp_add_inline_script($name,$code,$place){global $scripts;$scripts[]=[$name,$code,$place];}
require __DIR__.'/release.php';
$cb=$hooks['wp_enqueue_scripts'][99999][0];
$cb();
$good=$scripts;
$current='vyber-baterii';$cb();
$current='solarni-sestava-na-chatu';$admin=true;$cb();
$admin=false;$loaded=false;$cb();
echo json_encode(['good'=>$good,'after'=>$scripts],JSON_UNESCAPED_UNICODE);
"""
            (root/'run.php').write_text(runner,encoding='utf-8')
            run=subprocess.run(['php',str(root/'run.php')],
                capture_output=True,text=True,timeout=10)
            self.assertEqual(run.returncode,0,run.stdout+run.stderr)
            value=json.loads(run.stdout)
            self.assertEqual(value['good'],value['after'])
            self.assertEqual(len(value['good']),1)
            self.assertEqual(value['good'][0][0],'solar-expert-builder')
            self.assertEqual(value['good'][0][2],'after')
            self.assertIn('se-builder-recovery-note',value['good'][0][1])

    def test_forbidden_wordpress_write_paths_fail_before_transport(self):
        cases=[
          ('POST','/wp/v2/posts',{'title':'bad'}),
          ('POST','/code-snippets/v1/snippets',{'code':'bad'}),
          ('PUT','/code-snippets/v1/snippets/4',{'code':'bad'}),
          ('DELETE','/code-snippets/v1/snippets/4',None),
          ('POST','/code-snippets/v1/snippets/41/activate',None)
        ]
        for method,path,body in cases:
            with self.assertRaises(g.Blocked):
                g.request_rest(method,path,'user','password',body)
        self.assertEqual(g.POST_ATTEMPTS,0)

    def test_one_inactive_create_then_activate_with_exact_public_readback(self):
        state={'active':False}
        calls=[]
        def fake_rest(method,path,user,password,body=None):
            calls.append((method,path,body))
            if path==g.HEALTH:return 200,HEALTH
            if path==g.PLUGINS:return 200,[{
                'plugin':'code-snippets/code-snippets.php','status':'active'}]
            if path==g.SNIPPETS:return 200,[]
            if path=='/code-snippets/v1/snippets' and method=='POST':
                self.assertIs(body['active'],False)
                self.assertEqual(body['code'],g.PHP_CODE)
                return 201,{'id':851}
            if path=='/code-snippets/v1/snippets/851' and method=='GET':
                return 200,{'id':851,'name':g.NAME,
                            'active':state['active'],'code':g.PHP_CODE}
            if path=='/code-snippets/v1/snippets/851/activate':
                state['active']=True
                return 200,{}
            raise AssertionError((method,path))
        control={'schema_version':1,'enabled':True,'revision':1,
                 'mode':'one_builder_empty_result_safe_handoff'}
        with patch.object(g,'request_rest',side_effect=fake_rest), \
             patch.object(g,'CONTROL') as ctrl, \
             patch.object(g,'public_html',return_value='Jak vybrat LiFePO4 baterii'), \
             patch.object(g,'public_readback'), patch.object(g,'receipt') as log:
            ctrl.read_text.return_value=json.dumps(control)
            g.execute('user','password')
        self.assertEqual([(method,path) for method,path,_ in calls if method=='POST'],
             [('POST','/code-snippets/v1/snippets'),
              ('POST','/code-snippets/v1/snippets/851/activate')])
        self.assertEqual(log.call_args.args[0],'wp_verified')
        self.assertTrue(state['active'])

    def test_existing_snippet_blocks_duplicate_activation(self):
        with patch.object(g,'request_rest',side_effect=[
             (200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]),
             (200,[{'name':g.NAME,'code':g.PHP_CODE}])]):
            with self.assertRaises(g.Blocked):
                g.inventory('u','p')

if __name__=='__main__':unittest.main()
