"""Legacy theme first-update safety: exact old hooks and read-only state, never full deploy."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_legacy_sync_guard_release as g

HEALTH={'build_marker':g.OLD_BUILD,'managed_content_items':60,
        'content_sync_status':'current','content_sync_required':False}
GUARD={'schema_version':1,'guard_active':True,'targeted_functions_defined':4,
       'targeted_hooks_remaining':0,'targeted_hook_count':4,
       'anonymous_after_switch_theme_not_proved':True,
       'theme_release_authorized':False,'word_press_writes':0}

class LegacySyncGuardTests(unittest.TestCase):
    def setUp(self):
        g.POSTS=0
        g.SNIPPET_ID=None

    def test_php_code_never_mutates_wordpress_or_disables_other_plugins(self):
        for term in ('wp_update_post(', 'update_option(', 'wp_insert_post(',
                     'remove_all_actions(', 'remove_all_filters(', 'eval('):
            self.assertNotIn(term,g.PHP_CODE)
        self.assertEqual(g.PHP_CODE.count("register_rest_route("),1)
        self.assertIn("current_user_can('manage_options')",g.PHP_CODE)
        for cb in ('solar_expert_schedule_content_sync',
                   'solar_expert_maybe_sync_content',
                   'solar_expert_run_async_content_sync',
                   'solar_expert_sync_after_theme_update'):
            self.assertEqual(g.PHP_CODE.count("remove_action("),4)
            self.assertIn(cb,g.PHP_CODE)

    def test_actual_php_hooks_removed_exactly_and_unrelated_remains(self):
        if not shutil.which('php'):
            self.skipTest('PHP executable unavailable')
        with tempfile.TemporaryDirectory() as path:
            root=Path(path)
            (root/'guard.php').write_text('<?php\n'+g.PHP_CODE,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(root/'guard.php')],capture_output=True,text=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stderr+lint.stdout)
            script="""<?php
$hooks=[];
function add_action($hook,$name,$priority=10){global $hooks;$hooks[$hook][$priority][]=$name;}
function remove_action($hook,$name,$priority=10){
  global $hooks;
  foreach(($hooks[$hook][$priority]??[]) as $i=>$fn){if($fn===$name){unset($hooks[$hook][$priority][$i]);return true;}}
  return false;
}
function has_action($hook,$name){global $hooks;
  foreach(($hooks[$hook]??[]) as $p=>$arr){foreach($arr as $fn){if($fn===$name)return $p;}}
  return false;
}
function register_rest_route($namespace,$path,$args){global $route;$route=[$namespace,$path,$args];}
function current_user_can($cap){return $cap==='manage_options';}
foreach([
 ['init','solar_expert_schedule_content_sync',50],
 ['admin_init','solar_expert_maybe_sync_content',10],
 ['solar_expert_async_content_sync','solar_expert_run_async_content_sync',10],
 ['upgrader_process_complete','solar_expert_sync_after_theme_update',20],
 ['admin_init','other_plugin_callback',10],
] as $x){add_action($x[0],$x[1],$x[2]);}
function solar_expert_schedule_content_sync(){}
function solar_expert_maybe_sync_content(){}
function solar_expert_run_async_content_sync(){}
function solar_expert_sync_after_theme_update(){}
require __DIR__.'/guard.php';
solar_expert_old_sync_guard_v1_remove();
$routes=$hooks['rest_api_init'][10];($routes[0])();
$callback=$route[2]['callback'];
$permitted=($route[2]['permission_callback'])();
echo json_encode([
 'init'=>has_action('init','solar_expert_schedule_content_sync'),
 'admin'=>has_action('admin_init','solar_expert_maybe_sync_content'),
 'cron'=>has_action('solar_expert_async_content_sync','solar_expert_run_async_content_sync'),
 'upgrader'=>has_action('upgrader_process_complete','solar_expert_sync_after_theme_update'),
 'unrelated'=>has_action('admin_init','other_plugin_callback'),
 'permitted'=>$permitted,
 'status'=>$callback(),
],JSON_UNESCAPED_UNICODE);
"""
            (root/'run.php').write_text(script,encoding='utf-8')
            result=subprocess.run(['php',str(root/'run.php')],capture_output=True,text=True,timeout=10)
            self.assertEqual(result.returncode,0,result.stderr)
            x=json.loads(result.stdout)
            for label in ('init','admin','cron','upgrader'):
                self.assertFalse(x[label])
            self.assertEqual(x['unrelated'],10)
            self.assertTrue(x['permitted'])
            self.assertEqual(x['status'],GUARD)

    def test_exact_path_allowlist_only(self):
        for method,path,payload in (
            ('POST','/wp/v2/posts',{'content':'never'}),
            ('PUT','/code-snippets/v1/snippets/99',{'code':'never'}),
            ('POST','/code-snippets/v1/snippets',{'name':'other'}),
            ('POST','/code-snippets/v1/snippets/44/activate',None),
            ('DELETE','/wp/v2/plugins',None)):
            with self.assertRaises(g.Blocked):
                g.rest(method,path,'user','password',payload)
        self.assertEqual(g.POSTS,0)

    def test_one_inactive_create_then_activation_with_exact_readback(self):
        state={'active':False}
        calls=[]
        def fake(method,path,user='',password='',body=None):
            calls.append((method,path,body))
            if path==g.HEALTH:return 200,HEALTH
            if path==g.PLUGINS:return 200,[{'plugin':'code-snippets/code-snippets.php','status':'active'}]
            if path==g.LIST:return 200,[]
            if path=='/code-snippets/v1/snippets' and method=='POST':
                return 201,{'id':411}
            if path=='/code-snippets/v1/snippets/411' and method=='GET':
                return 200,{'id':411,'name':g.NAME,'code':g.PHP_CODE,'active':state['active']}
            if path=='/code-snippets/v1/snippets/411/activate' and method=='POST':
                state['active']=True
                return 200,{}
            if path==g.GUARD:return 200,GUARD
            raise AssertionError((method,path))
        control=json.dumps({'schema_version':1,'enabled':True,'revision':1,
                            'mode':'one_old_php_implicit_sync_hook_guard'})
        with patch.object(g,'rest',side_effect=fake),patch.object(g,'CONTROL') as control_file,\
             patch.object(g,'receipt') as receipt:
            control_file.read_text.return_value=control
            g.execute('user','password')
        self.assertEqual([c[1] for c in calls if c[0]=='POST'],
                         ['/code-snippets/v1/snippets','/code-snippets/v1/snippets/411/activate'])
        self.assertEqual(receipt.call_args.args[0],'wp_verified')
        self.assertTrue(state['active'])

    def test_drift_blocks_before_wordpress_write(self):
        with patch.object(g,'rest',return_value=(200,{**HEALTH,'content_sync_required':True})):
            with self.assertRaises(g.Blocked):
                g.live_baseline()
        self.assertEqual(g.POSTS,0)

    def test_status_must_admit_uncovered_theme_switch_hook(self):
        with patch.object(g,'rest',return_value=(200,{**GUARD,
                        'anonymous_after_switch_theme_not_proved':False})):
            with self.assertRaises(g.Blocked):
                g.guard_status('u','p')
        self.assertEqual(g.POSTS,0)

if __name__=='__main__':
    unittest.main()
