#!/usr/bin/env python3
"""Exact reversible Code Snippets bridge: three indexed off-grid tools → Quote Checker.
GitHub Actions → WordPress Application Password REST, no WPVibe or theme mutation.
Unknown POST results are never retried automatically.
"""
from __future__ import annotations
import base64
import json
import os
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib import error, request
from scripts.solar_gsc_verification_check import URL as SITE
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-quote-bridge-release.json'
RECEIPT=ROOT/'artifacts/solar-quote-bridge-receipt.json'
NAME='Solar Expert indexed selectors to Quote Checker (v1)'
DESC='One relevant off-grid quote-check link from three indexed tool pages.'
PAGES=('vyber-baterii','vyber-menice','mppt-kalkulacka')
API=SITE.rstrip('/')+'/wp-json'
PLUGINS='/wp/v2/plugins?context=edit&per_page=100'
LIST='/code-snippets/v1/snippets?context=edit&per_page=100'
PHP_CODE="""add_filter('the_content', static function ($html) {
    if (is_admin() || !is_singular('page') || !in_the_loop() || !is_main_query()) {
        return $html;
    }
    $slug = get_post_field('post_name', get_the_ID());
    if (!in_array($slug, array('vyber-baterii','vyber-menice','mppt-kalkulacka'), true)) {
        return $html;
    }
    if (strpos($html, '/quote-checker/') !== false) {
        return $html;
    }
    $url = esc_url(home_url('/quote-checker/'));
    return $html . '<aside class="se-note" data-solar-quote-bridge="v1">'
        . '<strong>Máte konkrétní nabídku na ostrovní nebo záložní fotovoltaiku?</strong> '
        . 'Před nákupem si ověřte její základní parametry pomocí '
        . '<a href="' . $url . '">Quote Checkeru</a>. '
        . 'Nástroj nenahrazuje projekt, elektrickou revizi ani posouzení síťové FVE.'
        . '</aside>';
}, 80);
"""
POSTS_ATTEMPTED=0
SNIPPET_ID=None
class Blocked(RuntimeError): pass
def require(condition,reason):
    if not condition: raise Blocked(reason)

def rest(method,path,user,password,body=None):
    global POSTS_ATTEMPTED
    allowed_get=path in (PLUGINS,LIST) or re.fullmatch(r'/code-snippets/v1/snippets/[1-9][0-9]*',path)
    allowed_create=path=='/code-snippets/v1/snippets' and body=={
       'name':NAME,'code':PHP_CODE,'scope':'global','active':False,'desc':DESC}
    allowed_activate=SNIPPET_ID is not None and path==f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate' and body is None
    require((method=='GET' and allowed_get and body is None) or
            (method=='POST' and (allowed_create or allowed_activate)),
            'Unapproved REST method or payload')
    require(bool(user and password),'Missing application credentials')
    basic=base64.b64encode(f'{user}:{password}'.encode()).decode()
    req=request.Request(API+path,method=method,
         data=json.dumps(body,separators=(',',':')).encode() if body is not None else None,
         headers={'Authorization':'Basic '+basic,'Accept':'application/json',
                  'Content-Type':'application/json','User-Agent':'SolarQuoteBridge-GitHub-OneShot/1.0'})
    if method=='POST': POSTS_ATTEMPTED+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(700001)
            require(res.status in (200,201,204) and len(raw)<=700000,'Malformed REST response')
            if res.status==204:return res.status,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),'REST not JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)) from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress REST result uncertain; no retry') from None

