#!/usr/bin/env python3
"""Exact one-PUT upgrade of the EXISTING active Builder recovery snippet.

The shipped snippet already handles /solarni-sestava-na-chatu/, but the same
working Builder is embedded in the much more commercially important homepage.
Broaden ONLY the guard to is_front_page(); unchanged JS, no new Code Snippets,
post, theme, catalog, merchant tracking, price, or electrical changes.
One source-locked PUT after authenticated/anonymous read-only preconditions.
Never retry if the PUT outcome is ambiguous.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import error,request

from scripts import solar_builder_recovery_release as first
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

SITE=first.SITE
ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-builder-home-recovery-release.json'
RECEIPT=ROOT/'artifacts/solar-builder-home-recovery-release.json'
OLD_FRAGMENT="if (is_admin() || !is_page('solarni-sestava-na-chatu') ||"
NEW_FRAGMENT="if (is_admin() || !(is_front_page() || is_page('solarni-sestava-na-chatu')) ||"
assert first.PHP_CODE.count(OLD_FRAGMENT)==1, "Old Builder recovery scope has drifted"
CODE=first.PHP_CODE.replace(OLD_FRAGMENT,NEW_FRAGMENT)
assert CODE.count(NEW_FRAGMENT)==1 and CODE.count(first.JS_MARKER)>=1
SNIPPET_ID=None
PUT_ATTEMPTS=0

class Blocked(RuntimeError): pass

def require(ok,reason):
    if not ok:raise Blocked(reason)

def public_home():
    url=SITE+'/?solar_builder_home_recovery_probe=v1'
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-cache,no-store',
        'User-Agent':'SolarBuilderHomeRepair-GET/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(1000001)
            require(res.status==200 and res.url==url and len(raw)<=1000000,
                    'Homepage HTTP response not an exact 200')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError):
        raise Blocked('Homepage GET unavailable; no write') from None

def wp_get(user,password,path):
    require(path in (first.PLUGINS,first.SNIPPETS) or
            (SNIPPET_ID is not None and path==f'/code-snippets/v1/snippets/{SNIPPET_ID}'),
            'Unapproved GET identity')
    headers={'Accept':'application/json','Authorization':'Basic '+
       base64.b64encode((user+':'+password).encode()).decode(),
       'User-Agent':'SolarBuilderHomeRepair-GET/1.0'}
    req=request.Request(first.API+path,method='GET',headers=headers)
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(650001)
            require(res.status==200 and res.url==first.API+path and
                    len(raw)<=650000 and
                    'application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress GET identity/content-type mismatch')
            return json.loads(raw)
    except (error.HTTPError,error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress GET unavailable; no write') from None

def snippet_row(user,password,source):
    item=wp_get(user,password,f'/code-snippets/v1/snippets/{SNIPPET_ID}')
    if isinstance(item,dict) and isinstance(item.get('snippet'),dict):
        item=item['snippet']
    require(isinstance(item,dict) and item.get('id')==SNIPPET_ID and
            item.get('name')==first.NAME and item.get('active') is True and
            item.get('scope')=='global' and
            str(item.get('code','')).strip()==source.strip(),
            'Existing Code Snippet exact identity/source/active not verified')

def public_before():
    builder=first.public_html(first.BUILDER+'?solar_builder_home_repair=before')
    battery=first.public_html(first.BATTERY+'?solar_builder_home_repair=before')
    home=public_home()
    require(builder.count('se-builder-recovery-note')==1 and
            '/vyber-baterii/?scenario=panel400' in builder,
            'Previously deployed Builder page recovery is not exact')
    require('se-builder-recovery-note' not in battery and
            'se-builder-recovery-note' not in home,
            'Before-state scope differs: homepage may already have recovery')

def public_after():
    builder=first.public_html(first.BUILDER+'?solar_builder_home_repair=after')
    battery=first.public_html(first.BATTERY+'?solar_builder_home_repair=after')
    home=public_home()
    require(builder.count('se-builder-recovery-note')==1 and
            home.count('se-builder-recovery-note')==1 and
            '/vyber-baterii/?scenario=panel400' in home and
            'solar-expert-builder' in home,
            'Homepage and Builder exact scoped recovery script readback failed')
    require('se-builder-recovery-note' not in battery,
            'Recovery unexpectedly injected into Battery Selector')

def preflight(user,password):
    global SNIPPET_ID
    first.baseline(user,password)
    public_before()
    plugins=wp_get(user,password,first.PLUGINS)
    require(isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for p in plugins if isinstance(p,dict) and
                    str(p.get('plugin','')).startswith('code-snippets/') and
                    p.get('status')=='active')==1,
            'Code Snippets plugin not uniquely active')
    items=wp_get(user,password,first.SNIPPETS)
    require(isinstance(items,list) and len(items)<100,
            'Code Snippets inventory incomplete')
    matches=[p for p in items if isinstance(p,dict) and p.get('name')==first.NAME]
    require(len(matches)==1 and type(matches[0].get('id')) is int and
            matches[0].get('active') is True and
            matches[0].get('scope')=='global' and
            str(matches[0].get('code','')).strip()==first.PHP_CODE.strip(),
            'Single old Builder recovery snippet code/scope/active drifted')
    SNIPPET_ID=matches[0]['id']
    snippet_row(user,password,first.PHP_CODE)
    public_before()

def one_put(user,password):
    global PUT_ATTEMPTS
    require(type(SNIPPET_ID) is int and SNIPPET_ID>0,'Missing exact snippet ID')
    path=f'/code-snippets/v1/snippets/{SNIPPET_ID}'
    payload={'name':first.NAME,'code':CODE,'scope':'global','active':True,
             'desc':first.DESCRIPTION}
    token=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(first.API+path,method='PUT',
      data=json.dumps(payload,separators=(',',':')).encode(),
      headers={'Accept':'application/json','Content-Type':'application/json',
        'Authorization':'Basic '+token,
        'User-Agent':'SolarBuilderHomeRepair-OnePUT/1.0'})
    PUT_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(650001)
            require(res.status in (200,201,204) and res.url==first.API+path and
                    len(raw)<=650000,'WordPress PUT response identity/length ambiguous')
            if res.status!=204:
                require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress PUT returned non-JSON')
                json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress PUT HTTP '+str(exc.code)+'; never auto-retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress PUT response uncertain; never auto-retry') from None

def receipt(status,**kwargs):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
          'put_attempts':PUT_ATTEMPTS,'theme_deployed':False,
          'managed_post_writes':0,'wpvibe_calls':0,'affiliate_clicks':0,**kwargs}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n','utf-8')
    print('SOLAR_BUILDER_HOME_RECOVERY status='+status+' put_attempts='+
          str(PUT_ATTEMPTS)+' wpvibe=0 theme_deployed=false')

def execute(user,password):
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':'one_inplace_builder_recovery_homepage_scope'},
            'Homepage recovery scope release control not armed')
    require(bool(user and password),'Missing WordPress credentials')
    preflight(user,password)
    one_put(user,password)
    snippet_row(user,password,CODE)
    public_after()
    first.baseline(user,password)
    receipt('wp_verified',existing_snippet_updated=True,
            exact_public_pages=2,battery_page_untouched=True,
            homepage_browser_visibility_not_yet_proved=True)

def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        reason=str(exc)
        if not re.match(r'^(Homepage|Existing|WordPress|Single|Code|Recovery|Before|Previously|Missing|Unapproved)',reason):
            reason='unknown or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=reason[:135])
        sys.exit(2)

if __name__=='__main__':main()
