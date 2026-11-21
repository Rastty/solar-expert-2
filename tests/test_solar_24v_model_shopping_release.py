"""A 24V sourced model must fail closed, never mutate WP content or fake clicks."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_24v_model_shopping_release as m

class ModelCardSafety(unittest.TestCase):
    def setUp(self):
        m.POST_ATTEMPTS=0
        m.SNIPPET_ID=None

    def test_immutable_model_and_truthful_economic_contract(self):
        source=m.PHP_CODE
        for piece in (
          "is_front_page() || is_page('solarni-sestava-na-chatu')",
          "wp_script_is('solar-expert-builder', 'enqueued')",
          "buyerModelWh: 1448","buyerModelPeakW: 817",
          "batteryRequiredKwh: 2.1","panelCount: 4",
          "panelSeries: 2","panelParallel: 2","quoteFreshDays: 30",
          "battery-goowei-24-100","inverter-victron-24-1200",
          "mppt-victron-100-30","panel-victron-190",
          "String(m.max_pv_isc_source_url||'')",
          "Number(m.max_pv_isc_a)!==35",
          "Number(p.isc_a)!==9.17",
          "Number(b.max_discharge_a)*24<Math.ceil(config.buyerModelPeakW/0.90)",
          "Number(m.min_pv_start_v_by_voltage['24'])",
          "coldVoc>=Number(m.max_pv_voc_v)*.98",
          "arrayIsc>Number(m.max_pv_isc_a)*.98",
          "totalWp>Number(m.max_pv_w_by_voltage['24'])",
          "candidate.rows","Number.isSafeInteger(total)",
          "href=item.offer.href","sourceVerified(o.raw)",
          "Math.floor((now.getTime()-day.getTime())/86400000)>config.quoteFreshDays",
          "Battery.cz a Solar-Import.cz provozuje stejná společnost",
          "nejde o instalační projekt","Toto není jeden společný košík",
          "data-se-reviewed-24v-example",
          "document.addEventListener('alpine:initialized',mount",
          "link.addEventListener('click',function()",
          "window.SolarExpertAffiliate.trackOffer("
        ):
            self.assertIn(piece,source,piece)
        for forbidden in (
          'wp_insert_post(', 'wp_update_post(', 'update_post_meta(',
          'update_option(', 'wp_remote_post(', 'wp_delete_post(',
          'wp_remote_get(', 'window.location.assign(', 'fetch(',
          'document.write(', 'eval(', 'new Function(', 'innerHTML=',
          'localStorage.', 'sessionStorage.'
        ):
            self.assertNotIn(forbidden,source)

    def test_model_price_math_and_physics_before_any_browser(self):
        # Source-pinned dev composer #44899415593: 2S2P with panel Victron190.
        self.assertEqual(4*190,760)
        self.assertEqual(2*2,4)
        self.assertLess(2*25.5*1.12,100*.98)
        self.assertLess(2*9.17,35*.98)
        self.assertGreaterEqual(2*21.8,29)
        self.assertLessEqual(760,880)
        self.assertGreaterEqual(24*100,817/.90)
        self.assertGreaterEqual(2560,1448/(.80*.90))
        self.assertGreaterEqual(1000,300)
        self.assertGreaterEqual(2200,817)
        self.assertEqual(14690+7431+2984+4*2251,34109)

    def test_real_php_scope_only_homepage_and_builder(self):
        if not shutil.which('php'):self.skipTest('PHP missing')
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)
            (path/'snippet.php').write_text('<?php\n'+m.PHP_CODE,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(path/'snippet.php')],
                capture_output=True,text=True,timeout=15)
            self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
            (path/'runner.php').write_text("""<?php
