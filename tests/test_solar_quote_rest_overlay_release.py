"""One reversible WordPress Code Snippet: PHP REST JSON + no-media exact buyer URL."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_quote_rest_overlay_release as m

CATALOG={'schemaVersion':'1','products':[{'id':'p'+str(i),'sku':'SKU'+str(i),
        'price_czk':5000,'verified_at':'2026-11-07'} for i in range(24)],
        'bundle_deals':[]}
PAYLOAD=(json.dumps(CATALOG,ensure_ascii=False,separators=(',',':'))+'\n').encode()

class TestQuoteRestOverlay(unittest.TestCase):
    def setUp(self):
        m.POST_ATTEMPTS=0;m.SNIPPET_ID=None

    def test_php_contract_is_read_only_and_one_frontend_override(self):
        php=m.php_source(PAYLOAD)
        self.assertEqual(php.count("register_rest_route("),1)
        self.assertEqual(php.count('wp_add_inline_script('),1)
        self.assertIn("'solar-expert-affiliate'",php)
        self.assertIn("'after'",php)
        self.assertIn("'permission_callback' => '__return_true'",php)
        self.assertIn('gzdecode(base64_decode(',php)
        self.assertIn(m.ROUTE,php)
        for forbidden in ('wp_update_post(', 'wp_insert_post(', 'update_option(',
                          'wp_remote_post(', 'wp_redirect(', 'eval(', 'wp_delete_'):
            self.assertNotIn(forbidden,php)
        self.assertNotIn('https://ehub.cz',php)

    def test_actual_php_rest_route_returns_original_json_and_inline_once(self):
        if not shutil.which('php'):
            self.skipTest('PHP unavailable')
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            (folder/'payload.php').write_text('<?php\n'+m.php_source(PAYLOAD),encoding='utf-8')
            lint=subprocess.run(['php','-l',str(folder/'payload.php')],
                                capture_output=True,text=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stderr+lint.stdout)
            (folder/'run.php').write_text("""<?php
$hooks=[];$route=null;$scripts=[];$admin=false;$queued=true;
function add_action($key,$fn,$priority=10){global $hooks;$hooks[$key][$priority][]=$fn;}
function register_rest_route($namespace,$path,$args){global $route;$route=[$namespace,$path,$args];}
function rest_ensure_response($x){return $x;}
function is_admin(){global $admin;return $admin;}
function wp_script_is($h,$status){global $queued;return $queued&&$h==='solar-expert-affiliate'&&$status==='enqueued';}
function home_url($path){return 'https://solar-expert.cz'.$path;}
function wp_json_encode($value){return json_encode($value);}
function wp_add_inline_script($h,$code,$slot){global $scripts;$scripts[]=[$h,$code,$slot];}
class WP_Error { function __construct($a,$b,$c){} }
require __DIR__.'/payload.php';
$hooks['rest_api_init'][10][0]();
$body=($route[2]['callback'])();
$hooks['wp_enqueue_scripts'][99999][0]();
$first=$scripts;
$admin=true;$hooks['wp_enqueue_scripts'][99999][0]();
$admin=false;$queued=false;$hooks['wp_enqueue_scripts'][99999][0]();
echo json_encode(['route'=>[$route[0],$route[1],$route[2]['methods'],
    $route[2]['permission_callback']], 'body'=>$body, 'first'=>$first,'final'=>$scripts],
    JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
            run=subprocess.run(['php',str(folder/'run.php')],
                               capture_output=True,text=True,timeout=10)
            self.assertEqual(run.returncode,0,run.stderr)
            x=json.loads(run.stdout)
            self.assertEqual(x['route'],['solar-quote-overlay/v2','/catalog','GET','__return_true'])
            self.assertEqual(x['body'],CATALOG)
            self.assertEqual(x['first'],x['final'])
            self.assertEqual(len(x['first']),1)
            self.assertEqual(x['first'][0][0],'solar-expert-affiliate')
            self.assertIn(m.URL.replace('/','\\/'),x['first'][0][1])
            self.assertEqual(x['first'][0][2],'after')

    def test_release_preview_is_one_pinned_exact_48_cohort(self):
        p={'summary':{'release_authorized':False,'source_revision':m.original.SOURCE_PIN,
           'counts':{'all_offer_rows':52,'exact_seller_matches':51,
                     'eligible':48,'skipped_unresolved_sku':3,'skipped_source_changed':1,
                     'skipped_date_expired':0,'skipped_bad_quote':0},
           'wordpress_writes':0,'affiliate_clicks':0},
           'catalog':CATALOG}
        ctl={'schema_version':1,'enabled':True,'revision':1,'mode':m.MODE}
        with patch.object(m,'CONTROL') as control, patch.object(m,'PREVIEW') as preview:
            control.read_text.return_value=json.dumps(ctl)
            preview.read_text.return_value=json.dumps(p)
            catalog,raw=m.expected_catalog()
            self.assertEqual(catalog,CATALOG)
            self.assertEqual(raw,PAYLOAD)
            p['summary']['counts']['eligible']=49
            preview.read_text.return_value=json.dumps(p)
            with self.assertRaises(m.Blocked):m.expected_catalog()
            p['summary']['counts']['eligible']=48
            ctl['enabled']=False
            control.read_text.return_value=json.dumps(ctl)
            with self.assertRaises(m.Blocked):m.expected_catalog()

    def test_only_two_exact_rest_writes_authorized(self):
        for method,path,body in (
           ('POST','/wp/v2/media',b'bytes'),
           ('POST','/wp/v2/posts',{'title':'bad'}),
           ('PUT','/code-snippets/v1/snippets/12',{'code':'bad'}),
           ('POST','/code-snippets/v1/snippets',{'name':'bad'}),
           ('POST','/code-snippets/v1/snippets/77/activate',None)):
            with self.assertRaises(m.Blocked):
                m.wp(method,path,'u','p',body,source=m.php_source(PAYLOAD))
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_mock_exact_one_inactive_create_then_activate_with_public_proof(self):
        source=m.php_source(PAYLOAD)
        state={'active':False}
        calls=[]
        def fake_wp(method,path,user,password,body=None,src=None):
            calls.append((method,path,body))
            if path==m.PLUGINS:return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
            if path==m.LIST:return 200,[]
            if path=='/code-snippets/v1/snippets' and method=='POST':
                self.assertEqual(body['code'],source)
                self.assertIs(body['active'],False)
                return 201,{'id':847}
            if path=='/code-snippets/v1/snippets/847' and method=='GET':
                return 200,{'id':847,'name':m.NAME,'active':state['active'],'code':source}
            if path=='/code-snippets/v1/snippets/847/activate':
                state['active']=True
                return 200,{}
            raise AssertionError((method,path))
        with patch.object(m,'expected_catalog',return_value=(CATALOG,PAYLOAD)), \
             patch.object(m,'health_guard'), patch.object(m,'public_absent'), \
             patch.object(m,'public_json',return_value=CATALOG), \
             patch.object(m,'page_readback'),patch.object(m,'wp',side_effect=fake_wp), \
             patch.object(m,'receipt') as receipt:
            m.execute('u','p')
        self.assertEqual([(method,path) for method,path,_ in calls if method=='POST'],
                         [('POST','/code-snippets/v1/snippets'),
                          ('POST','/code-snippets/v1/snippets/847/activate')])
        self.assertTrue(state['active'])
        self.assertEqual(receipt.call_args.args[0],'wp_verified')

if __name__=='__main__':unittest.main()
