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
CONTROL=ROOT/'ops/solar-grid-battery-calculator-paths-release.json'
RECEIPT=ROOT/'artifacts/solar-grid-battery-calculator-paths-release.json'
NAME='Solar Expert grid battery calculator paths v1'
DESC='Four scoped grid FVE buyer paths and calculator links'
MODE='one_reversible_grid_battery_calculator_paths'
SOURCE_BLOB='620f1ab371cbe01afd99d5c90922b9d633928645'
SOURCE_PATH=ROOT/'content/snippets/grid-battery-calculator-paths-v1.php'
PHP_CODE=SOURCE_PATH.read_text(encoding='utf-8')
BYTES=PHP_CODE.encode('utf-8')
BLOB=hashlib.sha1(('blob '+str(len(BYTES))+'\0').encode()+BYTES).hexdigest()
assert BLOB==SOURCE_BLOB,'Source file changed after review'
assert '<?php' not in PHP_CODE and 'add_filter(' in PHP_CODE
MARKER='data-se-grid-battery-path-v1'
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
                 'Authorization':'Basic '+auth,'User-Agent':'SolarGridBatteryCalculatorPaths-OneShot/1.0'})
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
        '/kdy-ma-smysl-fotovoltaika/',
        '/co-je-potreba-k-fotovoltaice/',
        '/kolik-se-usetri-s-fotovoltaikou/',
        '/jak-dlouho-vydrzi-baterie-fotovoltaika/',
        '/kolik-stoji-fotovoltaika/',
        '/solarni-sestava-na-chatu/',
        '/'), 'Forbidden public URL path')
    url=SITE+path+'?solar_grid_battery_calculator_paths_probe=20261128'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-store,no-cache',
        'User-Agent':'SolarGridBatteryCalculatorPaths-GETOnly/1.0'})
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
    marker='data-se-grid-battery-path-v1='
    invest=public('/kdy-ma-smysl-fotovoltaika/')
    components=public('/co-je-potreba-k-fotovoltaice/')
    savings=public('/kolik-se-usetri-s-fotovoltaikou/')
    runtime=public('/jak-dlouho-vydrzi-baterie-fotovoltaika/')
    quote=public('/kolik-stoji-fotovoltaika/')
    for slug,html in (('/kdy-ma-smysl-fotovoltaika/',invest),('/co-je-potreba-k-fotovoltaice/',components),('/kolik-se-usetri-s-fotovoltaikou/',savings),('/jak-dlouho-vydrzi-baterie-fotovoltaika/',runtime),('/kolik-stoji-fotovoltaika/',quote)):
        outer_head=re.search(r'<head(?:\s[^>]*)?>.*?</head\s*>',html,re.I|re.S)
        require(outer_head is not None,'Public document head missing')
        head=inspect_head(outer_head.group(0))
        require(head['canonicals']==[SITE+slug] and len(head['titles'])==1 and not any('noindex' in str(x).lower() for x in head['robots']),'Public canonical/indexability changed: '+slug)
    require(invest.count('id="se-bic-title"')==1 and invest.count('<section data-se-battery-incremental-calc-v1="1"')==1 and quote.count('id="kontrola-domovni-fve"')==1,'Public calculator or quote destination missing')
    require(all(x in invest for x in ('data-se-fve-investment-components-v1="1"','/poptavka')) and 'data-se-fve-investment-components-v1="1"' in components and 'data-se-savings-model-v1="1"' in savings and 'data-se-battery-runtime-v1="1"' in runtime,'Public previous content missing')
    old1='<a class="se-btn" href="/quote-checker/">Zkontrolovat nabídku →</a>'
    old2='<a class="se-btn se-btn-primary" href="/quote-checker/">Zkontrolovat rozsah nabídky →</a>'
    old3='<a href="/quote-checker/">kontrola nabídky</a>'
    if after:
        require(invest.count(marker)==2 and old1 not in invest and old2 not in invest and all(x in invest for x in ('data-se-grid-battery-path-v1="grid-investment" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve"','data-se-grid-battery-path-v1="grid-calculator" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve"')),'Public grid quote corrections missing')
        require(components.count(marker)==1 and old3 not in components and 'href="/quote-checker/">kontrola ostrovní sestavy' in components and 'data-se-grid-battery-path-v1="grid-components" href="/kolik-stoji-fotovoltaika/#kontrola-domovni-fve"' in components,'Public component guide route missing')
        require(savings.count(marker)==1 and 'data-se-grid-battery-path-v1="savings"' in savings and '3 500 Kč' in savings and 'href="/kdy-ma-smysl-fotovoltaika/#se-bic-title"' in savings,'Public savings calculator link missing')
        require(runtime.count(marker)==1 and 'data-se-grid-battery-path-v1="runtime"' in runtime and '1 750 Kč' in runtime and '22,9 roku' in runtime and 'href="/kdy-ma-smysl-fotovoltaika/#se-bic-title"' in runtime,'Public runtime calculator link missing')
    else:
        require(all(marker not in x for x in (invest,components,savings,runtime)) and invest.count(old1)==1 and invest.count(old2)==1 and components.count(old3)==1,'Existing exact CTA or duplicate changed')
        require(len(re.findall(r'<h3(?:\s[^>]*)?>\s*Výpočet úspor\s*</h3>',savings,re.I))==1 and len(re.findall(r'<h3(?:\s[^>]*)?>\s*Časté dotazy\s*</h3>',runtime,re.I))==1,'Existing article anchors changed')
    require(all(marker not in x for x in (quote,public('/'),public('/solarni-sestava-na-chatu/'))),'Public buyer routing leaked outside scope')

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
        'solar_expert_grid_battery_calculator_paths_v1' in str(r.get('code',''))
        ) for r in rows),'Existing grid battery calculator paths snippet or duplicate')
    check_public(False)

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
          'native_post_writes':0,'catalog_writes':0,'affiliate_clicks':0,
          'synthetic_analytics_posts':0,**fields}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_GRID_BATTERY_CALCULATOR_PATHS_RELEASE status='+status+
          ' posts='+str(POST_ATTEMPTS)+' wordpress_posts=0 theme=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE,'source_blob_sha1':SOURCE_BLOB},
            'One-shot grid battery calculator paths activation not armed')
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
            five_scoped_routes_verified=True,prior_buyer_guides_retained=True,canonical_verified=True)

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
