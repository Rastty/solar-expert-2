#!/usr/bin/env python3
"""One-source-locked reversible Code Snippet to block unknown Growatt PV Isc purchasing.

Two narrowly authorized WordPress writes: inactive snippet creation then exact
activation; NEVER retry a failed/ambiguous write. Nothing touches posts, themes,
catalog, affiliate destinations or electrical calculations.
"""
from __future__ import annotations
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib import error,request
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT=Path(__file__).resolve().parents[1]
SITE='https://solar-expert.cz'
API=SITE+'/wp-json'
SNIPPETS='/code-snippets/v1/snippets?context=edit&per_page=100'
PLUGINS='/wp/v2/plugins?context=edit&per_page=100'
CONTROL=ROOT/'ops/solar-growatt-pv-isc-guard-release.json'
RECEIPT=ROOT/'artifacts/solar-growatt-pv-isc-guard-release.json'
NAME='Solar Expert legacy Growatt PV Isc purchase safety guard v1'
DESC='Block both source-unverified Growatt PV Isc integrated bundles from purchase without changing engine math'
MODE='one_reversible_legacy_growatt_pv_isc_purchase_gate'
SOURCE_BLOB='02378fceff9f608c215ec1abe099c5bb0af72a73'
JS=(ROOT/'assets/js/growatt-isc-purchase-guard-v1.js').read_text(encoding='utf-8')
BYTES=JS.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SOURCE_BLOB,'Source file no longer matches reviewed immutable Git blob'
assert 'SOLAR_GROWATT_PV_ISC_GUARD_V1' not in JS
PHP_CODE="""/**
 * Exact legacy Builder scope, after bundles composer and before Alpine init.
 * Prevents buying only two Growatt integrated-PV designs with unverified
 * absolute Isc; preserves all independent MPPT/battery/merchant data.
 */
function solar_expert_legacy_growatt_isc_guard_v1_enqueue() {
    if (is_admin() ||
        !(is_front_page() || is_page('solarni-sestava-na-chatu')) ||
        !wp_script_is('solar-expert-bundles', 'enqueued')) return;
    $js = <<<'SOLAR_GROWATT_PV_ISC_GUARD_V1'
""" + JS + """
SOLAR_GROWATT_PV_ISC_GUARD_V1;
    wp_add_inline_script('solar-expert-bundles', $js, 'after');
}
add_action('wp_enqueue_scripts','solar_expert_legacy_growatt_isc_guard_v1_enqueue',99999);
"""
MARKER='__seGrowattPVGuardV1'
POST_ATTEMPTS=0
SNIPPET_ID=None

class Blocked(RuntimeError):pass

def require(ok,reason):
    if not ok:raise Blocked(reason)

def wp(method,path,user,password,body=None):
    global POST_ATTEMPTS
    get=(method=='GET' and body is None and
         (path in (SNIPPETS,PLUGINS) or
          (SNIPPET_ID is not None and path==f'/code-snippets/v1/snippets/{SNIPPET_ID}')))
    create=(method=='POST' and path=='/code-snippets/v1/snippets' and
            body=={'name':NAME,'code':PHP_CODE,'scope':'global',
                   'active':False,'desc':DESC})
    activate=(method=='POST' and body is None and SNIPPET_ID is not None and
              path==f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate')
    require(get or create or activate,'Forbidden REST operation')
    require(bool(user and password),'Missing WordPress credentials')
    auth=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(API+path,method=method,
        data=json.dumps(body,separators=(',',':')).encode() if body is not None else None,
        headers={'Accept':'application/json','Content-Type':'application/json',
                 'Authorization':'Basic '+auth,'User-Agent':'SolarGrowattIscSafety-OneShot/1.0'})
    if method=='POST':POST_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(750001)
            require(res.url==API+path and res.status in (200,201,204) and
                    len(raw)<=750000,'Unexpected WordPress response identity')
            if res.status==204:return res.status,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress REST response not JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress response ambiguous; no retry') from None

def public(path):
    require(path in ('/','/solarni-sestava-na-chatu/','/vyber-baterii/'),
            'Forbidden public probe path')
    url=SITE+path+'?solar_growatt_safety_probe=20261122'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-cache,no-store',
        'User-Agent':'SolarGrowattIscSafety-GETOnly/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(1500001)
            require(res.url==url and res.status==200 and len(raw)<=1500000 and
                    'text/html' in res.headers.get('Content-Type','').lower(),
                    'Public page response identity changed')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError):
        raise Blocked('Public target unavailable; no write') from None

