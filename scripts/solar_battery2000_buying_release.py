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
CONTROL=ROOT/'ops/solar-battery2000-buying-release.json'
RECEIPT=ROOT/'artifacts/solar-battery2000-buying-release.json'
NAME='Solar Expert battery2000 buying v1'
DESC='2kW battery bank and inverter affiliate buying path'
MODE='one_reversible_battery2000_buying'
SOURCE_BLOB='9ab9184d6a55c7b44aec25fb08d0c06e15076584'
SOURCE_PATH=ROOT/'content/snippets/battery2000-buying-v1.php'
PHP_CODE=SOURCE_PATH.read_text(encoding='utf-8')
BYTES=PHP_CODE.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SOURCE_BLOB,'Source file changed after review'
assert '<?php' not in PHP_CODE and 'add_filter(' in PHP_CODE
MARKER='data-se-battery2000-buying-v1'
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
                 'Authorization':'Basic '+auth,'User-Agent':'SolarBattery2000Buying-OneShot/1.0'})
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
        '/jakou-baterii-k-menici-2000w/',
        '/solarni-sestava-na-chatu/',
        '/'), 'Forbidden public URL path')
    url=SITE+path+'?solar_battery2000_buying_probe=20261128'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-store,no-cache',
        'User-Agent':'SolarBattery2000Buying-GETOnly/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(1500001)
            require(res.status==200 and res.url==url and len(raw)<=1500000 and
                    'text/html' in res.headers.get('Content-Type','').lower(),
                    'Public article HTTP/identity changed')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError):
        raise Blocked('Public article unavailable; no write') from None

class OfferParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a' and a.get('data-se-placement')=='battery2000_editorial_buying':
            self.links.append(a)

def check_public(after):
    slug='/jakou-baterii-k-menici-2000w/'
    html=public(slug)
    home=public('/')
    builder=public('/solarni-sestava-na-chatu/')
    outer_head=re.search(r'<head(?:\s[^>]*)?>.*?</head\s*>',html,re.I|re.S)
    require(outer_head is not None,'Public document head missing')
    head=inspect_head(outer_head.group(0))
    require(head['canonicals']==[SITE+slug] and len(head['titles'])==1 and
            not any('noindex' in str(x).lower() for x in head['robots']),
            'Public article canonical/indexability changed')
    marker='data-se-battery2000-buying-v1="1"'
    require(all(x in html for x in ('/vyber-baterii/','/mppt-kalkulacka/','/vyber-menice/')),
            'Public original buyer links missing')
    if after:
        require(html.count(marker)==1 and all(x in html for x in ('52 605 Kč','59 180 Kč','7,68 kWh','10,24 kWh','106,8 A','53,4 A','35,6 A','26,7 A','2,76 h','3,69 h','041039621','041039692','8595118839052','2000 VA není automaticky 2000 W','Manuál V1.0','Manuál V1.1','se-battery2000-buying-click-v1','/zalozni-zdroj-pro-obehove-cerpadlo/#se-heating-ups-offer-title')),
                'Public 2kW buying comparison missing')
        parser=OfferParser()
        parser.feed(html)
        expected={'epever-24v-100ah':'https://www.vselektro.eu/lifepo4-baterie-24v-100ah-epever-lfp2-56kwh25-6v-p65l2ev50/',
                  'epever-51v-100ah':'https://www.vselektro.eu/lifepo4-pack-51-2v-100ah-epever-lfp5-12kwh51-2v/',
                  'inverter-carspa-p2000u-24':'https://www.vselektro.eu/menic-napeti-carspa-p2000-24v-230v-2000w-sinus-usb/'}
        require(len(parser.links)==3 and {a.get('data-se-product-id') for a in parser.links}==set(expected),'Public offer identity changed')
        for a in parser.links:
            u=urlparse(a.get('href','')); q=parse_qs(u.query)
            require(u.scheme=='https' and u.netloc=='ehub.cz' and u.path=='/system/scripts/click.php' and
                    q.get('desturl')==[expected[a['data-se-product-id']]] and
                    len(q.get('a_aid',[]))==1 and len(q.get('a_bid',[]))==1 and
                    a.get('data-se-merchant')=='vselektro-eu' and a.get('data-se-monetized')=='true' and
                    'sponsored' in a.get('rel','').split(),
                    'Public configured affiliate destination mismatch')
        print('Public three eHub destinations parsed without navigation or identifiers logged')
    else:
        require(marker not in html and len(re.findall(r'<h2(?:\s[^>]*)?>\s*Chcete přidat solární panely\? Kontrolujte MPPT zvlášť\s*</h2>',html,re.I))==1,
                'Existing exact article anchor changed or duplicate')
        require('affiliateBases' in html and 'vselektro-eu' in html,'Public affiliate runtime configuration missing')
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
        'solar_expert_battery2000_buying_v1' in str(r.get('code',''))
        ) for r in rows),'Existing battery2000 buying snippet or duplicate')
    check_public(False)

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
          'native_post_writes':0,'catalog_writes':0,'affiliate_clicks':0,
          'synthetic_analytics_posts':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_BATTERY2000_BUYING_RELEASE status='+status+
          ' posts='+str(POST_ATTEMPTS)+' wordpress_posts=0 theme=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE,'source_blob_sha1':SOURCE_BLOB},
            'One-shot battery2000 buying activation not armed')
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
            three_affiliate_destinations_verified=True,revision_boundary_verified=True,canonical_verified=True)

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
