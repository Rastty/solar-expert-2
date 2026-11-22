#!/usr/bin/env python3
"""One-source-locked, reversible WordPress Code Snippets overlay for Alpine catalog init.

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
CONTROL=ROOT/'ops/solar-catalog-single-init-release.json'
RECEIPT=ROOT/'artifacts/solar-catalog-single-init-release.json'
NAME='Solar Expert native Alpine single catalog init v1'
DESC='Scoped reversible removal of redundant x-init, original catalog and electrical engine untouched'
MODE='single_reversible_catalog_alpine_auto_init'
SOURCE_BLOB='6e67b7e386e27a5ecefd9e4eb19a6026caea8280'
JS=(ROOT/'assets/js/catalog-alpine-single-init.js').read_text(encoding='utf-8')
BYTES=JS.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SOURCE_BLOB,'Source file no longer matches reviewed immutable Git blob'
assert 'SOLAR_CATALOG_SINGLE_INIT_V1' not in JS
PHP_CODE="""/**
 * Scoped to five existing tool routes. Inject before pinned Alpine runtime
 * initializes. Do NOT modify theme, catalog JSON, seller links or sizes.
 */
function solar_expert_catalog_alpine_single_init_v1_enqueue() {
    if (is_admin() ||
        !(is_front_page() || is_page('solarni-sestava-na-chatu') ||
          is_page('vyber-baterii') || is_page('mppt-kalkulacka') ||
          is_page('vyber-menice')) ||
        !wp_script_is('alpine','enqueued')) return;
    $js = <<<'SOLAR_CATALOG_SINGLE_INIT_V1'
""" + JS + """
SOLAR_CATALOG_SINGLE_INIT_V1;
    wp_add_inline_script('alpine', $js, 'before');
}
add_action('wp_enqueue_scripts','solar_expert_catalog_alpine_single_init_v1_enqueue',99999);
"""
MARKER='data-se-native-init-only'
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
                 'Authorization':'Basic '+auth,'User-Agent':'SolarCatalogAlpineSingleInit-OneShot/1.0'})
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
    valid=('/','/solarni-sestava-na-chatu/','/vyber-baterii/',
           '/mppt-kalkulacka/','/vyber-menice/')
    require(path in valid,'Forbidden public probe path')
    url=SITE+path+'?solar_catalog_single_init_probe=20261122'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-cache,no-store',
        'User-Agent':'SolarCatalogAlpineSingleInit-GETOnly/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(1500001)
            require(res.url==url and res.status==200 and len(raw)<=1500000 and
                    'text/html' in res.headers.get('Content-Type','').lower(),
                    'Public tool response identity changed')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError):
        raise Blocked('Public tool unavailable; no write') from None

def check_public(after):
    targets={
       '/':'solarExpertBuilder()',
       '/solarni-sestava-na-chatu/':'solarExpertBuilder()',
       '/vyber-baterii/':'solarExpertBatterySelector()',
       '/mppt-kalkulacka/':'solarExpertMpptSelector()',
       '/vyber-menice/':'solarExpertInverterSelector()'}
    pages={p:public(p) for p in targets}
    for path,factory in targets.items():
        html=pages[path]
        require(('x-data="'+factory+'"') in html and
                'x-init="init()"' in html and
                'alpine' in html.lower(),
                'Existing Alpine catalog tool expected DOM absent on '+path)
        seen=(MARKER in html and "document.addEventListener('alpine:init'" in html and
              'solarExpertBatterySelector()' in html)
        require(seen is after,'Unexpected native-single-init HTML source status on '+path)

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
        'solar_expert_catalog_alpine_single_init_v1_enqueue' in str(r.get('code',''))
        ) for r in rows),'Existing catalog single-init snippet or duplicate')
    check_public(False)

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
          'native_post_writes':0,'catalog_writes':0,'affiliate_clicks':0,
          'synthetic_analytics_posts':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_ALPINE_CATALOG_SINGLE_INIT_RELEASE status='+status+
          ' posts='+str(POST_ATTEMPTS)+' wordpress_posts=0 theme=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE,'source_blob_sha1':SOURCE_BLOB},
            'One-shot catalog single-init activation not armed')
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
