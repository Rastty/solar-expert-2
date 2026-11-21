#!/usr/bin/env python3
"""One-shot, exact WordPress Code Snippets guard against legacy implicit content sync.

The *old PHP*, already loaded during a Deployer update, can schedule/execute
managed-content writes before the new theme's opt-out applies. This guard removes
only four exact legacy callbacks before their execution. It DOES NOT suppress
the anonymous after_switch_theme callback, prove theme PHP provenance, back up
the database, or authorize a full theme release.
"""
from __future__ import annotations
import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
from urllib import error, request

from scripts.solar_gsc_direct_rest_preflight import NoRedirect

SITE = 'https://solar-expert.cz'
API = SITE + '/wp-json'
CONTROL = Path('ops/solar-legacy-sync-guard-release.json')
RECEIPT = Path('artifacts/solar-legacy-sync-guard-release.json')
NAME = 'Solar Expert old-PHP implicit sync first-migration guard v1'
DESCRIPTION = ('Disable only old automatic WordPress managed-content sync '
               'callbacks; explicit protected content-sync stays available.')
PLUGINS = '/wp/v2/plugins?context=edit&per_page=100'
LIST = '/code-snippets/v1/snippets?context=edit&per_page=100'
GUARD = '/solar-first-migration-guard/v1/status'
HEALTH = '/solar-expert/v1/health'
OLD_BUILD = 'dev-rc-0.12.27'
PHP_CODE = """/**
 * Run early in both regular and admin requests; the WordPress plugin loads
 * before the theme. Do not remove any unrelated WordPress actions.
 */
function solar_expert_old_sync_guard_v1_remove() {
    remove_action('init', 'solar_expert_schedule_content_sync', 50);
    remove_action('admin_init', 'solar_expert_maybe_sync_content', 10);
    remove_action('solar_expert_async_content_sync', 'solar_expert_run_async_content_sync', 10);
    remove_action('upgrader_process_complete', 'solar_expert_sync_after_theme_update', 20);
}
add_action('after_setup_theme', 'solar_expert_old_sync_guard_v1_remove', PHP_INT_MAX);
add_action('init', 'solar_expert_old_sync_guard_v1_remove', -99999);

/* Authenticated, read-only hook contract; no hidden PHP, options or tokens. */
add_action('rest_api_init', static function () {
    register_rest_route('solar-first-migration-guard/v1', '/status', array(
        'methods' => 'GET',
        'permission_callback' => static function () {
            return current_user_can('manage_options');
        },
        'callback' => static function () {
            $checks = array(
                'init' => array('init', 'solar_expert_schedule_content_sync'),
                'admin' => array('admin_init', 'solar_expert_maybe_sync_content'),
                'cron' => array('solar_expert_async_content_sync', 'solar_expert_run_async_content_sync'),
                'upgrader' => array('upgrader_process_complete', 'solar_expert_sync_after_theme_update'),
            );
            $defined = 0;
            $remaining = 0;
            foreach ($checks as $pair) {
                if (function_exists($pair[1])) { ++$defined; }
                if (has_action($pair[0], $pair[1]) !== false) { ++$remaining; }
            }
            return array(
                'schema_version' => 1,
                'guard_active' => true,
                'targeted_functions_defined' => $defined,
                'targeted_hooks_remaining' => $remaining,
                'targeted_hook_count' => 4,
                'anonymous_after_switch_theme_not_proved' => true,
                'theme_release_authorized' => false,
                'word_press_writes' => 0,
            );
        },
    ));
});
"""
POSTS = 0
SNIPPET_ID = None

class Blocked(RuntimeError):
    pass

def require(condition, reason):
    if not condition:
        raise Blocked(reason)

def rest(method, path, user='', password='', body=None):
    global POSTS
    read = (method == 'GET' and body is None and
            (path in (HEALTH, PLUGINS, LIST, GUARD) or
             (SNIPPET_ID is not None and
              path == f'/code-snippets/v1/snippets/{SNIPPET_ID}')))
    create = (method == 'POST' and path == '/code-snippets/v1/snippets'
              and body == {'name': NAME, 'code': PHP_CODE, 'scope': 'global',
                           'active': False, 'desc': DESCRIPTION})
    activate = (method == 'POST' and SNIPPET_ID is not None and
                path == f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate'
                and body is None)
    require(read or create or activate, 'Unapproved REST method/path/payload')
    require(bool(user and password) or path == HEALTH,
            'Missing protected WordPress credentials')
    headers = {'Accept':'application/json', 'Content-Type':'application/json',
               'User-Agent':'SolarOldSyncHookGuard-OneShot/1.0'}
    if user and password:
        token=base64.b64encode(f'{user}:{password}'.encode()).decode('ascii')
        headers['Authorization']='Basic '+token
    data=json.dumps(body,separators=(',',':')).encode() if body is not None else None
    req=request.Request(API+path,method=method,data=data,headers=headers)
    if method == 'POST':
        POSTS += 1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as response:
            raw=response.read(700001)
            require(response.status in (200,201,204) and len(raw)<=700000
                    and response.url == API+path, 'Unexpected REST status/URL/length')
            if response.status==204:
                return 204,{}
            require('application/json' in response.headers.get('Content-Type','').lower(),
                    'REST response not JSON')
            return response.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no automatic retry') from None
    except (error.URLError, OSError, TimeoutError, ValueError):
        raise Blocked('WordPress REST result uncertain; no automatic retry') from None

