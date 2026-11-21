#!/usr/bin/env python3
"""Single guarded WordPress Code Snippets release: no-bundle Builder recovery UI.

Only appends a same-site Battery Selector model handoff when the *live* Alpine
Builder has completed a calculation with zero complete technical bundles.
No sizing rule, product quote, affiliate URL, theme, post content or catalog
source is changed. Exactly one inactive snippet create + one activation.
Never retry an ambiguous POST, always read back exact snippet and public HTML.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import error,request

from scripts.solar_gsc_direct_rest_preflight import NoRedirect

SITE='https://solar-expert.cz'
API=SITE+'/wp-json'
CONTROL=Path('ops/solar-builder-recovery-release.json')
RECEIPT=Path('artifacts/solar-builder-recovery-release.json')
NAME='Solar Expert Builder no-complete-bundle buyer recovery v1'
DESCRIPTION='Exact one-page dynamic safe alternative; never replace technical recommendation'
HEALTH='/solar-expert/v1/health'
SNIPPETS='/code-snippets/v1/snippets?context=edit&per_page=100'
PLUGINS='/wp/v2/plugins?context=edit&per_page=100'
BUILDER=SITE+'/solarni-sestava-na-chatu/'
BATTERY=SITE+'/vyber-baterii/'
MARKER='solar_expert_builder_recovery_v1_enqueue'
JS_MARKER='data-se-builder-recovery'
POST_ATTEMPTS=0
SNIPPET_ID=None
PHP_CODE="""/**
 * Exact Builder landing only. The overlay is removed by deactivating
 * THIS snippet; no managed content, theme or private mapping is touched.
 */
