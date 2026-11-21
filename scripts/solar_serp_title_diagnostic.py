#!/usr/bin/env python3
"""Strictly GET-only production diagnosis of the live Solar SERP snippet and Yoast title source.

No WordPress writes, no WPVibe, no external affiliate requests, no sensitive response bodies
or user identifiers in logs or artifacts.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from urllib import error, parse, request

from scripts.solar_gsc_direct_rest_preflight import NoRedirect
from scripts import solar_serp_boundary_release as source

ROOT = Path(__file__).resolve().parents[1]
SITE = source.SITE.rstrip('/')
REST = SITE + '/wp-json'
POST_PATH = '/wp/v2/posts?slug=' + source.SLUG + '&_fields=id,slug,yoast_head_json'
YOAST_PATH = '/yoast/v1/get_head?url=' + parse.quote(source.TARGET, safe='')
ALLOWED = (source.LIST, source.PLUGINS, POST_PATH, YOAST_PATH)
OUTPUT = ROOT / 'artifacts/solar-serp-title-diagnostic-readonly.json'

def fetch_json(path: str, user: str, password: str):
    if path not in ALLOWED:
        raise ValueError('Unapproved GET path')
    credentials = (user, password) if path in (source.LIST, source.PLUGINS) else None
    if credentials and not (user and password):
        return None, None
    headers = {'Accept':'application/json', 'User-Agent':'SolarSerpTitle-Diagnostic-GET-Only/1.0'}
    if credentials:
        headers['Authorization'] = 'Basic ' + base64.b64encode(f'{user}:{password}'.encode()).decode('ascii')
    url = REST + path
    req = request.Request(url, method='GET', headers=headers)
    try:
        with request.build_opener(NoRedirect()).open(req, timeout=20) as response:
            if response.status != 200 or response.url != url or (
                'application/json' not in response.headers.get('Content-Type', '').lower()):
                return response.status, None
            raw = response.read(750001)
            if len(raw) > 750000:
                return response.status, None
            return response.status, json.loads(raw)
    except error.HTTPError as exc:
        return exc.code, None
    except (error.URLError, OSError, TimeoutError, ValueError, UnicodeError, json.JSONDecodeError):
        return None, None

def snippet_summary(status, data):
    if status != 200 or not isinstance(data, list) or len(data) >= 100:
        return {'inventory_verified':False, 'exact_active':False, 'exact_code':False, 'count':None}
    matches = [x for x in data if isinstance(x,dict) and x.get('name') == source.NAME]
    if len(matches) != 1:
        return {'inventory_verified':True,'exact_active':False,'exact_code':False,'count':len(matches)}
    x=matches[0]
    return {'inventory_verified':True,
            'exact_active':x.get('active') is True,
            'exact_code':str(x.get('code','')).strip() == source.PHP_CODE.strip(),
            'count':1}

def result_title(value):
    if not isinstance(value, dict):
        return {'available':False,'target_title':None,'target_description':None}
    return {'available':True,
            'target_title': value.get('title') == source.TITLE,
            'target_description': value.get('description') == source.DESC}

def diagnose(user, password):
    head = source.public_head()
    listing_status, listing=fetch_json(source.LIST,user,password)
    plugin_status, plugins=fetch_json(source.PLUGINS,user,password)
    post_status, posts=fetch_json(POST_PATH,user,password)
    yoast_status, yoast=fetch_json(YOAST_PATH,user,password)
    snippet=snippet_summary(listing_status, listing)
    post=posts[0] if post_status == 200 and isinstance(posts,list) and len(posts)==1 and isinstance(posts[0],dict) and posts[0].get('slug')==source.SLUG else None
    yoast_from_post=result_title(post.get('yoast_head_json') if post else None)
    yoast_from_endpoint=result_title(yoast.get('json') if isinstance(yoast,dict) else None)
    return {'schema_version':1,'site':SITE,'target_slug':source.SLUG,
            'channel':'github_action_wordpress_get_only',
            'request_methods':['GET'],
            'wp_writes':0,'wpvibe_calls':0,'theme_deployed':False,
            'public':{
                'has_one_title':len(head['titles'])==1,
                'title_equals_intent':head['titles']==[source.TITLE],
                'description_equals_intent':head['descriptions']==[source.DESC],
                'canonical_equals_target':head['canonicals']==[source.TARGET],
                'noindex':any('noindex' in str(x).lower() for x in head['robots']),
                # No real page content or visitor data in this artifact.
            },
            'snippet':snippet,
            'word_press_rest':{
                'plugin_inventory_http':plugin_status,
                'code_snippets_active':(isinstance(plugins,list) and sum(
                    1 for x in plugins if isinstance(x,dict) and x.get('status')=='active'
                    and str(x.get('plugin','')).startswith('code-snippets/'))==1),
                'yoast_plugin_active':(isinstance(plugins,list) and sum(
                    1 for x in plugins if isinstance(x,dict) and x.get('status')=='active'
                    and str(x.get('plugin','')).startswith('wordpress-seo/'))==1),
                'post_http':post_status,'post_identity_exact':post is not None,
                'post_yoast_json':yoast_from_post,
                'yoast_get_head_http':yoast_status,'yoast_head_json':yoast_from_endpoint,
            }}

def main():
    data=diagnose(os.getenv('SOLAR_WP_USER','').strip(),
                  os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('SOLAR_SERP_TITLE_DIAG status=get_only'
          + ' public_title=' + str(data['public']['title_equals_intent']).lower()
          + ' public_desc=' + str(data['public']['description_equals_intent']).lower()
          + ' snippet_active=' + str(data['snippet']['exact_active']).lower()
          + ' snippet_code_exact=' + str(data['snippet']['exact_code']).lower()
          + ' post_yoast_title=' + str(data['word_press_rest']['post_yoast_json']['target_title']).lower()
          + ' yoast_head_title=' + str(data['word_press_rest']['yoast_head_json']['target_title']).lower()
          + ' writes=0 wpvibe=0')
if __name__=='__main__':
    main()
