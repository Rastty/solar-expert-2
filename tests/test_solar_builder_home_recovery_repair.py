"""Exact in-place WordPress Builder recovery scope repair; unchanged CTA and all safety logic."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_builder_home_recovery_repair as m

class ScopeRepairTests(unittest.TestCase):
    def setUp(self):
        m.PUT_ATTEMPTS=0;m.SNIPPET_ID=None

    def test_only_one_conditional_php_guard_changed(self):
        self.assertEqual(m.first.PHP_CODE.count(m.OLD_FRAGMENT),1)
        self.assertEqual(m.CODE,m.first.PHP_CODE.replace(m.OLD_FRAGMENT,m.NEW_FRAGMENT))
        self.assertEqual(m.CODE.count(m.NEW_FRAGMENT),1)
        self.assertIn("is_front_page() || is_page('solarni-sestava-na-chatu')",m.CODE)
        self.assertIn('data-se-builder-recovery',m.CODE)
        self.assertIn('/vyber-baterii/?scenario=panel400',m.CODE)
        for forbidden in ('wp_update_post(', 'update_option(', 'wp_insert_post(',
                          'SolarExpertConfig.catalogUrl','trackOffer('):
            self.assertNotIn(forbidden,m.CODE)

    def test_real_php_home_and_builder_only(self):
        if not shutil.which('php'):self.skipTest('php unavailable')
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            (folder/'snippet.php').write_text('<?php\n'+m.CODE,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(folder/'snippet.php')],
                capture_output=True,text=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
            (folder/'run.php').write_text("""<?php
$hooks=[];$scripts=[];$page='home';$admin=false;$builderLoaded=true;
function add_action($key,$fn,$priority=10){global $hooks;$hooks[$key][$priority][]=$fn;}
function is_admin(){global $admin;return $admin;}
function is_page($p){global $page;return $page===$p;}
function is_front_page(){global $page;return $page==='home';}
function wp_script_is($handle,$status){global $builderLoaded;
  return $builderLoaded && $handle==='solar-expert-builder' && $status==='enqueued';}
function wp_add_inline_script($handle,$source,$place){global $scripts;
  $scripts[]=[$handle,$source,$place];}
require __DIR__.'/snippet.php';
$callback=$hooks['wp_enqueue_scripts'][99999][0];
$callback();$home=count($scripts);
$page='solarni-sestava-na-chatu';$callback();$builder=count($scripts);
$page='vyber-baterii';$callback();$battery=count($scripts);
$page='home';$admin=true;$callback();$adminCount=count($scripts);
$admin=false;$builderLoaded=false;$callback();$noScript=count($scripts);
echo json_encode(compact('home','builder','battery','adminCount','noScript'));
""",encoding='utf-8')
            run=subprocess.run(['php',str(folder/'run.php')],
                capture_output=True,text=True,timeout=10)
            self.assertEqual(run.returncode,0,run.stderr)
            self.assertEqual(json.loads(run.stdout),{
                'home':1,'builder':2,'battery':2,'adminCount':2,'noScript':2})

    def test_only_existing_exact_id_source_authorized_for_one_put(self):
        m.SNIPPET_ID=1820
        calls=[]
        class FakeHTTP:
            def __enter__(self):
                self.status=200
                self.url=m.first.API+'/code-snippets/v1/snippets/1820'
                self.headers={'Content-Type':'application/json'}
                return self
            def __exit__(self,*args):return False
            def read(self,*args):return b'{}'
        class FakeOpener:
            def open(self,req,timeout):
                calls.append(req)
                return FakeHTTP()
        with patch.object(m.request,'build_opener',return_value=FakeOpener()):
            m.one_put('user','pass')
        self.assertEqual(m.PUT_ATTEMPTS,1)
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0].method,'PUT')
        self.assertEqual(calls[0].full_url,
          m.first.API+'/code-snippets/v1/snippets/1820')
        row=json.loads(calls[0].data)
        self.assertEqual(row['code'],m.CODE)
        self.assertEqual(row['name'],m.first.NAME)
        self.assertIs(row['active'],True)
        self.assertEqual(row['scope'],'global')

    def test_public_scope_contract_fails_if_builder_missing_or_home_changed(self):
        with patch.object(m.first,'public_html',side_effect=[
           '<span class="se-builder-recovery-note">/vyber-baterii/?scenario=panel400</span>',
           'battery page no recovery'
        ]),patch.object(m,'public_home',return_value='clean home'):
            m.public_before()
        with patch.object(m.first,'public_html',side_effect=[
           'missing recovery in builder',
           'battery page without recovery'
        ]),patch.object(m,'public_home',return_value='clean home'):
            with self.assertRaises(m.Blocked):m.public_before()

    def test_release_never_runs_with_disabled_or_drifted_control(self):
        with patch.object(m,'CONTROL') as control:
            control.read_text.return_value=json.dumps({
                'schema_version':1,'enabled':False,'revision':1,
                'mode':'one_inplace_builder_recovery_homepage_scope'})
            with self.assertRaises(m.Blocked):m.execute('u','p')
        self.assertEqual(m.PUT_ATTEMPTS,0)

if __name__=='__main__':unittest.main()
