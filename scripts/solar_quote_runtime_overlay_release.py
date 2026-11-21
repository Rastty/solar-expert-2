#!/usr/bin/env python3
"""One-shot additive WordPress media + Code Snippets catalog quote overlay.

No theme update, no managed post edit, no affiliate/merchant requests, and no
retry of uncertain REST writes. The overlay preserves OLD live technical data,
patches exactly 48 independently source-matched dated price/stock records and
leaves 3 unresolved VSelektro + 1 source drift unchanged. It is reversible by
deactivating the exact snippet; the original theme catalog remains untouched.
"""
from __future__ import annotations

import base64
from hashlib import sha256
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib import error,parse,request

from scripts.solar_gsc_direct_rest_preflight import NoRedirect

SITE='https://solar-expert.cz'
API=SITE+'/wp-json'
OLD_BUILD='dev-rc-0.12.27'
OLD_THEME_SHA='867d0c1aadbfd79dd1fdd57ac424cff491f5a813'
SOURCE_PIN='535698742864442c839261613c6583110223204f'
PUBLIC_CATALOG=SITE+'/wp-content/themes/solar-expert-2/assets/data/product-seed.json'
PREVIEW=Path('artifacts/solar-catalog-quote-overlay-preview.json')
CONTROL=Path('ops/solar-quote-runtime-overlay-release.json')
RECEIPT=Path('artifacts/solar-quote-runtime-overlay-release.json')
NAME='Solar Expert verified quote-only runtime catalog overlay v1'
DESCRIPTION='Same site JSON media quote overlay; no WordPress posts or theme mutation'
LIST='/code-snippets/v1/snippets?context=edit&per_page=100'
PLUGINS='/wp/v2/plugins?context=edit&per_page=100'
HEALTH='/solar-expert/v1/health'
PAGE_URLS=(SITE+'/solarni-sestava-na-chatu/',SITE+'/vyber-baterii/')
WRITE_ATTEMPTS=0
MEDIA_ID=None
SNIPPET_ID=None

class Blocked(RuntimeError):
    pass

def require(valid,reason):
    if not valid:raise Blocked(reason)