def live_baseline():
    code, health = rest('GET', HEALTH)
    require(code==200 and isinstance(health,dict), 'Live health unavailable')
    require(health.get('build_marker') == OLD_BUILD, 'Live theme is not the exact guarded legacy build')
    require(health.get('managed_content_items') == 60 and
            health.get('content_sync_status') == 'current' and
            health.get('content_sync_required') is False,
            'Live managed-content baseline has drifted')
    return health

def inventory(user,password):
    code, plugins=rest('GET',PLUGINS,user,password)
    require(code==200 and isinstance(plugins,list) and len(plugins)<100,
            'Protected plugin inventory unavailable')
    require(sum(1 for p in plugins if isinstance(p,dict) and
                str(p.get('plugin','')).startswith('code-snippets/')
                and p.get('status')=='active') == 1,
            'Code Snippets plugin not uniquely active')
    code, items=rest('GET',LIST,user,password)
    require(code==200 and isinstance(items,list) and len(items)<100,
            'Snippet inventory unavailable')
    for item in items:
        require(isinstance(item,dict), 'Unrecognized snippet inventory row')
        require(item.get('name') != NAME and
                'solar_expert_old_sync_guard_v1_remove' not in str(item.get('code','')),
                'Legacy hook guard already exists; never duplicate it')

def exact_snippet(user,password,active):
    code, payload=rest('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(payload,dict) and isinstance(payload.get('snippet'),dict):
        payload=payload['snippet']
    require(code==200 and isinstance(payload,dict)
            and payload.get('id')==SNIPPET_ID and payload.get('name')==NAME
            and str(payload.get('code','')).strip()==PHP_CODE.strip()
            and payload.get('active') is active,
            'Exact snippet code/identity/active readback failed')

def guard_status(user,password):
    code, data=rest('GET',GUARD,user,password)
    require(code==200 and isinstance(data,dict) and data.get('schema_version')==1
            and data.get('guard_active') is True
            and data.get('targeted_hook_count')==4
            and data.get('targeted_functions_defined')==4
            and data.get('targeted_hooks_remaining')==0
            and data.get('anonymous_after_switch_theme_not_proved') is True
            and data.get('theme_release_authorized') is False
            and data.get('word_press_writes')==0,
            'Legacy hook guard not demonstrably active; do not release theme')

def receipt(status, **extra):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    result={'schema_version':1,'status':status,'post_attempts':POSTS,
            'snippet_id':SNIPPET_ID,'wpvibe_calls':0,'theme_deployed':False,
            'content_sync_invocations':0,'release_authorized':False, **extra}
    RECEIPT.write_text(json.dumps(result,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print('SOLAR_OLD_SYNC_GUARD status='+status+' post_attempts='+str(POSTS)+
          ' release_authorized=false wpvibe=0')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                      'mode':'one_old_php_implicit_sync_hook_guard'},
            'Guard release control not exactly armed')
    live_baseline()
    inventory(user,password)
    payload={'name':NAME,'code':PHP_CODE,'scope':'global','active':False,'desc':DESCRIPTION}
    status,response=rest('POST','/code-snippets/v1/snippets',user,password,payload)
    row=response.get('snippet',response) if isinstance(response,dict) else {}
    require(status in (200,201) and isinstance(row,dict)
            and type(row.get('id')) is int and row['id']>0,
            'Snippet create response ambiguous; do not retry')
    SNIPPET_ID=row['id']
    exact_snippet(user,password,False)
    live_baseline()
    status,_=rest('POST',f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',user,password)
    require(status in (200,201,204),'Snippet activate response ambiguous; do not retry')
    exact_snippet(user,password,True)
    guard_status(user,password)
    live_baseline()
    receipt('wp_verified',targeted_hook_count=4,remaining_old_hooks=0,
            after_switch_theme_not_proved=True)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        reason=str(exc)
        if not re.match(r'^(Guard|Live|Protected|Code|Snippet|Legacy|Exact|Unexpected|WordPress|Unapproved|Missing|REST|Unrecognized)',reason):
            reason='unknown or ambiguous precondition'
        receipt('blocked_no_retry',reason=reason[:130])
        sys.exit(2)

if __name__=='__main__':
    main()
