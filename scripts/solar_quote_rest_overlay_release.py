#!/usr/bin/env python3
"""Two-write, one-shot, reversible WordPress GET-only catalog route + JS URL bridge.

No media upload, theme update, post/content write, affiliate event or seller
request. A reviewed source-pinned 48-quote overlay is embedded in one Code
Snippets PHP source as deterministic gzip-base64 JSON and exposed via public
read-only first-party WordPress REST. The existing original theme catalog
remains unchanged; disable this exact snippet to revert to it.
"""
from __future__ import annotations

import base64
import gzip
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib import error,request

from scripts.solar_gsc_direct_rest_preflight import NoRedirect
from scripts import solar_quote_runtime_overlay_release as original

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-quote-rest-overlay-release.json'
RECEIPT=ROOT/'artifacts/solar-quote-rest-overlay-release.json'
PREVIEW=ROOT/'artifacts/solar-catalog-quote-overlay-preview.json'
SITE='https://solar-expert.cz'
REST=SITE+'/wp-json'
NAME='Solar Expert 48 verified quote REST overlay v2'
DESCRIPTION='48 source-matched dated merchant quotes; read-only first-party REST route'
ROUTE='/solar-quote-overlay/v2/catalog'
URL=REST+ROUTE
LIST=original.LIST
PLUGINS=original.PLUGINS
HEALTH=original.HEALTH
PAGES=original.PAGE_URLS
OLD_THEME_SHA=original.OLD_THEME_SHA
PUBLIC_CATALOG=original.PUBLIC_CATALOG
MODE='one_reversible_48_quote_wp_rest_snippet'
POST_ATTEMPTS=0
SNIPPET_ID=None

class Blocked(RuntimeError):
    pass

def require(condition,reason):
    if not condition:raise Blocked(reason)

