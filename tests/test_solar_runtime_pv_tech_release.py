"""Source-locked physical PV Isc evidence; never mutate seller offers or technical limits beyond whitelist."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_runtime_pv_tech_release as m

class PVTechTests(unittest.TestCase):
    def setUp(self):
        m.SNIPPET_ID=None
        m.PUT_ATTEMPTS=0

    def test_pin_is_exact_and_manufacturer_sources(self):
        dev=m.actual_developer_source()
        self.assertEqual(len(dev['products']),24)
        rows={p['id']:p for p in dev['products']}
        self.assertEqual(set(m.FIELDS),set([
          'panel-victron-190','mppt-victron-100-20','mppt-victron-100-30',
          'mppt-victron-100-50','mppt-victron-150-35',
          'mppt-victron-150-70','mppt-victron-250-100']))
        self.assertEqual(rows['panel-victron-190']['isc_a'],9.17)
        self.assertEqual(rows['mppt-victron-100-50']['max_pv_isc_a'],60)
        self.assertEqual(rows['mppt-victron-150-70']['max_pv_isc_a'],50)
        self.assertEqual(rows['mppt-victron-250-100']['max_pv_isc_a'],70)

    def test_exact_source_legacy_to_enriched_preserves_quotes_and_full_technical_snapshot(self):
        raw=subprocess.check_output([
          'git','show',m.old.OLD_THEME_SHA+':assets/data/product-seed.json'])
        legacy=json.loads(raw)
        dev=m.actual_developer_source()
        next_catalog=m.enriched_catalog(legacy,dev)
        self.assertEqual(len(next_catalog['products']),24)
        self.assertEqual(next_catalog.get('bundle_deals'),legacy.get('bundle_deals'))
        self.assertNotEqual(next_catalog,legacy)
        old_by_id={p['id']:p for p in legacy['products']}
        for p in next_catalog['products']:
            prior=old_by_id[p['id']]
            self.assertEqual(p['id'],prior['id'])
            self.assertEqual(p.get('sku'),prior.get('sku'))
            self.assertEqual(p.get('offers'),prior.get('offers'))
            self.assertEqual(p.get('availability'),prior.get('availability'))
            self.assertEqual(p.get('price_czk'),prior.get('price_czk'))
            for key,value in p.items():
                if key in m.FIELDS.get(p['id'],()):
                    self.assertEqual(value,dev['products'][next(
                        i for i,q in enumerate(dev['products']) if q['id']==p['id'])][key])
                else:self.assertEqual(value,prior[key])
        self.assertEqual(next_catalog['products'][7]['id'],legacy['products'][7]['id'])

    def test_fails_closed_on_conflicting_evidence_or_changed_merchant(self):
        old=json.loads(subprocess.check_output([
            'git','show',m.old.OLD_THEME_SHA+':assets/data/product-seed.json']))
        source=m.actual_developer_source()
        sample=next(p for p in old['products'] if p['id']=='panel-victron-190')
        sample['isc_a']=123.45
        with self.assertRaises(m.Blocked):m.enriched_catalog(old,source)
        del sample['isc_a']
        sample['merchant']='unapproved'
        with self.assertRaises(m.Blocked):m.enriched_catalog(old,source)

    def test_actual_php_route_decodes_exact_enriched_payload(self):
        if not shutil.which('php'):self.skipTest('PHP not installed')
        source=m.actual_developer_source()
        legacy=json.loads(subprocess.check_output([
          'git','show',m.old.OLD_THEME_SHA+':assets/data/product-seed.json']))
        out=m.enriched_catalog(legacy,source)
        raw=(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n').encode()
        php=m.old.php_source(raw)
        self.assertEqual(php.count("register_rest_route("),1)
        self.assertEqual(php.count("wp_add_inline_script("),1)
        for forbidden in ('wp_insert_post(', 'wp_update_post(', 'update_option(', 'wp_remote_post('):
            self.assertNotIn(forbidden,php)
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            (folder/'s.php').write_text('<?php\n'+php,encoding='utf-8')
            lint=subprocess.run(['php','-l',str(folder/'s.php')],
                capture_output=True,text=True,timeout=10)
            self.assertEqual(lint.returncode,0,lint.stdout+lint.stderr)
            (folder/'runner.php').write_text("""<?php
$hooks=[];$route=null;
function add_action($key,$fn,$priority=10){global $hooks;$hooks[$key][$priority][]=$fn;}
function register_rest_route($ns,$path,$args){global $route;$route=[$ns,$path,$args];}
function rest_ensure_response($data){return $data;}
class WP_Error{function __construct($a,$b,$c){}}
require __DIR__.'/s.php';
$hooks['rest_api_init'][10][0]();
echo json_encode(['method'=>$route[2]['methods'],'body'=>($route[2]['callback'])()],JSON_UNESCAPED_UNICODE);
""",encoding='utf-8')
            run=subprocess.run(['php',str(folder/'runner.php')],
                capture_output=True,text=True,timeout=10)
            self.assertEqual(run.returncode,0,run.stdout+run.stderr)
            observed=json.loads(run.stdout)
            self.assertEqual(observed['method'],'GET')
            self.assertEqual(observed['body'],out)

    def test_exact_one_put_only_existing_active_snippet(self):
        m.SNIPPET_ID=7485
        calls=[]
        class FakeHTTP:
            status=200
            url=m.old.REST+'/code-snippets/v1/snippets/7485'
            headers={'Content-Type':'application/json'}
            def __enter__(self):return self
            def __exit__(self,*args):return False
            def read(self,*args):return b'{}'
        class FakeOpener:
            def open(self,req,timeout):
                calls.append(req)
                return FakeHTTP()
        data={'name':m.old.NAME,'code':'APPROVED EXACT SOURCE','scope':'global',
              'active':True,'desc':m.old.DESCRIPTION}
        with patch.object(m.request,'build_opener',return_value=FakeOpener()):
            status,_=m.wp('PUT','/code-snippets/v1/snippets/7485','u','p',data)
        self.assertEqual(status,200)
        self.assertEqual(m.PUT_ATTEMPTS,1)
        self.assertEqual(len(calls),1)
        self.assertEqual(calls[0].method,'PUT')
        self.assertEqual(json.loads(calls[0].data),data)
        for method,path,body in [
           ('POST','/code-snippets/v1/snippets',data),
           ('PUT','/wp/v2/posts/11',data),
           ('DELETE','/code-snippets/v1/snippets/7485',None),
           ('PUT','/code-snippets/v1/snippets/999',data)]:
            with self.assertRaises(m.Blocked):m.wp(method,path,'u','p',body)
        self.assertEqual(m.PUT_ATTEMPTS,1)

    def test_disabled_control_prevents_wordpress_requests(self):
        ctl={'schema_version':1,'enabled':False,'revision':1,'mode':m.MODE}
        with patch.object(m,'CONTROL') as f,patch.object(m,'preflight') as preflight:
            f.read_text.return_value=json.dumps(ctl)
            with self.assertRaises(m.Blocked):m.execute('user','pass')
            preflight.assert_not_called()
        self.assertEqual(m.PUT_ATTEMPTS,0)

if __name__=='__main__':unittest.main()
