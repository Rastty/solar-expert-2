#!/usr/bin/env python3
"""Exact in-place, one-PUT repair of an existing active WordPress Code Snippet.

No duplicate snippet, no post/affiliate/theme write, no WPVibe; never retry an
ambiguous write.  The known-good source stays in the GitHub immutable history.
"""
from __future__ import annotations
import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import error, request
from scripts import solar_serp_boundary_release as source
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / 'ops/solar-serp-title-repair-release.json'
RECEIPT = ROOT / 'artifacts/solar-serp-title-repair-receipt.json'
OLD_TITLE = 'Tepelné čerpadlo u souseda: vzdálenost, hluk a pravidla 2026 | Solar Expert'
PATCH = """add_filter('pre_get_document_title', static function ($title) {
    return solar_expert_hp_boundary_serp_v1()
        ? 'Tepelné čerpadlo od hranice pozemku: vzdálenost a hluk 2026' : $title;
}, 99999);
"""
CODE = source.PHP_CODE + PATCH
WRITE_ATTEMPTS = 0
SNIPPET_ID = None

class Blocked(RuntimeError): pass

def require(ok, reason):
    if not ok:
        raise Blocked(reason)

def rest(method, path, user, password, payload=None):
    global WRITE_ATTEMPTS
    valid_get = path in (source.LIST, source.PLUGINS) or (
        bool(re.fullmatch(r'/code-snippets/v1/snippets/[1-9][0-9]*',path))
        and method == 'GET')
    valid_put = SNIPPET_ID is not None and path == (
        f'/code-snippets/v1/snippets/{SNIPPET_ID}') and payload == {
            'name':source.NAME, 'code':CODE, 'scope':'global',
            'active':True, 'desc':source.DESCRIPTION
        }
    require((method == 'GET' and valid_get and payload is None) or (
        method == 'PUT' and valid_put), 'Unapproved REST method/path/payload')
    require(bool(user and password), 'Missing WordPress application credentials')
    basic = base64.b64encode(f'{user}:{password}'.encode()).decode('ascii')
    data = json.dumps(payload,separators=(',',':')).encode() if payload is not None else None
    req = request.Request(source.API + path, method=method, data=data, headers={
        'Authorization':'Basic '+basic, 'Accept':'application/json',
        'Content-Type':'application/json', 'User-Agent':'SolarSerpInPlaceRepair/1.0'})
    if method == 'PUT':
        WRITE_ATTEMPTS += 1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(700001)
            require(res.status in (200,201,204) and len(raw)<=700000,
                    'Malformed WordPress REST response')
            if res.status == 204:
                return res.status, {}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress REST non-JSON response')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress REST outcome uncertain; no retry') from None

def public_state(expected):
    h=source.public_head()
    require(len(h['titles'])==1 and h['titles'][0]==expected,
            'Public title identity changed')
    require(h['descriptions']==[source.DESC], 'Public meta description drift')
    require(h['canonicals']==[source.TARGET], 'Public canonical drift')
    require(not any('noindex' in str(x).lower() for x in h['robots']),
            'Public noindex appeared')

def preflight(user,password):
    global SNIPPET_ID
    # Prevent reexecution after a successful or concurrent patch.
    public_state(OLD_TITLE)
    status,plugins=rest('GET',source.PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100,
            'WordPress plugin inventory incomplete')
    for prefix in ('code-snippets/','wordpress-seo/'):
        require(sum(1 for p in plugins if isinstance(p,dict) and
                    str(p.get('plugin','')).startswith(prefix) and
                    p.get('status')=='active')==1, 'Required plugin not uniquely active')
    status,items=rest('GET',source.LIST,user,password)
    require(status==200 and isinstance(items,list) and len(items)<100,
            'Snippet inventory incomplete')
    matches=[x for x in items if isinstance(x,dict) and x.get('name')==source.NAME]
    require(len(matches)==1,'Source snippet identity not unique')
    row=matches[0]
    require(type(row.get('id')) is int and row['id']>0 and
            row.get('active') is True and
            str(row.get('code','')).strip()==source.PHP_CODE.strip() and
            row.get('scope')=='global',
            'Source snippet code/active/scope changed')
    SNIPPET_ID=row['id']
    verify_row(user,password,source.PHP_CODE)
    # A second independent public read guards a concurrent change between API probes.
    public_state(OLD_TITLE)

def verify_row(user,password,code):
    require(SNIPPET_ID is not None,'Missing exact snippet identity')
    status,row=rest('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(row,dict) and isinstance(row.get('snippet'),dict):
        row=row['snippet']
    require(status==200 and isinstance(row,dict) and row.get('id')==SNIPPET_ID and
            row.get('name')==source.NAME and
            row.get('active') is True and
            row.get('scope')=='global' and
            str(row.get('code','')).strip()==code.strip(),
            'Snippet code/active identity readback failed')

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    r={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
       'put_attempts':WRITE_ATTEMPTS,'wpvibe_calls':0,
       'wordpress_post_writes':0,'theme_deployed':False,
       'target_slug':source.SLUG,**fields}
    RECEIPT.write_text(json.dumps(r,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_SERP_TITLE_REPAIR status='+status+
          ' put_attempts='+str(WRITE_ATTEMPTS)+' wpvibe=0')

def execute(user,password):
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':2,
                     'mode':'one_inplace_active_serp_title_repair'},
            'Release control not armed')
    preflight(user,password)
    path=f'/code-snippets/v1/snippets/{SNIPPET_ID}'
    payload={'name':source.NAME,'code':CODE,'scope':'global',
             'active':True,'desc':source.DESCRIPTION}
    status,_=rest('PUT',path,user,password,payload)
    require(status in (200,201,204),'Snippet PUT response uncertain; no retry')
    verify_row(user,password,CODE)
    public_state(source.TITLE)
    receipt('wp_verified',public_title_exact=True,public_description_preserved=True)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        reason=str(exc)
        if not re.match(r'^(Release|Public|WordPress|Snippet|Source|Required|Missing|Malformed|Unapproved)',reason):
            reason='unverified or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=reason[:130])
        sys.exit(2)

if __name__=='__main__':
    main()