def expected_catalog():
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,'mode':MODE},
            'Source-locked REST overlay release control not armed')
    preview=json.loads(PREVIEW.read_text(encoding='utf-8'))
    summary=preview.get('summary',{})
    counts=summary.get('counts',{})
    require(summary.get('release_authorized') is False and
            summary.get('source_revision')==original.SOURCE_PIN and
            counts.get('all_offer_rows')==52 and
            counts.get('exact_seller_matches')==51 and
            counts.get('eligible')==48 and
            counts.get('skipped_unresolved_sku')==3 and
            counts.get('skipped_source_changed')==1 and
            counts.get('skipped_date_expired')==0 and
            counts.get('skipped_bad_quote')==0 and
            summary.get('wordpress_writes')==0 and
            summary.get('affiliate_clicks')==0,
            'Overlay candidate identity/freshness/safety changed')
    catalog=preview.get('catalog')
    require(isinstance(catalog,dict) and isinstance(catalog.get('products'),list)
            and len(catalog['products'])==24,'Catalog candidate product cohort drift')
    raw=(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
    require(0<len(raw)<200000,'Catalog payload oversized/empty')
    return catalog,raw

def php_source(payload):
    zipped=gzip.compress(payload,mtime=0)
    encoded=base64.b64encode(zipped).decode('ascii')
    require(bool(re.fullmatch(r'[a-zA-Z0-9+/=]+',encoded)) and len(encoded)<100000,
            'Encoded catalog source is not bounded')
    # JS URL and public route both stay on same exact first-party origin.
    return """/**
 * Source-pinned, non-mutating price evidence route. This is not an order API.
 * No theme, posts, product specs or merchant/affiliate options are changed.
 */
function solar_expert_quote_rest_overlay_v2_catalog() {
    $raw = gzdecode(base64_decode('"""+encoded+"""', true));
    if (!is_string($raw)) {
        return new WP_Error('solar_quote_payload', 'Quote data unavailable', array('status'=>503));
    }
    $catalog = json_decode($raw, true);
    if (!is_array($catalog) || !isset($catalog['products']) ||
        count($catalog['products']) !== 24) {
        return new WP_Error('solar_quote_payload', 'Invalid quote data', array('status'=>503));
    }
    return rest_ensure_response($catalog);
}
add_action('rest_api_init', static function () {
    register_rest_route('solar-quote-overlay/v2', '/catalog', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'solar_expert_quote_rest_overlay_v2_catalog',
    ));
});
function solar_expert_quote_rest_overlay_v2_enqueue() {
    if (is_admin() || !wp_script_is('solar-expert-affiliate', 'enqueued')) {
        return;
    }
    $asset = home_url('/wp-json/solar-quote-overlay/v2/catalog');
    $js = 'if (window.SolarExpertConfig) { window.SolarExpertConfig.catalogUrl = '
        . wp_json_encode($asset) . '; }';
    wp_add_inline_script('solar-expert-affiliate', $js, 'after');
}
add_action('wp_enqueue_scripts', 'solar_expert_quote_rest_overlay_v2_enqueue', 99999);
"""

def wp(method,path,user,password,body=None,source=None):
    global POST_ATTEMPTS
    valid_get=method=='GET' and body is None and (
        path in (LIST,PLUGINS,HEALTH) or
        (SNIPPET_ID is not None and path==f'/code-snippets/v1/snippets/{SNIPPET_ID}'))
    valid_create=method=='POST' and path=='/code-snippets/v1/snippets' and (
        source is not None and body=={'name':NAME,'code':source,
        'scope':'global','active':False,'desc':DESCRIPTION})
    valid_activate=method=='POST' and SNIPPET_ID is not None and (
        path==f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate' and body is None)
    require(valid_get or valid_create or valid_activate,
            'Unapproved WordPress method/path/source')
    require(bool(user and password),'Missing WordPress credentials')
    basic=base64.b64encode((user+':'+password).encode()).decode()
    headers={'Accept':'application/json','Content-Type':'application/json',
             'Authorization':'Basic '+basic,'User-Agent':'SolarQuoteREST-OneShot/1.0'}
    data=json.dumps(body,separators=(',',':')).encode() if body is not None else None
    req=request.Request(REST+path,method=method,data=data,headers=headers)
    if method=='POST':POST_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(600001)
            require(res.status in (200,201,204) and res.url==REST+path and
                    len(raw)<=600000,'WordPress status/URL/body uncertain')
            if res.status==204:return 204,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress response not JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress REST transport uncertain; no retry') from None

def public_json():
    req=request.Request(URL,method='GET',headers={
        'Accept':'application/json','Cache-Control':'no-cache',
        'User-Agent':'SolarQuoteREST-PublicGET/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            require(res.status==200 and res.url==URL and
                    'application/json' in res.headers.get('Content-Type','').lower(),
                    'Public overlay REST identity/content type changed')
            raw=res.read(300001)
            require(0<len(raw)<=300000,'Public overlay JSON size invalid')
            return json.loads(raw)
    except (error.HTTPError,error.URLError,ValueError,OSError,TimeoutError):
        raise Blocked('Public overlay REST endpoint unavailable') from None

def public_absent():
    req=request.Request(URL,method='GET',headers={
        'Accept':'application/json','User-Agent':'SolarQuoteREST-PreflightGET/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=20) as res:
            raise Blocked('Overlay REST URL already exists; no duplicate')
    except error.HTTPError as exc:
        require(exc.code==404,'Overlay URL state uncertain; do not write')
    except (error.URLError,OSError,TimeoutError):
        raise Blocked('Overlay URL preflight unavailable; do not write') from None

def health_guard(user,password):
    code,health=wp('GET',HEALTH,user,password)
    require(code==200 and isinstance(health,dict) and
            health.get('build_marker')==original.OLD_BUILD and
            health.get('managed_content_items')==60 and
            health.get('content_sync_status')=='current' and
            health.get('content_sync_required') is False,
            'Legacy theme/content state drifted')
    historical=subprocess.check_output(
        ['git','show',OLD_THEME_SHA+':assets/data/product-seed.json'],timeout=20)
    observed=original.fetch_public(PUBLIC_CATALOG)
    require(sha256(historical).digest()==sha256(observed).digest(),
            'Legacy public static product catalog byte identity drifted')

def inventory(user,password):
    code,plugins=wp('GET',PLUGINS,user,password)
    require(code==200 and isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for p in plugins if isinstance(p,dict) and
                str(p.get('plugin','')).startswith('code-snippets/') and
                p.get('status')=='active')==1,
            'Code Snippets plugin not uniquely active')
    code,items=wp('GET',LIST,user,password)
    require(code==200 and isinstance(items,list) and len(items)<100,
            'Snippet inventory incomplete')
    for item in items:
        require(isinstance(item,dict) and item.get('name')!=NAME and
                'solar_expert_quote_rest_overlay_v2_catalog' not in str(item.get('code','')),
                'Existing REST overlay snippet; no duplicate')

def snippet_readback(user,password,source,active):
    code,item=wp('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(item,dict) and isinstance(item.get('snippet'),dict):
        item=item['snippet']
    require(code==200 and isinstance(item,dict) and
            item.get('id')==SNIPPET_ID and item.get('name')==NAME and
            item.get('active') is active and
            str(item.get('code','')).strip()==source.strip(),
            'Snippet identity/source/active readback failed')

def page_readback():
    marker='window.SolarExpertConfig.catalogUrl = '
    for page in PAGES:
        html=original.fetch_public(page+'?solar_quote_rest_verify=v2').decode('utf-8','replace')
        encoded=(json.dumps(URL),json.dumps(URL).replace('/','\\/'))
        require(html.count(marker)==1 and any(
                marker+part+';' in html for part in encoded) and
                'affiliate-adapter.js' in html and 'product-matcher.js' in html,
                'Buyer page exact first-party catalog bridge not visible')

def receipt(status,**extra):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    result={'schema_version':1,'status':status,'post_attempts':POST_ATTEMPTS,
            'snippet_id':SNIPPET_ID,'theme_deployed':False,
            'wordpress_post_body_writes':0,'wpvibe_calls':0,
            'merchant_requests':0,'affiliate_clicks':0,**extra}
    RECEIPT.write_text(json.dumps(result,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_QUOTE_REST_OVERLAY status='+status+' post_attempts='+
          str(POST_ATTEMPTS)+' theme_deployed=false wpvibe=0')

def execute(user,password):
    global SNIPPET_ID
    catalog,payload=expected_catalog()
    source=php_source(payload)
    health_guard(user,password)
    public_absent()
    inventory(user,password)
    post={'name':NAME,'code':source,'scope':'global','active':False,'desc':DESCRIPTION}
    code,row=wp('POST','/code-snippets/v1/snippets',user,password,post,source)
    row=row.get('snippet',row) if isinstance(row,dict) else {}
    require(code in (200,201) and isinstance(row,dict) and
            type(row.get('id')) is int and row['id']>0,
            'Snippet create response uncertain; no retry')
    SNIPPET_ID=row['id']
    snippet_readback(user,password,source,False)
    public_absent()
    health_guard(user,password)
    code,_=wp('POST',f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',user,password)
    require(code in (200,201,204),'Snippet activate response uncertain; no retry')
    snippet_readback(user,password,source,True)
    require(public_json()==catalog,'Public quote REST JSON differs from reviewed source')
    page_readback()
    health_guard(user,password)
    receipt('wp_verified',eligible_quotes=48,excluded_vselektro=3,
            excluded_source_drift=1,public_rest_json_exact=True,
            public_script_pages_exact=2,
            browser_execution_verified=False)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError,subprocess.CalledProcessError) as exc:
        reason=str(exc)
        if not re.match(r'^(Source|Overlay|Catalog|WordPress|Missing|Legacy|Code|Snippet|Existing|Public|Buyer|Unapproved)',reason):
            reason='unknown or ambiguous precondition'
        receipt('blocked_no_retry',reason=reason[:140])
        sys.exit(2)

if __name__=='__main__':
    main()