def check_public(after):
    pages={p:public(p) for p in ('/','/solarni-sestava-na-chatu/','/vyber-baterii/')}
    for path in ('/','/solarni-sestava-na-chatu/'):
        html=pages[path]
        require('x-data="solarExpertBuilder()"' in html and
                'bundle-composer.js' in html and 'solar-expert-bundles' in html,
                'Expected live old-theme Builder or exact bundle source missing')
        # Check actual inline PHP printed the reviewed JS exactly once,
        # not just that the old theme includes a similarly named marker.
        seen=(html.count('__seGrowattPVGuardV1')==2 and
              "pvPurchaseGate='blocked_missing_absolute_pv_isc'" in html and
              "'inverter-growatt-48-6000'" in html and
              "'inverter-growatt-48-3500'" in html)
        require(seen is after,
                'Unexpected Growatt exact reviewed inline guard state on '+path)
    require('__seGrowattPVGuardV1' not in pages['/vyber-baterii/'],
            'Growatt integrated safety inline script leaked to Battery Selector')

def readback(user,password,active):
    require(type(SNIPPET_ID) is int and SNIPPET_ID>0,'Snippet ID not established')
    status,row=wp('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(row,dict) and isinstance(row.get('snippet'),dict):
        row=row['snippet']
    require(status==200 and isinstance(row,dict) and
            row.get('id')==SNIPPET_ID and row.get('name')==NAME and
            row.get('active') is active and row.get('scope')=='global' and
            str(row.get('code','')).strip()==PHP_CODE.strip(),
            'Snippet identity/source/active readback mismatch')

def preflight(user,password):
    check_public(False)
    status,plugins=wp('GET',PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for p in plugins if isinstance(p,dict) and
                str(p.get('plugin','')).startswith('code-snippets/') and
                p.get('status')=='active')==1,
            'Code Snippets plugin not uniquely active')
    status,rows=wp('GET',SNIPPETS,user,password)
    require(status==200 and isinstance(rows,list) and len(rows)<100,
            'Code Snippets inventory unavailable')
    require(not any(isinstance(r,dict) and (
        r.get('name')==NAME or
        'solar_expert_legacy_growatt_isc_guard_v1_enqueue' in str(r.get('code',''))
        ) for r in rows),'Existing Growatt Isc safety snippet or duplicate')
    check_public(False)

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
          'native_post_writes':0,'catalog_writes':0,'affiliate_clicks':0,
          'synthetic_analytics_posts':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_GROWATT_ISC_GUARD_RELEASE status='+status+
          ' posts='+str(POST_ATTEMPTS)+' wordpress_posts=0 theme=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE,'source_blob_sha1':SOURCE_BLOB},
            'One-shot Growatt Isc safety activation not armed')
    preflight(user,password)
    status,item=wp('POST','/code-snippets/v1/snippets',user,password,
        {'name':NAME,'code':PHP_CODE,'scope':'global','active':False,'desc':DESC})
    data=item.get('snippet',item) if isinstance(item,dict) else {}
    require(status in (200,201) and isinstance(data,dict) and
            type(data.get('id')) is int and data['id']>0,
            'Inactive create uncertain, never retry')
    SNIPPET_ID=data['id']
    readback(user,password,False)
    status,_=wp('POST',f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',
                user,password)
    require(status in (200,201,204),'Activation uncertain, never retry')
    readback(user,password,True)
    check_public(True)
    receipt('wp_verified',scoped_live_html_source=True,
            live_browser_proof_after_write_pending=True)

def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        reason=str(exc)
        if not re.match(r'^(One-shot|Existing|Public|Unexpected|Code|Snippet|Forbidden|WordPress|Missing|Inactive|Activation)',reason):
            reason='unknown or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=reason[:130])
        sys.exit(2)

if __name__=='__main__':main()
