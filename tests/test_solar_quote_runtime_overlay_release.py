"""Contract for one additive media file and one reversible exact WordPress snippet."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_quote_runtime_overlay_release as m

SHA = 'a'*64
URL = 'https://solar-expert.cz/wp-content/uploads/2026/11/solar-price-overlay-aaaaaaaaaaaa.txt'
HEALTH = {
    'build_marker':m.OLD_BUILD, 'managed_content_items':60,
    'content_sync_status':'current', 'content_sync_required':False
}
PREVIEW = {
  'summary':{
    'release_authorized':False,'source_revision':m.SOURCE_PIN,
    'counts':{
      'all_offer_rows':52, 'exact_seller_matches':51,'eligible':48,
      'skipped_unresolved_sku':3,'skipped_source_changed':1,
      'skipped_date_expired':0,'skipped_bad_quote':0
    }, 'wordpress_writes':0,'affiliate_clicks':0
  },
  'catalog':{'products':[{'id':'p1','source_url':'https://merchant.example/p1'}]}
}
class OverlayReleaseTest(unittest.TestCase):
    def setUp(self):
        m.WRITE_ATTEMPTS=0;m.MEDIA_ID=None;m.SNIPPET_ID=None

    def test_exact_php_runtime_override_and_no_theme_or_post_writes(self):
        php=m.snippet_code(URL,SHA)
        self.assertEqual(php.count('wp_add_inline_script('),1)
        self.assertIn("'after'",php)
        self.assertIn("'solar-expert-affiliate'",php)
        self.assertIn('wp_enqueue_scripts',php)
        self.assertIn('window.SolarExpertConfig.catalogUrl = ',php)
        self.assertIn(URL,php)
        self.assertNotIn('wp_update_post(',php)
        for forbidden in ('update_option(', 'wp_insert_post(', 'wp_remote_post(',
                          'eval(', 'remove_action(', 'wp_redirect('):
            self.assertNotIn(forbidden,php)
        if shutil.which('php'):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp)
                (root/'overlay.php').write_text('<?php\n'+php,encoding='utf-8')
                run=subprocess.run(['php','-l',str(root/'overlay.php')],
                                   capture_output=True,text=True,timeout=10)
                self.assertEqual(run.returncode,0,run.stderr+run.stdout)
                (root/'run.php').write_text("""<?php
$callbacks=[];$injected=[];$admin=false;$queued=true;
function add_action($tag,$fn,$priority){global $callbacks;$callbacks[$tag]=$fn;}
function is_admin(){global $admin;return $admin;}
function wp_script_is($name,$type){global $queued;
  return $queued && $name==='solar-expert-affiliate' && $type==='enqueued';}
function wp_json_encode($value){return json_encode($value);}
function wp_add_inline_script($handle,$code,$position){global $injected;
  $injected[]=[$handle,$code,$position];}
