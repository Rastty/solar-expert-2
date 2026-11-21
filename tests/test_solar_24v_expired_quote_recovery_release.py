"""Existing 24V quote expires -> never show stale prices; keep safe eHub-only links."""
from pathlib import Path
import json
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_24v_expired_quote_recovery_release as m
from scripts import solar_runtime_pv_tech_release as catalog

class ExpiredQuoteRecoveryTests(unittest.TestCase):
    def setUp(self):
        m.PUT_ATTEMPTS=0
        m.SNIPPET_ID=None

    def test_exact_existing_card_modifications_and_no_unsafe_wp_mutations(self):
        source=m.CODE
        self.assertIn('sourceOnlyOffer(product,affiliate)',source)
        self.assertIn("destination.href!==source.href",source)
        self.assertIn("route.searchParams.get('desturl')",source)
        self.assertIn("route.searchParams.get('a_aid')",source)
        self.assertIn("route.searchParams.get('a_bid')",source)
        self.assertIn("candidate.mode==='unpriced'",source)
        self.assertIn('data-se-unpriced-warning',source)
        self.assertIn("candidate.total.toLocaleString('cs-CZ')",source)
        self.assertIn("const byId=technicalCheck(state.catalog,state);",source)
        self.assertIn("Number(p.isc_a)!==9.17",source)
        self.assertIn("totalWp>Number(m.max_pv_w_by_voltage['24'])",source)
        self.assertIn("link.rel=item.offer.monetized?'sponsored nofollow noopener':'nofollow noopener';",source)
        for forbidden in (
            'wp_insert_post(', 'wp_update_post(', 'update_post_meta(',
            'update_option(', 'wp_remote_post(', 'wp_remote_get(',
            'wp_delete_post(', 'innerHTML=', 'eval(',
            'localStorage.', 'sessionStorage.'):
            self.assertNotIn(forbidden,source)
        self.assertEqual(m.old.PHP_CODE.count('function buyerOffer('),1)
        self.assertEqual(m.CODE.count('function buyerOffer('),1)
        self.assertEqual(m.CODE.count('function sourceOnlyOffer('),1)
        self.assertEqual(m.CODE.count('data-se-quote-mode'),1)

    def test_valid_php_and_embedded_javascript_syntax(self):
        if not shutil.which('php') or not shutil.which('node'):
            self.skipTest('PHP+Node needed for real source parse')
        js=self.inline_js()
        with tempfile.TemporaryDirectory() as root:
            root=Path(root)
            (root/'snippet.php').write_text('<?php\n'+m.CODE,encoding='utf8')
            p=subprocess.run(['php','-l',str(root/'snippet.php')],text=True,
                             capture_output=True,timeout=10)
            self.assertEqual(p.returncode,0,p.stdout+p.stderr)
            (root/'stale-card.mjs').write_text(js,encoding='utf8')
            j=subprocess.run(['node','--check',str(root/'stale-card.mjs')],
                             capture_output=True,text=True,timeout=10)
            self.assertEqual(j.returncode,0,j.stderr+j.stdout)

    @staticmethod
    def inline_js():
        return m.CODE.split("<<<'SOLAR_REVIEWED_24V_MODEL_V1'",1)[1].split(
            'SOLAR_REVIEWED_24V_MODEL_V1;',1)[0].strip()

    def test_real_js_model_priced_and_aged_modes_plus_source_attack(self):
        if not shutil.which('node'):self.skipTest('Node needed')
        # No live merchant requests. Use same pinned catalog that real
        # 48-quote REST snippet was verified against on production.
        original,after,oldcode,newcode=catalog.expected_sources()
        products=after['products']
        js=self.inline_js().replace(
          "document.addEventListener('alpine:initialized',mount,{once:true});",
          "window.__solar24vProof={buildCandidate,sourceOnlyOffer,technicalCheck};")
        self.assertIn('window.__solar24vProof=',js)
        runner=r"""
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(process.argv[2],'utf8');
const catalog=JSON.parse(readFileSync(process.argv[3],'utf8'));
const selected=new Map(catalog.map(p=>[p.id,p]));
const state={catalog,
  result:{voltage:12,energyWh:1448,peak:817,panelWp:700},
  previewMode:true,step:4,catalogReady:true,catalogError:false,
  catalogLoading:false,completeBundles:[]};
function prove(nowString,modify){
  const timestamp=new Date(nowString).getTime();
  class Clock extends Date {
    constructor(...args){super(...(args.length?args:[timestamp]))}
    static now(){return timestamp}
  }
  const window={
    SolarExpertAffiliate:{
      offers(p){
        return (p.offers||[]).map(raw=>{
          const url=new URL('https://ehub.cz/system/scripts/click.php');
          url.searchParams.set('a_aid','source-aid');
          url.searchParams.set('a_bid','source-bid');
          url.searchParams.set('desturl',raw.source_url);
          const age=Math.floor((timestamp-new Date(raw.verified_at+'T00:00:00Z').getTime())/86400000);
          return {raw,merchantId:raw.merchant,merchant:{label:raw.merchant},
            href:url.toString(),monetized:true,
            price_czk:age>30?null:raw.price_czk,
            availability:raw.availability};
        });
      }
    }
  };
  const sandbox={window,URL,Date:Clock,document:{addEventListener(){}},console};
  vm.runInNewContext(source,sandbox,{timeout:2000});
  if(modify)modify(window);
  const result=window.__solar24vProof.buildCandidate(state);
  return result&&{
    mode:result.mode,total:result.total,rows:result.rows.length,
    priced_items:result.rows.filter(x=>x.subtotal!==null).length,
    products:result.rows.map(x=>x.item.id),
    merchants:result.rows.map(x=>x.offer.merchantId),
    links:result.rows.map(x=>x.offer.href.startsWith('https://ehub.cz/'))
  };
}
const out={
  fresh:prove('2026-11-21T12:00:00Z'),
  aged:prove('2026-12-09T12:00:00Z'),
  attack:prove('2026-12-09T12:00:00Z',window=>{
    const original=window.SolarExpertAffiliate.offers.bind(window.SolarExpertAffiliate);
    window.SolarExpertAffiliate.offers=p=>original(p).map(x=>
      p.id==='panel-victron-190'?{...x,href:'https://ehub.cz/system/scripts/click.php?a_aid=x&a_bid=y&desturl=https%3A%2F%2Fevil.example%2Fwrong'}:x);
  }),
  no_technical_fit:prove('2026-12-09T12:00:00Z',window=>{
    state.catalog=state.catalog.map(p=>p.id==='mppt-victron-100-30'?
      {...p,max_pv_isc_a:0}:p);
  })
};
console.log(JSON.stringify(out));
"""
        with tempfile.TemporaryDirectory() as root:
            root=Path(root)
            (root/'source.mjs').write_text(js,encoding='utf8')
            (root/'catalog.json').write_text(
                json.dumps(products,ensure_ascii=False),encoding='utf8')
            (root/'runner.mjs').write_text(runner,encoding='utf8')
            p=subprocess.run(['node',str(root/'runner.mjs'),
                              str(root/'source.mjs'),str(root/'catalog.json')],
                capture_output=True,text=True,timeout=15)
            self.assertEqual(p.returncode,0,p.stdout+p.stderr)
            x=json.loads(p.stdout)
            self.assertEqual(x['fresh']['mode'],'priced')
            self.assertEqual(x['fresh']['total'],34109)
            self.assertEqual(x['fresh']['rows'],4)
            self.assertEqual(x['aged']['mode'],'unpriced')
            self.assertIsNone(x['aged']['total'])
            self.assertEqual(x['aged']['priced_items'],0)
            self.assertEqual(x['aged']['rows'],4)
            self.assertTrue(all(x['aged']['links']))
            self.assertEqual(x['aged']['products'],x['fresh']['products'])
            self.assertIsNone(x['attack'],'Manipulated destination must suppress entire checklist')
            self.assertIsNone(x['no_technical_fit'],'MPPT hard safety gate unchanged')

    def test_disallow_unreviewed_writer_urls(self):
        for method,path,body in [
            ('POST','/code-snippets/v1/snippets',{}),
            ('PUT','/wp/v2/posts/200',{}),
            ('DELETE','/code-snippets/v1/snippets/1',None),
            ('POST','/code-snippets/v1/snippets/1/activate',None)
        ]:
            with self.assertRaises(m.Blocked):
                m.api(method,path,'u','p',body)
        self.assertEqual(m.PUT_ATTEMPTS,0)

    def test_disabled_control_makes_no_write(self):
        with patch.object(m,'CONTROL') as control,patch.object(m,'preflight') as before:
            control.read_text.return_value=json.dumps({
              'schema_version':1,'enabled':False,'revision':1,'mode':m.MODE})
            with self.assertRaises(m.Blocked):m.execute('u','p')
            before.assert_not_called()
        self.assertEqual(m.PUT_ATTEMPTS,0)

if __name__=='__main__':unittest.main()
