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
from urllib.parse import urlparse,parse_qs
from html.parser import HTMLParser
from scripts.solar_gsc_direct_rest_preflight import NoRedirect
from scripts.solar_serp_boundary_release import inspect_head

ROOT=Path(__file__).resolve().parents[1]
SITE='https://solar-expert.cz'
API=SITE+'/wp-json'
SNIPPETS='/code-snippets/v1/snippets?context=edit&per_page=100'
PLUGINS='/wp/v2/plugins?context=edit&per_page=100'
CONTROL=ROOT/'ops/solar-qualified-kit-entry-release.json'
RECEIPT=ROOT/'artifacts/solar-qualified-kit-entry-release.json'
NAME='Solar Expert qualified kit entry v1'
DESC='Three contextual pathways from existing guides to live buying offers'
MODE='one_reversible_qualified_kit_entry'
SOURCE_BLOB='4ce40fb242ce52a32e08a2d0fed76ce7321d0e94'
SOURCE_PATH=ROOT/'content/snippets/qualified-kit-entry-v1.php'
PHP_CODE=SOURCE_PATH.read_text(encoding='utf-8')
BYTES=PHP_CODE.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SOURCE_BLOB,'Source file changed after review'
assert '<?php' not in PHP_CODE and 'add_filter(' in PHP_CODE
MARKER='data-se-qualified-kit-entry-v1'
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
                 'Authorization':'Basic '+auth,'User-Agent':'SolarQualifiedKitEntry-OneShot/1.0'})
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
        '/sady-pro-solarni-napajeni-kompletni-pruvodce/',
        '/jak-vybrat-mppt-regulator-pro-400w-panel/',
        '/co-je-1-kwp/',
        '/solarni-sestava-na-chatu-pro-lednici/',
        '/solarni-panel-do-garaze-bez-elektriny/',
        '/solarni-sestava-na-chatu/',
        '/'), 'Forbidden public URL path')
    url=SITE+path+'?solar_qualified_kit_entry_probe=20261128'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-store,no-cache',
        'User-Agent':'SolarQualifiedKitEntry-GETOnly/1.0'})
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
    marker='data-se-qualified-kit-entry-v1="1"'
    kit='/sady-pro-solarni-napajeni-kompletni-pruvodce/'
    mppt='/jak-vybrat-mppt-regulator-pro-400w-panel/'
    targets={kit:'se-complete-kit-offers-title',mppt:'se-mppt-offer-title'}
    for path,anchor in targets.items():
        html=public(path)
        require(html.count('id="'+anchor+'"')==1 and marker not in html,
                'Public target anchor missing or duplicate')
        require('data-se-monetized="true"' in html,'Public monetized target absent')
    rows=(
        ('/co-je-1-kwp/',r'Je 1 kWp dost pro chatu\?', 'data-se-kwp-cabin-balance="v1"', 'Kupujete sestavu kolem 1 kWp?', '4,17 kWh', kit+'#se-complete-kit-offers-title','/solarni-sestava-na-chatu/'),
        ('/solarni-sestava-na-chatu-pro-lednici/',r'Kolik solárních panelů na lednici na chatě', 'data-se-fridge-real-budget-v1="1"', 'Koupit celou sestavu, nebo jen doplnit baterii?', '2,2 dne', kit+'#se-complete-kit-offers-title','/vyber-baterii/'),
        ('/solarni-panel-do-garaze-bez-elektriny/',r'Co koupit až po ověření spotřeby', None,'Co koupit pro garáž: malý DC systém, nebo celou sestavu?', '1,30 kWh',mppt+'#se-mppt-offer-title',kit+'#se-complete-kit-offers-title')
    )
    for slug,heading,prior,title,model,target,secondary in rows:
        html=public(slug)
        head_match=re.search(r'<head(?:\s[^>]*)?>.*?</head\s*>',html,re.I|re.S)
        require(head_match is not None,'Public document head missing')
        head=inspect_head(head_match.group(0))
        require(head['canonicals']==[SITE+slug] and len(head['titles'])==1 and
                not any('noindex' in str(x).lower() for x in head['robots']),
                'Public article canonical/indexability changed')
        require(len(re.findall(r'<h2(?:\s[^>]*)?>\s*'+heading+r'\s*</h2>',html,re.I))==1,
                'Public source article anchor drift: '+slug)
        if prior:
            require(html.count(prior)==1,'Public existing educational guide missing: '+slug)
        if after:
            require(html.count(marker)==1 and title in html and model in html and
                    'href="'+target+'"' in html and 'href="'+secondary+'"' in html,
                    'Public contextual entry missing: '+slug)
        else:
            require(marker not in html,'Public duplicate entry: '+slug)
    require(marker not in public('/') and marker not in public('/solarni-sestava-na-chatu/'),
            'Public content leaked outside reviewed scope')
    print('Public three source articles and two monetized destination anchors verified; no affiliate navigation')

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
        'solar_expert_qualified_kit_entry_v1' in str(r.get('code',''))
        ) for r in rows),'Existing qualified kit entry snippet or duplicate')
    check_public(False)

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
          'native_post_writes':0,'catalog_writes':0,'affiliate_clicks':0,
          'synthetic_analytics_posts':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_QUALIFIED_KIT_ENTRY_RELEASE status='+status+
          ' posts='+str(POST_ATTEMPTS)+' wordpress_posts=0 theme=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE,'source_blob_sha1':SOURCE_BLOB},
            'One-shot qualified kit entry activation not armed')
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
            three_contextual_entries_verified=True,two_monetized_target_anchors_verified=True,canonical_verified=True)

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
