"""Exact one-page handoff model: 1.448kWh cottage → edited 24V Battery Selector."""
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from scripts import solar_builder_cottage_handoff_release as m

class CottageHandoffTests(unittest.TestCase):
    def setUp(self):
        m.PUT_ATTEMPTS=0;m.SNIPPET_ID=None

    def test_source_is_the_same_existing_active_builder_code_plus_fixed_model(self):
        self.assertEqual(m.before.CODE.count(m.OLD),1)
        self.assertEqual(m.CODE,m.before.CODE.replace(m.OLD,m.NEW)+m.EXTRA_PHP)
        self.assertEqual(m.CODE.count(m.NEW),1)
        self.assertIn("is_page('vyber-baterii')",m.CODE)
        self.assertIn("wp_script_is('solar-expert-selectors', 'enqueued')",m.CODE)
        self.assertIn("get('scenario')!=='builder-chata'",m.CODE)
        self.assertIn("document.addEventListener('alpine:initialized'",m.CODE)
        self.assertIn("state.run(false)",m.CODE)
        self.assertIn("inverterW:900",m.CODE)
        self.assertIn("dailyKwh:1.448",m.CODE)
        self.assertIn("voltage:24",m.CODE)
        self.assertIn("nikoli schválenou solární sestavu",m.CODE)
        for forbidden in ('update_option(', 'wp_update_post(', 'wp_insert_post(',
                          'wp_remote_post(', 'trackOffer(', 'window.location.href='):
            self.assertNotIn(forbidden,m.CODE)

    def test_model_values_are_source_matched_and_conservative(self):
        source=subprocess.check_output(['git','show',
          '867d0c1aadbfd79dd1fdd57ac424cff491f5a813:assets/js/builder.js'],
          text=True)
        for row in (
          "id:'fridge',name:'Lednice',watts:70,surge:700,hours:10",
          "id:'lights',name:'LED osvětlení',watts:40,surge:40,hours:5",
          "id:'laptop',name:'Notebook',watts:65,surge:90,hours:4",
          "id:'router',name:'Router / Wi-Fi',watts:12,surge:12,hours:24"):
            self.assertIn(row,source)
        energy=(70*10)+(40*5)+(65*4)+(12*24)
        self.assertEqual(energy,1448)
        self.assertEqual(m.DAILY_KWH,energy/1000)
        required=math.ceil(m.DAILY_KWH/(0.8*0.9)*10)/10
        self.assertEqual(required,2.1)
        self.assertEqual(m.MODEL_INVERTER_W,900)
        self.assertGreater(m.MODEL_INVERTER_W,(70+40+65+12)-70+700)
        required_bms_dc_w=math.ceil(m.MODEL_INVERTER_W/0.9)
        self.assertGreater(required_bms_dc_w,24*40,
          '24V 50Ah battery must fail BMS discharge limit for model')
        self.assertLessEqual(required_bms_dc_w,24*100,
          'Reviewed 24V 100Ah model passes the BMS continuous-current screen')

    def test_actual_php_is_valid_and_scoped(self):
        if not shutil.which('php'):self.skipTest('php unavailable')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'snippet.php').write_text('<?php\n'+m.CODE,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(root/'snippet.php')],
                text=True,capture_output=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
            (root/'run.php').write_text("""<?php
$hooks=[];$scripts=[];$page='vyber-baterii';$queued=['solar-expert-selectors'=>true];$admin=false;
function add_action($hook,$fn,$priority=10){global $hooks;$hooks[$hook][$priority][]=$fn;}
function is_admin(){global $admin;return $admin;}
function is_page($slug){global $page;return $page===$slug;}
function is_front_page(){global $page;return $page==='home';}
function wp_script_is($name,$status){global $queued;return isset($queued[$name]);}
function wp_add_inline_script($handle,$js,$where){global $scripts;$scripts[]=[$handle,$js,$where];}
require __DIR__.'/snippet.php';
foreach($hooks['wp_enqueue_scripts'][99999] as $fn)$fn();
$first=$scripts;
$page='other';foreach($hooks['wp_enqueue_scripts'][99999] as $fn)$fn();
$second=$scripts;
$admin=true;$page='vyber-baterii';
foreach($hooks['wp_enqueue_scripts'][99999] as $fn)$fn();
echo json_encode(['first'=>$first,'second'=>$second,'final'=>$scripts],JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
            r=subprocess.run(['php',str(root/'run.php')],
                text=True,capture_output=True,timeout=10)
            self.assertEqual(r.returncode,0,r.stderr+r.stdout)
            x=json.loads(r.stdout)
            self.assertEqual(x['first'],x['second'])
            self.assertEqual(x['first'],x['final'])
            self.assertEqual(len(x['first']),1)
            self.assertEqual(x['first'][0][0],'solar-expert-selectors')
            self.assertEqual(x['first'][0][2],'after')
            self.assertIn('data-se-builder-cottage-model',x['first'][0][1])

    def test_js_syntax(self):
        if not shutil.which('node'):self.skipTest('node unavailable')
        embedded=m.EXTRA_PHP.split("<<<'SOLAR_BUILDER_COTTAGE_BATTERY_V2'",1)[1].split(
            'SOLAR_BUILDER_COTTAGE_BATTERY_V2;',1)[0].strip()
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'battery.mjs'
            path.write_text(embedded,encoding='utf-8')
            p=subprocess.run(['node','--check',str(path)],text=True,
                capture_output=True,timeout=10)
            self.assertEqual(p.returncode,0,p.stdout+p.stderr)

    def test_writer_cannot_create_another_snippet_or_change_posts(self):
        for method,path,body in [
          ('POST','/code-snippets/v1/snippets',{}),
          ('PUT','/wp/v2/posts/20',{}),
          ('DELETE','/code-snippets/v1/snippets/99',None),
          ('PUT','/code-snippets/v1/snippets/99',{'code':'bad'})]:
            with self.assertRaises(m.Blocked):
                m.rest(method,path,'user','pw',body)
        self.assertEqual(m.PUT_ATTEMPTS,0)

    def test_disabled_control_never_calls_wordpress(self):
        with patch.object(m,'CONTROL') as ctl,patch.object(m,'preflight') as guard:
            ctl.read_text.return_value=json.dumps({
                'schema_version':1,'enabled':False,'revision':1,'mode':m.MODE})
            with self.assertRaises(m.Blocked):m.execute('user','password')
            guard.assert_not_called()
        self.assertEqual(m.PUT_ATTEMPTS,0)

if __name__=='__main__':unittest.main()