require __DIR__.'/overlay.php';
$callbacks['wp_enqueue_scripts']();
$first=$injected;
$admin=true;$callbacks['wp_enqueue_scripts']();
$admin=false;$queued=false;$callbacks['wp_enqueue_scripts']();
echo json_encode(['first'=>$first,'final'=>$injected],JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
                result=subprocess.run(['php',str(root/'run.php')],
                                      capture_output=True,text=True,timeout=10)
                self.assertEqual(result.returncode,0,result.stderr)
                data=json.loads(result.stdout)
                self.assertEqual(len(data['first']),1)
                self.assertEqual(data['first'],data['final'])
                self.assertEqual(data['first'][0][0],'solar-expert-affiliate')
                self.assertEqual(data['first'][0][2],'after')
                self.assertIn(URL.replace('/',r'\/'),data['first'][0][1])

    def test_exact_origin_restriction_and_no_cross_site_media(self):
        for url in (
            'https://evil.example/wp-content/uploads/overlay.txt',
            'http://solar-expert.cz/wp-content/uploads/overlay.txt',
            'https://solar-expert.cz/wp-content/themes/solar-expert-2/x.txt',
            'https://solar-expert.cz/wp-content/uploads/overlay.php',
            'https://solar-expert.cz/wp-content/uploads/x.txt?token=secret',
        ):
            with self.assertRaises(m.Blocked):
                m.snippet_code(url,SHA)
        with self.assertRaises(m.Blocked):m.snippet_code(URL,'invalid')

    def test_public_script_check_and_duplicate_block(self):
        html=('...affiliate-adapter.js...product-matcher.js...'
              'window.SolarExpertConfig.catalogUrl = "'+URL+'";').encode()
        self.assertTrue(m.inspect_scripts(html,URL))
        html_escaped=html.replace(URL.encode(),URL.replace('/',r'\/').encode())
        self.assertTrue(m.inspect_scripts(html_escaped,URL))
        with self.assertRaises(m.Blocked):m.inspect_scripts(html+html,URL)
        with self.assertRaises(m.Blocked):m.inspect_scripts(b'no markup',URL)

    def test_preview_requires_bounded_pinned_cohort(self):
        with patch.object(m,'CONTROL') as control,patch.object(m,'PREVIEW') as preview:
            control.read_text.return_value=json.dumps({
                'schema_version':1,'enabled':True,'revision':1,
                'mode':'one_additive_48_quote_runtime_overlay'})
            preview.read_text.return_value=json.dumps(PREVIEW)
            payload=m.load_candidate()
            self.assertIn(b'products',payload)
            bad=json.loads(json.dumps(PREVIEW))
            bad['summary']['counts']['eligible']=49
            preview.read_text.return_value=json.dumps(bad)
            with self.assertRaises(m.Blocked):m.load_candidate()
            bad['summary']['counts']['eligible']=48
            bad['summary']['source_revision']='dev'
            preview.read_text.return_value=json.dumps(bad)
            with self.assertRaises(m.Blocked):m.load_candidate()

    def test_unapproved_rest_writes_fail_before_transport(self):
        for method,path,payload in (
            ('POST','/wp/v2/posts',{'content':'bad'}),
            ('PUT','/wp/v2/media/22',{'title':'bad'}),
            ('DELETE','/code-snippets/v1/snippets/22',None),
            ('POST','/code-snippets/v1/snippets',{'name':'different'}),
            ('POST','/code-snippets/v1/snippets/22/activate',None),
        ):
            with self.assertRaises(m.Blocked):
                m.wp(method,path,'u','p',payload)
        self.assertEqual(m.WRITE_ATTEMPTS,0)

    def test_single_media_then_single_inactive_snippet_and_activation(self):
        control=json.dumps({
            'schema_version':1,'enabled':True,'revision':1,
            'mode':'one_additive_48_quote_runtime_overlay'
        })
        data={'active':False,'code':None}
        calls=[]
        def fake_wp(method,path,user,password,body=None,filename=None):
            calls.append((method,path,body,filename))
            if path==m.HEALTH:return 200,HEALTH
            if path==m.PLUGINS:return 200,[{
                'plugin':'code-snippets/code-snippets.php','status':'active'}]
            if path==m.LIST:return 200,[]
            if path.startswith('/wp/v2/media?slug='):return 200,[]
            if path=='/wp/v2/media' and method=='POST':
                self.assertIsInstance(body,bytes)
                self.assertTrue(filename.endswith('.txt'))
                data['filename']=filename
                data['payload']=body
                return 201,{'id':808,'source_url':
                    'https://solar-expert.cz/wp-content/uploads/2026/11/'+filename}
            if path=='/wp/v2/media/808':
                return 200,{'id':808,'source_url':
                    'https://solar-expert.cz/wp-content/uploads/2026/11/'+data['filename']}
            if path=='/code-snippets/v1/snippets' and method=='POST':
                data['code']=body['code']
                self.assertIs(body['active'],False)
                return 201,{'id':909}
            if path=='/code-snippets/v1/snippets/909' and method=='GET':
                return 200,{'id':909,'name':m.NAME,'code':data['code'],'active':data['active']}
            if path=='/code-snippets/v1/snippets/909/activate':
                data['active']=True
                return 200,{}
            raise AssertionError((method,path))
        def fake_fetch(url,max_bytes=2000000):
            if url==m.PUBLIC_CATALOG:return b'static-old-file'
            if '/wp-content/uploads/' in url:return data['payload']
            return ('affiliate-adapter.js product-matcher.js '
                    'window.SolarExpertConfig.catalogUrl = "'+
                    'https://solar-expert.cz/wp-content/uploads/2026/11/'+
                    data['filename']+'";').encode()
        with patch.object(m,'wp',side_effect=fake_wp), \
             patch.object(m,'fetch_public',side_effect=fake_fetch), \
             patch.object(m,'baseline'),patch.object(m,'receipt') as record, \
             patch.object(m,'CONTROL') as control_file, \
             patch.object(m,'PREVIEW') as preview_file:
            control_file.read_text.return_value=control
            preview_file.read_text.return_value=json.dumps(PREVIEW)
            m.execute('u','p')
        posts=[(method,path) for method,path,_,__ in calls if method=='POST']
        self.assertEqual(posts,[('POST','/wp/v2/media'),
                                ('POST','/code-snippets/v1/snippets'),
                                ('POST','/code-snippets/v1/snippets/909/activate')])
        self.assertTrue(data['active'])
        self.assertEqual(record.call_args.args[0],'wp_verified')
        self.assertTrue(record.call_args.kwargs['unchanged_legacy_health'])

if __name__=='__main__':unittest.main()