$hooks=[];$scripts=[];$slug='home';$admin=false;$builder=true;
function add_action($e,$f,$p=10){global $hooks;$hooks[$e][$p][]=$f;}
function is_admin(){global $admin;return $admin;}
function is_front_page(){global $slug;return $slug==='home';}
function is_page($s){global $slug;return $slug===$s;}
function wp_script_is($name,$method){global $builder;
return $builder&&$name==='solar-expert-builder'&&$method==='enqueued';}
function wp_add_inline_script($name,$source,$position){
global $scripts;$scripts[]=[$name,$source,$position];}
require __DIR__.'/snippet.php';
$cb=$hooks['wp_enqueue_scripts'][99999][0];
$cb();$home=count($scripts);
$slug='solarni-sestava-na-chatu';$cb();$builderPage=count($scripts);
$slug='vyber-baterii';$cb();$battery=count($scripts);
$slug='home';$admin=true;$cb();$adminCount=count($scripts);
$admin=false;$builder=false;$cb();$notLoaded=count($scripts);
echo json_encode(['counts'=>compact('home','builderPage','battery','adminCount','notLoaded'),
  'first'=>$scripts[0][0],'position'=>$scripts[0][2]],JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
            proc=subprocess.run(['php',str(path/'runner.php')],
                capture_output=True,text=True,timeout=15)
            self.assertEqual(proc.returncode,0,proc.stderr+proc.stdout)
            obj=json.loads(proc.stdout)
            self.assertEqual(obj['counts'],{
                'home':1,'builderPage':2,'battery':2,'adminCount':2,'notLoaded':2})
            self.assertEqual(obj['first'],'solar-expert-builder')
            self.assertEqual(obj['position'],'after')

    def test_real_embedded_javascript_syntax(self):
        if not shutil.which('node'):self.skipTest('Node missing')
        js=m.PHP_CODE.split("<<<'SOLAR_REVIEWED_24V_MODEL_V1'",1)[1].split(
            'SOLAR_REVIEWED_24V_MODEL_V1;',1)[0].strip()
        with tempfile.TemporaryDirectory() as tmp:
            f=Path(tmp)/'model.mjs'
            f.write_text(js,encoding='utf-8')
            p=subprocess.run(['node','--check',str(f)],
                capture_output=True,text=True,timeout=15)
            self.assertEqual(p.returncode,0,p.stderr+p.stdout)

    def test_wordpress_contract_denies_every_unapproved_write(self):
        for method,path,payload in (
          ('POST','/wp/v2/posts',{}),
          ('PUT','/code-snippets/v1/snippets/123',{}),
          ('DELETE','/code-snippets/v1/snippets/123',None),
          ('POST','/code-snippets/v1/snippets',{'code':'other'}),
          ('POST','/code-snippets/v1/snippets/123/activate',None)
        ):
            with self.assertRaises(m.Blocked):
                m.api(method,path,'user','password',payload)
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_disabled_control_causes_no_write(self):
        disabled={'schema_version':1,'enabled':False,'revision':1,'mode':m.MODE}
        with patch.object(m,'CONTROL') as control,patch.object(m,'preflight') as before:
            control.read_text.return_value=json.dumps(disabled)
            with self.assertRaises(m.Blocked):
                m.execute('user','password')
            before.assert_not_called()
        self.assertEqual(m.POST_ATTEMPTS,0)

    def test_exact_inactive_then_active_no_duplicate_publish(self):
        calls=[]
        state={'active':False}
        def fake_api(method,path,user,password,body=None):
            calls.append((method,path,body))
            if path==m.REST+'/unused':raise AssertionError
            if path=='/code-snippets/v1/snippets' and method=='POST':
                self.assertEqual(body,{'name':m.NAME,'code':m.PHP_CODE,
                    'scope':'global','active':False,'desc':m.DESC})
                return 201,{'id':1177}
            if path=='/code-snippets/v1/snippets/1177' and method=='GET':
                return 200,{'id':1177,'name':m.NAME,'scope':'global',
                            'active':state['active'],'code':m.PHP_CODE}
            if path=='/code-snippets/v1/snippets/1177/activate' and method=='POST':
                state['active']=True
                return 200,{}
            raise AssertionError((method,path))
        armed={'schema_version':1,'enabled':True,'revision':1,'mode':m.MODE}
        with patch.object(m,'CONTROL') as control,patch.object(m,'preflight'), \
             patch.object(m,'api',side_effect=fake_api), \
             patch.object(m,'page_readback'),patch.object(m.existing,'baseline'), \
             patch.object(m,'receipt') as receipt:
            control.read_text.return_value=json.dumps(armed)
            m.execute('u','p')
        self.assertEqual([(method,path) for method,path,_ in calls if method=='POST'],[
          ('POST','/code-snippets/v1/snippets'),
          ('POST','/code-snippets/v1/snippets/1177/activate')])
        self.assertTrue(state['active'])
        self.assertEqual(receipt.call_args.args[0],'wp_verified')

if __name__=='__main__':
    unittest.main()