def fetch_public(url,max_bytes=2_000_000):
    p=parse.urlsplit(url)
    require(p.scheme=='https' and p.hostname=='solar-expert.cz' and not p.username
            and not p.password and (p.port is None), 'Public GET left exact origin')
    req=request.Request(url,method='GET',headers={
        'Accept':'*/*','Cache-Control':'no-cache, no-store',
        'User-Agent':'SolarQuoteOverlay-ReadOnly/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            require(res.status==200 and res.url==url,'Public GET status/redirect changed')
            raw=res.read(max_bytes+1)
            require(len(raw)<=max_bytes and raw,'Public GET oversize or empty')
            return raw
    except (error.HTTPError,error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('Public GET unavailable; do not retry writes') from None

def wp(method,path,user,password,data=None,filename=None):
    global WRITE_ATTEMPTS
    get_allowed=path in (HEALTH,PLUGINS,LIST) or bool(re.fullmatch(
        r'/wp/v2/media(?:\?slug=solar-price-overlay-[0-9a-f]{12}&per_page=10|/[1-9][0-9]*)',path))
    get_allowed=get_allowed or bool(re.fullmatch(
        r'/code-snippets/v1/snippets/[1-9][0-9]*',path))
    media_post=method=='POST' and path=='/wp/v2/media' and isinstance(data,bytes) and (
        filename is not None and re.fullmatch(r'solar-price-overlay-[0-9a-f]{12}\.txt',filename))
    snippet_post=method=='POST' and path=='/code-snippets/v1/snippets' and isinstance(data,dict) and (
        data.get('name')==NAME and data.get('scope')=='global' and data.get('active') is False
        and data.get('desc')==DESCRIPTION and isinstance(data.get('code'),str) and
        'solar_expert_quote_only_catalog_overlay_v1' in data['code'])
    activate_post=method=='POST' and SNIPPET_ID is not None and (
        path==f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate') and data is None
    require((method=='GET' and get_allowed and data is None) or
            media_post or snippet_post or activate_post,
            'Unapproved WordPress REST method/path/payload')
    require(bool(user and password),'Missing WordPress app credentials')
    headers={'Accept':'application/json','User-Agent':'SolarQuoteOverlay-OneShot/1.0'}
    token=base64.b64encode((user+':'+password).encode()).decode()
    headers['Authorization']='Basic '+token
    if media_post:
        body=data
        headers['Content-Type']='text/plain'
        headers['Content-Disposition']='attachment; filename="'+filename+'"'
    elif data is not None:
        body=json.dumps(data,separators=(',',':')).encode()
        headers['Content-Type']='application/json'
    else: body=None
    if method=='POST':WRITE_ATTEMPTS+=1
    req=request.Request(API+path,method=method,data=body,headers=headers)
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=35) as res:
            raw=res.read(800001)
            require(res.status in (200,201,204) and res.url==API+path and
                    len(raw)<=800000,'WordPress status/identity/body uncertain')
            if res.status==204:return 204,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress REST non-JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no retry') from None
    except (error.URLError,OSError,TimeoutError,ValueError):
        raise Blocked('WordPress REST outcome uncertain; no retry') from None

def baseline(user,password):
    status,health=wp('GET',HEALTH,user,password)
    require(status==200 and isinstance(health,dict) and
            health.get('build_marker')==OLD_BUILD and
            health.get('managed_content_items')==60 and
            health.get('content_sync_status')=='current' and
            health.get('content_sync_required') is False,
            'Old WordPress theme/managed-content identity changed')
    expected=subprocess.check_output(
        ['git','show',OLD_THEME_SHA+':assets/data/product-seed.json'],
        timeout=20)
    observed=fetch_public(PUBLIC_CATALOG)
    require(sha256(observed).digest()==sha256(expected).digest(),
            'Old public catalog byte-level Git provenance no longer matches')

def load_candidate():
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':'one_additive_48_quote_runtime_overlay'},
            'Overlay release control not exactly armed')
    receipt=json.loads(PREVIEW.read_text(encoding='utf-8'))
    summary=receipt.get('summary')
    candidate=receipt.get('catalog')
    require(isinstance(summary,dict) and isinstance(candidate,dict),
            'Missing exact quote-only preview')
    count=summary.get('counts',{})
    require(summary.get('release_authorized') is False and
            summary.get('source_revision')==SOURCE_PIN and
            count.get('all_offer_rows')==52 and
            count.get('exact_seller_matches')==51 and
            count.get('eligible')==48 and
            count.get('skipped_unresolved_sku')==3 and
            count.get('skipped_source_changed')==1 and
            count.get('skipped_date_expired')==0 and
            count.get('skipped_bad_quote')==0 and
            summary.get('wordpress_writes')==0 and
            summary.get('affiliate_clicks')==0,
            'Quote preview count/source/safety changed')
    # The preview generator already proves no technical-field changes.
    # This is the exact output consumed, never reassembled from prices by a
    # GitHub Action secret or unrelated retailer feed.
    raw=(json.dumps(candidate,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
    require(len(raw)<500000 and b'php' not in raw[:20],
            'Overlay candidate size/type invalid')
    return raw

def snippet_code(url,asset_sha):
    p=parse.urlsplit(url)
    require(p.scheme=='https' and p.hostname=='solar-expert.cz' and
            p.path.startswith('/wp-content/uploads/') and p.path.endswith('.txt')
            and not p.username and not p.password and not p.query and not p.fragment,
            'Unsafe overlay media URL')
    require(re.fullmatch(r'[0-9a-f]{64}',asset_sha),'Invalid overlay media digest')
    encoded=json.dumps(url,ensure_ascii=False)
    return """function solar_expert_quote_only_catalog_overlay_v1() {
    if (is_admin() || !wp_script_is('solar-expert-affiliate', 'enqueued')) {
        return;
    }
    $asset = """+encoded+""";
    $js = 'if (window.SolarExpertConfig) { window.SolarExpertConfig.catalogUrl = '
        . wp_json_encode($asset) . '; }';
    wp_add_inline_script('solar-expert-affiliate', $js, 'after');
}
add_action('wp_enqueue_scripts', 'solar_expert_quote_only_catalog_overlay_v1', 99999);
"""

def inspect_scripts(html,url):
    # This validates the server-injected first-party override. It is not a
    # JavaScript/browser-run or a claimed affiliate click.
    source=html.decode('utf-8','replace')
    marker='window.SolarExpertConfig.catalogUrl = '
    hits=list(re.finditer(re.escape(marker)+r'\s*("(?:\\\\.|[^"\\\\])*")\s*;',source))
    require(len(hits)==1,'Public page lacks one unique first-party catalog override')
    try:
        configured=json.loads(hits[0].group(1))
    except ValueError:
        raise Blocked('Public inline catalog override invalid JSON') from None
    require(configured==url,'Public page quote catalog URL mismatches approved media')
    require('affiliate-adapter.js' in source and 'product-matcher.js' in source,
            'Required old theme runtime missing')
    return True

def inventory(user,password,filename):
    status,plugins=wp('GET',PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for p in plugins if isinstance(p,dict) and
                str(p.get('plugin','')).startswith('code-snippets/') and
                p.get('status')=='active')==1,
            'Code Snippets not uniquely active')
    status,items=wp('GET',LIST,user,password)
    require(status==200 and isinstance(items,list) and len(items)<100,
            'Snippet inventory unavailable')
    for item in items:
        require(isinstance(item,dict) and item.get('name')!=NAME and
                'solar_expert_quote_only_catalog_overlay_v1' not in str(item.get('code','')),
                'Existing quote runtime overlay; no duplicate')
    slug=filename[:-4]
    status,media=wp('GET',f'/wp/v2/media?slug={slug}&per_page=10',user,password)
    require(status==200 and isinstance(media,list) and not media,
            'Quote overlay media asset already exists; no duplicate')

def exact_snippet(user,password,code,active):
    status,row=wp('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(row,dict) and isinstance(row.get('snippet'),dict):row=row['snippet']
    require(status==200 and isinstance(row,dict) and row.get('id')==SNIPPET_ID
            and row.get('name')==NAME and row.get('active') is active
            and str(row.get('code','')).strip()==code.strip(),
            'Snippet identity/active/code readback failed')

def receipt(status,**other):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'write_attempts':WRITE_ATTEMPTS,
          'media_id':MEDIA_ID,'snippet_id':SNIPPET_ID,'theme_deployed':False,
          'wpvibe_calls':0,'wordpress_post_body_writes':0,'affiliate_clicks':0,**other}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_QUOTE_OVERLAY_RELEASE status='+status+
          ' write_attempts='+str(WRITE_ATTEMPTS)+' theme_deployed=false wpvibe=0')

def execute(user,password):
    global MEDIA_ID,SNIPPET_ID
    payload=load_candidate()
    digest=sha256(payload).hexdigest()
    filename='solar-price-overlay-'+digest[:12]+'.txt'
    baseline(user,password)
    inventory(user,password,filename)
    status,media=wp('POST','/wp/v2/media',user,password,payload,filename)
    require(status in (200,201) and isinstance(media,dict) and
            type(media.get('id')) is int and media['id']>0,
            'Media upload response uncertain; no retry')
    MEDIA_ID=media['id']
    url=media.get('source_url')
    require(isinstance(url,str) and url.endswith('/'+filename),
            'Uploaded media URL not exact immutable filename')
    status,check=wp('GET',f'/wp/v2/media/{MEDIA_ID}',user,password)
    require(status==200 and isinstance(check,dict) and
            check.get('id')==MEDIA_ID and check.get('source_url')==url,
            'Uploaded media authenticated readback failed')
    require(sha256(fetch_public(url,500000)).hexdigest()==digest,
            'Uploaded public media content does not match approved candidate')
    baseline(user,password)
    code=snippet_code(url,digest)
    request_body={'name':NAME,'code':code,'scope':'global',
                  'active':False,'desc':DESCRIPTION}
    status,row=wp('POST','/code-snippets/v1/snippets',user,password,request_body)
    row=row.get('snippet',row) if isinstance(row,dict) else {}
    require(status in (200,201) and isinstance(row,dict)
            and type(row.get('id')) is int and row['id']>0,
            'Snippet creation ambiguous; no retry')
    SNIPPET_ID=row['id']
    exact_snippet(user,password,code,False)
    status,_=wp('POST',f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',
                user,password)
    require(status in (200,201,204),
            'Snippet activation ambiguous; no retry')
    exact_snippet(user,password,code,True)
    for page in PAGE_URLS:
        url_check=page+'?solar_quote_overlay_verify='+digest[:12]
        inspect_scripts(fetch_public(url_check),url)
    require(sha256(fetch_public(url,500000)).hexdigest()==digest,
            'Overlay public asset drift after activation')
    baseline(user,password)
    receipt('wp_verified',asset_sha256=digest,asset_url=url,
            unchanged_legacy_health=True,eligible_quotes=48,
            unresolved_quotes=3,source_changed_quotes=1,
            html_script_injection_verified_pages=2,
            browser_execution_verified=False)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError,subprocess.CalledProcessError) as exc:
        reason=str(exc)
        if not re.match(r'^(Overlay|Missing|Quote|Old|Public|Unsafe|Code|Snippet|Uploaded|Media|Existing|WordPress|Unapproved|Unexpected|Required|Invalid)',reason):
            reason='unknown or ambiguous precondition'
        receipt('blocked_no_retry',reason=reason[:130])
        sys.exit(2)

if __name__=='__main__':
    main()
