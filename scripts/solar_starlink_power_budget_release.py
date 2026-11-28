#!/usr/bin/env python3
"""Source-locked reversible one-article improvement. No post, title or lead mutation."""
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
from scripts.solar_serp_boundary_release import inspect_head

ROOT=Path(__file__).resolve().parents[1]
SITE='https://solar-expert.cz'
API=SITE+'/wp-json'
SNIPPETS='/code-snippets/v1/snippets?context=edit&per_page=100'
PLUGINS='/wp/v2/plugins?context=edit&per_page=100'
CONTROL=ROOT/'ops/solar-starlink-power-budget-release.json'
RECEIPT=ROOT/'artifacts/solar-starlink-power-budget-release.json'
NAME='Solar Expert Starlink power budget v1'
DESC='Starlink Mini portable power and solar recovery buyer comparison'
MODE='one_reversible_starlink_power_budget'
SOURCE_BLOB='e3a3c2f63d83d003098d0b707a1c1c3ddfdb247f'
SOURCE_PATH=ROOT/'content/snippets/starlink-power-budget-v1.php'
PHP_CODE=SOURCE_PATH.read_text(encoding='utf-8')
BYTES=PHP_CODE.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SOURCE_BLOB,'Source file changed after review'
assert '<?php' not in PHP_CODE and 'add_filter(' in PHP_CODE
MARKER='data-se-starlink-power-budget-v1'
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
                 'Authorization':'Basic '+auth,'User-Agent':'SolarStarlinkPowerBudget-OneShot/1.0'})
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
    require(path in (
        '/starlink-mini-na-chate-solarni-panel-baterie-mppt/',
        '/solarni-sestava-na-chatu/',
        '/'), 'Forbidden public URL path')
    url=SITE+path+'?solar_starlink_power_budget_probe=20261128'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-store,no-cache',
        'User-Agent':'SolarStarlinkPowerBudget-GETOnly/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(1500001)
            require(res.status==200 and res.url==url and len(raw)<=1500000 and
                    'text/html' in res.headers.get('Content-Type','').lower(),
                    'Public article HTTP/identity changed')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError):
        raise Blocked('Public article unavailable; no write') from None

def check_public(after):
    slug='/starlink-mini-na-chate-solarni-panel-baterie-mppt/'
    html=public(slug)
    home=public('/')
    builder=public('/solarni-sestava-na-chatu/')
    outer_head=re.search(r'<head(?:\s[^>]*)?>.*?</head\s*>',html,re.I|re.S)
    require(outer_head is not None,'Public document head missing')
    head=inspect_head(outer_head.group(0))
    require(head['canonicals']==[SITE+slug] and len(head['titles'])==1 and
            not any('noindex' in str(x).lower() for x in head['robots']),
            'Public article canonical/indexability changed')
    marker='data-se-starlink-power-budget-v1="1"'
    require(all(x in html for x in ('/vyber-baterii/','/mppt-kalkulacka/','starlink.com/support/')),
            'Public original buyer or source links missing')
    require(len(re.findall(r'<h2(?:\s[^>]*)?>\s*Co konkrétně koupit a co nejprve ověřit\?\s*</h2>',html,re.I))==1,
            'Existing exact article anchor changed or duplicate')
    if after:
        require(html.count(marker)==1 and all(x in html for x in ('99,9 Wh','512 Wh','1 056 Wh','2,7 h','13,7 h','28,2 h','1 656 Wh','23 dní','972 Wh/den','1,7 dne','20 V / 5 A','11–50 V','220 W','/jakou-baterii-k-solarnimu-panelu-400w/#se-battery400-offer-title','/jakou-baterii-a-mppt-k-solarnim-panelum-800w/#se-800wp-offer-title','/sady-pro-solarni-napajeni-kompletni-pruvodce/#se-complete-kit-offers-title','grid-template-columns:repeat(auto-fit')),
                'Public Starlink comparison missing')
    else:
        require(marker not in html,'Existing duplicate article block')
    require(marker not in home and marker not in builder,'Public article content leaked outside reviewed scope')

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
        'solar_expert_starlink_power_budget_v1' in str(r.get('code',''))
        ) for r in rows),'Existing Starlink power budget snippet or duplicate')
    check_public(False)

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
          'native_post_writes':0,'catalog_writes':0,'affiliate_clicks':0,
          'synthetic_analytics_posts':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_STARLINK_POWER_BUDGET_RELEASE status='+status+
          ' posts='+str(POST_ATTEMPTS)+' wordpress_posts=0 theme=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE,'source_blob_sha1':SOURCE_BLOB},
            'One-shot Starlink power budget activation not armed')
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
            starlink_runtime_models_verified=True,original_buyer_links_retained=True,canonical_verified=True)

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
