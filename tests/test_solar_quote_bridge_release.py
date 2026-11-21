"""Offline exact-content safety and WordPress snippet mock contract."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from scripts import solar_quote_bridge_release as m

class TestQuoteBridge(unittest.TestCase):
 def setUp(self):
    m.POSTS_ATTEMPTED=0;m.SNIPPET_ID=None
 def test_allowed_pages_and_no_mutating_php(self):
    self.assertIn("in_array($slug",m.PHP_CODE)
    self.assertEqual(m.PHP_CODE.count("add_filter('the_content'"),1)
    for slug in m.PAGES:self.assertIn(slug,m.PHP_CODE)
    for term in ('update_option(', 'wp_update_post(', 'wp_insert_post(', 'eval(', 'wp_remote_post('):
       self.assertNotIn(term,m.PHP_CODE)
    self.assertEqual(m.links('<aside data-solar-quote-bridge="v1"><a href="https://solar-expert.cz/quote-checker/">Check</a></aside>'),
                     {'markers':1,'quote_links':1})
 def test_php_simulated_behavior_is_targeted_and_idempotent(self):
    if not shutil.which('php'):self.skipTest('PHP not installed')
    with tempfile.TemporaryDirectory() as tmp:
       root=Path(tmp)
       (root/'bridge.php').write_text('<?php\n'+m.PHP_CODE,encoding='utf-8')
       lint=subprocess.run(['php','-l',str(root/'bridge.php')],capture_output=True,text=True,timeout=10)
       self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
       (root/'run.php').write_text("""<?php
$cb=null;$slug='';
function add_filter($a,$b,$c){global $cb;$cb=$b;}
function is_admin(){return false;} function is_singular($x){return $x==='page';}
function in_the_loop(){return true;} function is_main_query(){return true;}
function get_the_ID(){return 42;}
function get_post_field($a,$b){global $slug;return $slug;}
function home_url($x){return 'https://solar-expert.cz'.$x;}
function esc_url($x){return $x;}
require __DIR__.'/bridge.php';
$out=[];foreach(['vyber-baterii','vyber-menice','mppt-kalkulacka','other-post'] as $slug){
  $v=$cb('<p>Original</p>');$out[$slug]=['once'=>$v,'twice'=>$cb($v)];
}echo json_encode($out,JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
       p=subprocess.run(['php',str(root/'run.php')],capture_output=True,text=True,timeout=10)
       self.assertEqual(p.returncode,0,p.stderr)
       v=json.loads(p.stdout)
       for slug in m.PAGES:
          self.assertEqual(v[slug]['once'].count('data-solar-quote-bridge="v1"'),1)
          self.assertIn('https://solar-expert.cz/quote-checker/',v[slug]['once'])
          self.assertEqual(v[slug]['once'],v[slug]['twice'])
       self.assertEqual(v['other-post']['once'],'<p>Original</p>')
 def test_no_arbitrary_wordpress_writes(self):
    with self.assertRaises(m.Blocked):
       m.rest('POST','/wp/v2/posts','u','p',{'content':'bad'})
    with self.assertRaises(m.Blocked):
       m.rest('POST','/code-snippets/v1/snippets','u','p',{'name':m.NAME,'code':'other'})
    self.assertEqual(m.POSTS_ATTEMPTED,0)
 def test_mock_single_inactive_create_then_exact_activate(self):
    control=json.dumps({'schema_version':1,'enabled':True,'revision':1,'mode':'one_quote_checker_indexed_tool_bridge'})
    state={'active':False};calls=[]
    def fake_rest(method,path,user,password,body=None):
       calls.append((method,path,body))
       if path==m.PLUGINS:return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
       if path==m.LIST:return 200,[]
       if path=='/code-snippets/v1/snippets' and method=='POST':return 201,{'id':77}
       if path=='/code-snippets/v1/snippets/77':return 200,{'id':77,'name':m.NAME,'code':m.PHP_CODE,'active':state['active']}
       if path=='/code-snippets/v1/snippets/77/activate':
          state['active']=True;return 200,{}
       raise AssertionError(path)
    def fake_html(slug):
       return ('<aside data-solar-quote-bridge="v1"><a href="https://solar-expert.cz/quote-checker/">Quote</a></aside>'
               if state['active'] else '<article>No bridge yet.</article>')
    with patch.object(m,'rest',side_effect=fake_rest),patch.object(m,'public_html',side_effect=fake_html),\
         patch.object(m,'receipt') as rec,patch.object(m,'CONTROL') as config:
       config.read_text.return_value=control
       m.execute('u','p')
    self.assertEqual([x[1] for x in calls if x[0]=='POST'],
       ['/code-snippets/v1/snippets','/code-snippets/v1/snippets/77/activate'])
    self.assertEqual(rec.call_args.args[0],'wp_verified')
if __name__=='__main__':unittest.main()