def public_html(slug):
    require(slug in PAGES,'Unapproved page')
    url=SITE+slug+'/'
    req=request.Request(url,method='GET',headers={'Accept':'text/html',
        'User-Agent':'SolarQuoteBridge-Public-Readback/1.0','Cache-Control':'no-cache'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            require(res.status==200 and res.url==url,'Public URL identity changed')
            require('text/html' in res.headers.get('Content-Type','').lower(),'Public response not HTML')
            raw=res.read(1500001)
            require(len(raw)<=1500000,'Public response oversized')
            return raw.decode('utf-8',errors='replace')
    except (error.HTTPError,error.URLError,OSError,ValueError):
        raise Blocked('Public read unavailable') from None

class Count(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.markers=0;self.links=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='aside' and a.get('data-solar-quote-bridge')=='v1':self.markers+=1
        if tag=='a' and a.get('href') in ('/quote-checker/',SITE+'quote-checker/'):self.links+=1

def links(html):
    x=Count();x.feed(html);return {'markers':x.markers,'quote_links':x.links}

def existing(user,password):
    st,plugins=rest('GET',PLUGINS,user,password)
    require(st==200 and isinstance(plugins,list) and sum(
        1 for x in plugins if isinstance(x,dict) and
        str(x.get('plugin','')).startswith('code-snippets/') and x.get('status')=='active')==1,
        'Code Snippets plugin not uniquely active')
    st,rows=rest('GET',LIST,user,password)
    require(st==200 and isinstance(rows,list) and len(rows)<100,'Snippet inventory incomplete')
    for x in rows:
        require(isinstance(x,dict),'Snippet identity unverified')
        require(x.get('name')!=NAME and 'data-solar-quote-bridge' not in str(x.get('code','')),
                'Existing quote bridge; no duplicate')

def readback(user,password,identifier,active):
    st,row=rest('GET',f'/code-snippets/v1/snippets/{identifier}',user,password)
    if isinstance(row,dict) and isinstance(row.get('snippet'),dict):row=row['snippet']
    require(st==200 and isinstance(row,dict) and
            row.get('id')==identifier and row.get('name')==NAME and
            str(row.get('code','')).strip()==PHP_CODE.strip() and row.get('active') is active,
            'Snippet identity/code/status drift')

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POSTS_ATTEMPTED,'wpvibe_calls':0,
          'theme_deployed':False,'word_press_content_writes':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_QUOTE_BRIDGE status='+status+' post_attempts='+str(POSTS_ATTEMPTED)+' wpvibe=0')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,'mode':'one_quote_checker_indexed_tool_bridge'},
            'Release control mismatch')
    require(all(links(public_html(slug))['markers']==0 for slug in PAGES),
            'Existing public quote bridge marker')
    existing(user,password)
    payload={'name':NAME,'code':PHP_CODE,'scope':'global','active':False,'desc':DESC}
    st,row=rest('POST','/code-snippets/v1/snippets',user,password,payload)
    item=row.get('snippet',row) if isinstance(row,dict) else None
    require(st in (200,201) and isinstance(item,dict) and type(item.get('id')) is int and item['id']>0,
            'Snippet creation response unverified; no retry')
    SNIPPET_ID=item['id']
    readback(user,password,SNIPPET_ID,False)
    require(all(links(public_html(slug))['markers']==0 for slug in PAGES),
            'Concurrent quote bridge appeared; leave snippet inactive')
    st,_=rest('POST',f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',user,password)
    require(st in (200,201,204),'Activation response unverified; no retry')
    readback(user,password,SNIPPET_ID,True)
    measured={slug:links(public_html(slug)) for slug in PAGES}
    require(all(v['markers']==1 and v['quote_links']>=1 for v in measured.values()),
            'Snippet active but not independently verified in public HTML')
    receipt('wp_verified',target_count=3,public_link_counts=measured)

def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,TypeError,ValueError,KeyError) as exc:
        # Only fixed local error strings, never provider response bodies, tokens or user IDs.
        reason=str(exc)
        if not re.match(r'^(Release|Existing|Snippet|WordPress|Code|Malformed|REST|Public|Concurrent|Unapproved|Missing|Activation)',reason):
            reason='unverified prerequisite'
        receipt('blocked_no_retry',reason=reason[:130])
        sys.exit(2)
if __name__=='__main__':main()
