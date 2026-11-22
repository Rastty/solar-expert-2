#!/usr/bin/env python3
"""Repair ONLY existing active Code Snippet #14 using one source-locked REST PUT.

Previous one-shot CTA create+activate performed exactly two writes but failed
public readback: WP #310 raw post body has no E.ON merchant URL; an independent
later render layer adds the old lower E.ON link. No duplicate snippet, no POST
retry, no theme/catalog/editorial changes, no fake affiliate clicks.
"""
from __future__ import annotations
import base64
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib import request,error
from scripts.solar_gsc_direct_rest_preflight import NoRedirect
from scripts import solar_heatpump_airwater_intro_release as old

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-heatpump-airwater-intro-repair.json'
RECEIPT=ROOT/'artifacts/solar-heatpump-airwater-intro-repair.json'
CODE=(ROOT/'content/snippets/heatpump-airwater-intro-eon-v2.php').read_text(encoding='utf-8')
SRC_SHA='43fb1ab3a9e8491d5ff4d029444d966d8e68c843'
BYTES=CODE.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SRC_SHA,'v2 source changed after review'
assert old.BLOB=='c15f73fd1dabb14e3c43c37d13f4318015dfd19b','v1 original source changed'
SNIPPET_ID=14
POST_ID=310
SLUG='tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji'
WP_MODIFIED='2026-10-07T11:20:08'
MODE='one_existing_heatpump_intro_snippet14_put'
URI=f'/code-snippets/v1/snippets/{SNIPPET_ID}'
ARTICLE='/wp/v2/posts?slug='+SLUG+'&context=edit&per_page=2&_fields=id,slug,status,type,content,modified_gmt'
PUTS=0

class Blocked(RuntimeError): pass
def require(ok,msg):
    if not ok:raise Blocked(msg)

def api(method,path,user,pwd,body=None):
    global PUTS
    get=method=='GET' and body is None and path in (URI,ARTICLE)
    expected={'name':old.NAME,'code':CODE,'scope':'global',
              'active':True,'desc':old.DESC}
    put=method=='PUT' and path==URI and body==expected
    require(get or put,'Forbidden WP method/path/body')
    require(bool(user and pwd),'Missing WP credentials')
    headers={'Accept':'application/json','Content-Type':'application/json',
        'Authorization':'Basic '+base64.b64encode((user+':'+pwd).encode()).decode(),
        'User-Agent':'SolarHeatpumpIntro-InPlaceCAS/1.0'}
    req=request.Request(old.API+path,method=method,headers=headers,
        data=json.dumps(body,separators=(',',':')).encode() if body is not None else None)
    if method=='PUT':PUTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(750001)
            require(res.status in (200,201,204) and res.url==old.API+path and
                    len(raw)<=750000,'WordPress REST response identity changed')
            if res.status==204:return res.status,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress REST did not return JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress response ambiguous; no retry') from None

def get_snippet(user,pwd,code):
    status,item=api('GET',URI,user,pwd)
    if isinstance(item,dict) and isinstance(item.get('snippet'),dict):
        item=item['snippet']
    require(status==200 and isinstance(item,dict) and
        item.get('id')==SNIPPET_ID and item.get('name')==old.NAME and
        item.get('scope')=='global' and item.get('active') is True and
        str(item.get('code','')).strip()==code.strip() and
        item.get('desc')==old.DESC,
        'Current exact active WP #14 snippet source/identity differs; stop')
    return item

def get_article(user,pwd):
    status,items=api('GET',ARTICLE,user,pwd)
    require(status==200 and isinstance(items,list) and len(items)==1,
            'WordPress air-water post not unique; stop')
    item=items[0]
    raw=(item.get('content') or {}).get('raw','')
    require(item.get('id')==POST_ID and item.get('slug')==SLUG and
        item.get('status')=='publish' and item.get('type')=='post' and
        item.get('modified_gmt')==WP_MODIFIED and isinstance(raw,str) and
        '</p>' in raw and
        'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/' not in raw and
        'data-se-heatpump-intro-offer="v1"' not in raw,
        'Exact WP #310 raw post or CAS modified_gmt changed; stop')

def receipt(status,**details):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
       'put_attempts':PUTS,'new_snippets':0,'native_post_writes':0,
       'theme_deployed':False,'catalog_writes':0,'affiliate_clicks':0,
       'approved_commissions':'unknown',**details}
    RECEIPT.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('SOLAR_HEATPUMP_INTRO_REPAIR status='+status+
          ' put_attempts='+str(PUTS)+' new_snippets=0 wp_posts=0')

def execute(user,pwd):
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
            'mode':MODE,'old_source_blob_sha1':old.BLOB,
            'new_source_blob_sha1':SRC_SHA,'snippet_id':SNIPPET_ID,
            'wp_post_id':POST_ID,'wp_modified_gmt':WP_MODIFIED},
            'One-PUT repair not armed')
    get_article(user,pwd)
    get_snippet(user,pwd,old.PHP_CODE)
    old.check_public(False)
    get_article(user,pwd)
    get_snippet(user,pwd,old.PHP_CODE)
    status,_=api('PUT',URI,user,pwd,
      {'name':old.NAME,'code':CODE,'scope':'global',
       'active':True,'desc':old.DESC})
    require(status in (200,201,204),'WordPress update returned unknown status; never retry')
    get_snippet(user,pwd,CODE)
    get_article(user,pwd)
    old.check_public(True)
    receipt('wp_verified',exact_existing_snippet_updated=True,
        public_intro_cta_one=True,other_pages_unmodified=True,
        source_proven_active=True)
def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        why=str(exc)
        if not why.startswith(('One-PUT','Exact','Current','WordPress',
            'Missing','Forbidden','Public','Unexpected')):
            why='unknown or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=why[:140])
        sys.exit(2)
if __name__=='__main__':main()