function solar_expert_builder_recovery_v1_enqueue() {
    if (is_admin() || !is_page('solarni-sestava-na-chatu') ||
        !wp_script_is('solar-expert-builder', 'enqueued')) {
        return;
    }
    $js = <<<'SOLAR_SAFE_BUYER_RECOVERY'
(function() {
  'use strict';
  const wire = function() {
    const root = document.querySelector('#builder[x-data="solarExpertBuilder()"]');
    if (!root || !window.Alpine || !window.Alpine.effect ||
        !window.Alpine.$data) return;
    const insertionPoint = root.querySelector('#builder-offers');
    if (!insertionPoint || root.querySelector('[data-se-builder-recovery="v1"]')) return;
    const note = document.createElement('aside');
    note.className = 'se-note se-builder-recovery-note';
    note.setAttribute('data-se-builder-recovery', 'v1');
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    note.setAttribute('hidden', '');
    note.style.marginTop = '16px';
    note.style.padding = '16px';
    note.innerHTML =
      '<strong>Sestavu zatím nelze bezpečně doporučit k nákupu.</strong>' +
      '<p class="se-muted" data-se-recovery-12v>Pro tento 12V příklad nemáme aktuálně skladem baterii s potřebnou kapacitou. ' +
      'Nepřevádějte samotnou baterii na jiné napětí bez návrhu celé sestavy.</p>' +
      '<p class="se-muted" data-se-recovery-general>Pro toto zadání nemáme dost doložených komponent ' +
      'pro kompletní bezpečně doporučenou sestavu.</p>' +
      '<a class="se-btn se-btn-primary" href="/vyber-baterii/?scenario=panel400" data-se-recovery-destination>' +
      'Prohlédnout modelový 24V výběr baterie →</a>' +
      '<p class="se-muted">Jde o jiný ilustrační příklad, ne náhradní hotovou sestavu. ' +
      'Před nákupem upravte spotřebu, výkon a ověřte kompatibilitu baterie, měniče i MPPT.</p>';
    insertionPoint.insertAdjacentElement('afterend', note);
    const state = window.Alpine.$data(root);
    const twelveVolt = note.querySelector('[data-se-recovery-12v]');
    const generic = note.querySelector('[data-se-recovery-general]');
    window.Alpine.effect(function() {
      const result = state.result;
      const safe = Array.isArray(state.completeBundles) &&
        state.completeBundles.length > 0;
      const show = state.step === 4 && !!state.catalogReady &&
        !state.catalogError && !!result && !safe;
      note.hidden = !show;
      twelveVolt.hidden = !show || Number(result?.voltage) !== 12;
      generic.hidden = !show || Number(result?.voltage) === 12;
    });
  };
  document.addEventListener('alpine:initialized', wire, {once:true});
})();
SOLAR_SAFE_BUYER_RECOVERY;
    wp_add_inline_script('solar-expert-builder', $js, 'after');
}
add_action('wp_enqueue_scripts', 'solar_expert_builder_recovery_v1_enqueue', 99999);
"""

class Blocked(RuntimeError):
    pass

def require(ok,why):
    if not ok:raise Blocked(why)

def request_rest(method,path,user,password,body=None):
    global POST_ATTEMPTS
    is_get=(method=='GET' and body is None and (
        path in (HEALTH,SNIPPETS,PLUGINS) or
        (SNIPPET_ID is not None and path==f'/code-snippets/v1/snippets/{SNIPPET_ID}')))
    is_create=(method=='POST' and path=='/code-snippets/v1/snippets' and
               body=={'name':NAME,'code':PHP_CODE,
                      'scope':'global','active':False,'desc':DESCRIPTION})
    is_activate=(method=='POST' and SNIPPET_ID is not None and
                 path==f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate'
                 and body is None)
    require(is_get or is_create or is_activate,'Forbidden REST path/method/payload')
    require(bool(user and password),'Missing WordPress credentials')
    token=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(API+path,method=method,
        data=json.dumps(body,separators=(',',':')).encode() if body else None,
        headers={'Accept':'application/json','Content-Type':'application/json',
                 'Authorization':'Basic '+token,
                 'User-Agent':'SolarBuilderRecovery-OneShot/1.0'})
    if method=='POST':POST_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(600001)
            require(res.status in (200,201,204) and res.url==API+path and
                    len(raw)<=600000,'WordPress REST response uncertain')
            if res.status==204:return 204,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress REST non-JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP '+str(exc.code)+'; no retry') from None
    except (error.URLError,OSError,TimeoutError,ValueError):
        raise Blocked('WordPress REST transport uncertain; no retry') from None

def public_html(url):
    require(url.startswith(SITE+'/') and url.split('?')[0] in (BUILDER,BATTERY),
            'Unexpected public page URL')
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-cache',
        'User-Agent':'SolarBuilderRecovery-PublicGET/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            raw=res.read(1000001)
            require(res.status==200 and res.url==url and len(raw)<=1000000,
                    'Public page failed readback')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError):
        raise Blocked('Public page GET uncertain; no retry') from None

def baseline(user,password):
    code,health=request_rest('GET',HEALTH,user,password)
    require(code==200 and isinstance(health,dict) and
            health.get('build_marker')=='dev-rc-0.12.27' and
            health.get('managed_content_items')==60 and
            health.get('content_sync_status')=='current' and
            health.get('content_sync_required') is False,
            'Current WP theme/managed-content precondition drifted')

def inventory(user,password):
    code,plugins=request_rest('GET',PLUGINS,user,password)
    require(code==200 and isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for x in plugins if isinstance(x,dict) and
                str(x.get('plugin','')).startswith('code-snippets/') and
                x.get('status')=='active')==1,
            'Code Snippets plugin not uniquely active')
    code,snippets=request_rest('GET',SNIPPETS,user,password)
    require(code==200 and isinstance(snippets,list) and len(snippets)<100,
            'Snippet inventory unavailable')
    for item in snippets:
        require(isinstance(item,dict) and item.get('name')!=NAME and
                MARKER not in str(item.get('code','')),
                'Recovery snippet already exists; never create duplicate')

def exact_readback(user,password,active):
    code,snip=request_rest('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(snip,dict) and isinstance(snip.get('snippet'),dict):
        snip=snip['snippet']
    require(code==200 and isinstance(snip,dict) and
            snip.get('id')==SNIPPET_ID and snip.get('name')==NAME and
            snip.get('active') is active and
            str(snip.get('code','')).strip()==PHP_CODE.strip(),
            'Exact snippet identity/source/active readback failed')

def public_readback():
    source=public_html(BUILDER+'?solar_recovery_verify=v1')
    comparison=public_html(BATTERY+'?solar_recovery_verify=v1')
    require(source.count(MARKER)==1 and source.count(JS_MARKER)>=1 and
            '/vyber-baterii/?scenario=panel400' in source and
            'solar-expert-builder' in source,
            'Builder page lacks exact recovery inline source or safe destination')
    require(MARKER not in comparison and JS_MARKER not in comparison,
            'Recovery snippet spilled into battery page')

def receipt(status,**extra):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'post_attempts':POST_ATTEMPTS,
          'snippet_id':SNIPPET_ID,'wpvibe_calls':0,'theme_deployed':False,
          'managed_post_writes':0,'affiliate_clicks':0,**extra}
    RECEIPT.write_text(json.dumps(data,sort_keys=True,indent=2)+'\n','utf-8')
    print('SOLAR_BUILDER_RECOVERY status='+status+' post_attempts='+
          str(POST_ATTEMPTS)+' wpvibe=0 theme_deployed=false')

def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text('utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                      'mode':'one_builder_empty_result_safe_handoff'},
            'Recovery release control not exactly armed')
    baseline(user,password)
    inventory(user,password)
    # The own destination exists; no network visit to a merchant.
    require('Jak vybrat LiFePO' in public_html(BATTERY),
            'Destination is not the existing battery decision tool')
    code,row=request_rest('POST','/code-snippets/v1/snippets',user,password,
                         {'name':NAME,'code':PHP_CODE,'scope':'global',
                          'active':False,'desc':DESCRIPTION})
    row=row.get('snippet',row) if isinstance(row,dict) else {}
    require(code in (200,201) and isinstance(row,dict) and
            type(row.get('id')) is int and row['id']>0,
            'Snippet create ambiguous; do not retry')
    SNIPPET_ID=row['id']
    exact_readback(user,password,False)
    baseline(user,password)
    code,_=request_rest('POST',
        f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',
        user,password)
    require(code in (200,201,204),'Snippet activate ambiguous; no retry')
    exact_readback(user,password,True)
    public_readback()
    baseline(user,password)
    receipt('wp_verified',scope='one_builder_page',
            destination='existing_24V_battery_example',
            safe_result_only=True,visible_in_browser_not_yet_proved=True)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,ValueError,TypeError,KeyError,OSError) as exc:
        reason=str(exc)
        if not re.match(r'^(Recovery|Current|Code|Snippet|Exact|Public|Destination|WordPress|Missing|Forbidden|Unexpected)',reason):
            reason='unknown or ambiguous precondition'
        receipt('blocked_no_retry',reason=reason[:130])
        sys.exit(2)

if __name__=='__main__':main()
