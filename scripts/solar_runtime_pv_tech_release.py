#!/usr/bin/env python3
"""One in-place WordPress PUT to add manufacturer-sourced PV electrical evidence.

The existing 48-quote REST Code Snippet remains the same ID, route and frontend
URL. Precisely seven existing products gain only documented PV Isc metadata.
No merchant price, availability, product/deal identity, offer URL, affiliate
configuration, post, theme asset or WordPress content changes. No new snippet.
Never retry an ambiguous WordPress PUT. This does NOT publish the dev theme or
claim that a full Builder bundle passed every electrical requirement.
"""
from __future__ import annotations

import base64
from copy import deepcopy
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib import error, request

from scripts import solar_quote_rest_overlay_release as old
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-runtime-tech-evidence-release.json'
RECEIPT=ROOT/'artifacts/solar-runtime-tech-evidence-release.json'
DEV_REV='535698742864442c839261613c6583110223204f'
MODE='one_inplace_rest_quote_tech_evidence_only'
FIELDS={
    'panel-victron-190': ('isc_a','isc_source_url','isc_verified_on'),
    'mppt-victron-100-20':('max_pv_isc_a','max_pv_isc_source_url','max_pv_isc_verified_on'),
    'mppt-victron-100-30':('max_pv_isc_a','max_pv_isc_source_url','max_pv_isc_verified_on'),
    'mppt-victron-100-50':('max_pv_isc_a','max_pv_isc_source_url','max_pv_isc_verified_on'),
    'mppt-victron-150-35':('max_pv_isc_a','max_pv_isc_source_url','max_pv_isc_verified_on'),
    'mppt-victron-150-70':('max_pv_isc_a','max_pv_isc_source_url','max_pv_isc_verified_on'),
    'mppt-victron-250-100':('max_pv_isc_a','max_pv_isc_source_url','max_pv_isc_verified_on'),
}
SNIPPET_ID=None
PUT_ATTEMPTS=0

class Blocked(RuntimeError):
    pass

def require(condition,why):
    if not condition:raise Blocked(why)

def actual_developer_source():
    # Manufacturer fields were independently reviewed in dev. Exact git
    # commit is immutable; never copy newer unreviewed mutable branch values.
    raw=subprocess.check_output(
        ['git','show',DEV_REV+':assets/data/product-seed.json'],
        timeout=18)
    data=json.loads(raw)
    require(isinstance(data,dict) and isinstance(data.get('products'),list)
            and len(data['products'])==24,'Pinned developer product cohort drift')
    return data

def enriched_catalog(original,reviewed):
    require(isinstance(original,dict) and isinstance(original.get('products'),list)
            and len(original['products'])==24,
            'Original existing 48-quote cohort drift')
    dev={p['id']:p for p in reviewed['products']}
    require(len(dev)==24 and len({p['id'] for p in original['products']})==24,
            'Duplicate product identity')
    result=deepcopy(original)
    seen=set()
    for p in result['products']:
        if p['id'] not in FIELDS:continue
        seen.add(p['id'])
        source=dev.get(p['id'])
        require(source and p.get('sku')==source.get('sku') and
                p.get('type')==source.get('type') and
                p.get('merchant')==source.get('merchant'),
                'Manufacturer/SKU/type/merchant identity mismatch')
        for key in FIELDS[p['id']]:
            new=source.get(key)
            require(new is not None and new!='',
                    'Missing source-pinned manufacturer evidence '+p['id']+':'+key)
            current=p.get(key)
            require(current is None or current==new,
                    'Conflicting old electrical evidence '+p['id']+':'+key)
            if key.endswith('_source_url'):
                require(type(new) is str and
                    new.startswith('https://www.victronenergy.com/media/pg/'),
                    'MPPT evidence must be official manufacturer manual URL'
                    ) if p['type']=='mppt' else require(
                    type(new) is str and
                    new.startswith('https://www.solar-import.cz/'),
                    'Panel Isc source must match reviewed exact seller source')
            if key in ('isc_a','max_pv_isc_a'):
                require(type(new) in (int,float) and new>0 and new<100,
                        'PV Isc must be positive manufacturer value')
            if key.endswith('_verified_on'):
                require(type(new) is str and
                        re.fullmatch(r'2026-11-0[1-9]',new),
                        'Electrical verification date not source-pinned November 2026')
            p[key]=new
    require(seen==set(FIELDS),'Missing exactly seven source-pinned PV products')
    # Explicit defensive diff: only seven products, only the field whitelist.
    for prev,after in zip(original['products'],result['products']):
        allowed=set(FIELDS.get(prev['id'],()))
        require({k:v for k,v in prev.items() if k not in allowed}==
                {k:v for k,v in after.items() if k not in allowed},
                'Unapproved offer/stock/price/electrical change')
    require(original.get('bundle_deals')==result.get('bundle_deals'),
            'Existing bundle deals mutated')
    return result

def expected_sources():
    original,old_raw=old.expected_catalog()
    next_catalog=enriched_catalog(original,actual_developer_source())
    next_raw=(json.dumps(next_catalog,ensure_ascii=False,separators=(',',':'))+'\n').encode()
    require(len(next_raw)<200000 and next_raw!=old_raw,
            'Enriched REST payload was empty or unexpectedly identical')
    return original,next_catalog,old.php_source(old_raw),old.php_source(next_raw)

def wp(method,path,user,password,body=None):
    global PUT_ATTEMPTS
    allowed_get=method=='GET' and body is None and(
        path in (old.LIST,old.PLUGINS) or
        (SNIPPET_ID is not None and
         path==f'/code-snippets/v1/snippets/{SNIPPET_ID}'))
    allowed_put=method=='PUT' and SNIPPET_ID is not None and
        path==f'/code-snippets/v1/snippets/{SNIPPET_ID}' and
        isinstance(body,dict) and
        set(body)=={'name','code','scope','active','desc'} and
        body.get('name')==old.NAME and body.get('scope')=='global' and
        body.get('active') is True and body.get('desc')==old.DESCRIPTION
    require(allowed_get or allowed_put,'Unapproved WordPress request')
    require(bool(user and password),'Missing WP application credentials')
    credentials=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(old.REST+path,method=method,
        data=json.dumps(body,separators=(',',':')).encode() if body else None,
        headers={'Authorization':'Basic '+credentials,'Accept':'application/json',
            'Content-Type':'application/json',
            'User-Agent':'SolarPV-Tech-Evidence-InPlace/1.0'})
    if method=='PUT':PUT_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as r:
            raw=r.read(650001)
            require(r.status in (200,201,204) and r.url==old.REST+path and
                    len(raw)<=650000,'Ambiguous WordPress response size/status/URL')
            if r.status==204:return r.status,{}
            require('application/json' in r.headers.get('Content-Type','').lower(),
                    'WordPress response was not JSON')
            return r.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress HTTP '+str(exc.code)+'; never retry') from None
    except (error.URLError,ValueError,OSError,TimeoutError):
        raise Blocked('WordPress transport/result ambiguous; never retry') from None

def item_row(user,password,source):
    path=f'/code-snippets/v1/snippets/{SNIPPET_ID}'
    status,item=wp('GET',path,user,password)
    if isinstance(item,dict) and isinstance(item.get('snippet'),dict):
        item=item['snippet']
    require(status==200 and isinstance(item,dict) and
            item.get('id')==SNIPPET_ID and item.get('name')==old.NAME and
            item.get('active') is True and item.get('scope')=='global' and
            str(item.get('code','')).strip()==source.strip(),
            'Exact active Code Snippet source readback mismatch')

def preflight(user,password,old_catalog,old_source):
    global SNIPPET_ID
    old.health_guard(user,password)
    require(old.public_json()==old_catalog,
            'Public original 48-quote REST catalog unexpectedly changed')
    status,plugins=wp('GET',old.PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100 and
        sum(1 for p in plugins if isinstance(p,dict) and
                str(p.get('plugin','')).startswith('code-snippets/') and
                p.get('status')=='active')==1,
            'Code Snippets plugin not uniquely active')
    status,items=wp('GET',old.LIST,user,password)
    require(status==200 and isinstance(items,list) and len(items)<100,
            'Incomplete current Code Snippets inventory')
    matches=[p for p in items if isinstance(p,dict) and p.get('name')==old.NAME]
    require(len(matches)==1 and type(matches[0].get('id')) is int and
            matches[0].get('active') is True and
            matches[0].get('scope')=='global' and
            str(matches[0].get('code','')).strip()==old_source.strip(),
            'Only source-locked existing active quote snippet may be patched')
    SNIPPET_ID=matches[0]['id']
    item_row(user,password,old_source)
    require(old.public_json()==old_catalog,
            'Concurrent old REST JSON mutation; do not write')

def receipt(status,**details):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    r={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
       'put_attempts':PUT_ATTEMPTS,'new_snippets':0,'theme_deployed':False,
       'wordpress_post_writes':0,'merchant_requests':0,'affiliate_clicks':0,
       **details}
    RECEIPT.write_text(json.dumps(r,sort_keys=True,indent=2)+'\n','utf-8')
    print('SOLAR_PV_TECH_REST status='+status+
       ' put_attempts='+str(PUT_ATTEMPTS)+
       ' records='+str(len(FIELDS))+' new_snippets=0 theme_deployed=false')

def execute(user,password):
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,'mode':MODE},
            'PV tech evidence one-PUT control not armed')
    old_catalog,new_catalog,old_code,new_code=expected_sources()
    preflight(user,password,old_catalog,old_code)
    status,_=wp('PUT',f'/code-snippets/v1/snippets/{SNIPPET_ID}',
       user,password,{'name':old.NAME,'code':new_code,'scope':'global',
                     'active':True,'desc':old.DESCRIPTION})
    require(status in (200,201,204),'PUT result uncertain; no retry')
    item_row(user,password,new_code)
    require(old.public_json()==new_catalog,
            'Public REST JSON differs from reviewed technical source')
    old.page_readback()
    old.health_guard(user,password)
    receipt('wp_verified',verified_pv_product_count=len(FIELDS),
       verified_quote_count_unchanged=48,
       old_snippet_same_id=True,
       rest_electrical_data_live=True,
       dev_theme_browser_runtime_deployed=False)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError,
            subprocess.CalledProcessError,subprocess.TimeoutExpired) as exc:
        why=str(exc)
        if not re.match(r'^(PV|Original|Pinned|Missing|Duplicate|Manufacturer|Conflicting|Unapproved|WordPress|Public|Concurrent|Code|Only|Ambiguous|Incomplete|Existing|Electrical|Enriched|Old)',why):
            why='unknown or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=why[:135])
        sys.exit(2)

if __name__=='__main__':main()
