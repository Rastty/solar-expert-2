#!/usr/bin/env python3
"""Exact in-place WordPress upgrade of one existing Builder recovery snippet.

The earlier recovery handoff incorrectly used an UNRELATED panel400
0.7kWh/day model while Builder's reviewed cottage preview uses 1.448kWh/day.
This patch replaces only that link with a NEW immutable, clearly labeled
same-site 24V Battery Selector preset, never pretending that it is a full
system or silently transferring arbitrary URL electrical parameters.

No new snippet/theme/catalog/price/post/affiliate change. One CAS-like PUT;
never retry ambiguous outcome.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import error,request

from scripts import solar_builder_home_recovery_repair as before
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-builder-cottage-handoff-release.json'
RECEIPT=ROOT/'artifacts/solar-builder-cottage-handoff-receipt.json'
MODE='one_inplace_builder_model_cottage_24v_handoff'
OLD='/vyber-baterii/?scenario=panel400'
NEW='/vyber-baterii/?scenario=builder-chata'
DAILY_KWH=1.448
MODEL_VOLTAGE=24
MODEL_INVERTER_W=900
assert before.CODE.count(OLD)==1,'Prior existing Builder source not exactly pinned'
EXTRA_PHP=r"""
/**
 * One editorially reviewed, first-party model, not free-form URL electrical
 * fields or a complete configuration. Keep every other battery model intact.
 */
function solar_expert_cottage_battery_handoff_v2_enqueue() {
    if (is_admin() || !is_page('vyber-baterii') ||
        !wp_script_is('solar-expert-selectors', 'enqueued')) {
        return;
    }
    $js = <<<'SOLAR_BUILDER_COTTAGE_BATTERY_V2'
(function() {
  'use strict';
  // Never accept wattage, current, capacity, destination or price from URL.
  if (new URLSearchParams(window.location.search).get('scenario')!=='builder-chata') return;
  document.addEventListener('alpine:initialized', function() {
    const root=document.querySelector('[x-data="solarExpertBatterySelector()"]');
    if (!root || !window.Alpine || !window.Alpine.$data ||
        root.querySelector('[data-se-builder-cottage-model="v2"]')) return;
    const state=window.Alpine.$data(root);
    if (!state || typeof state.run!=='function') return;
    // Fixed reviewed original Builder demo: fridge 70W×10h, lights 40W×5h,
    // notebook 65W×4h, router 12W×24h = 1448Wh/day.
    // Alternate 24V battery model is NOT the same as an approved full system.
    // 900W is a conservative BMS DC/discharge-screening input greater than
    // the modeled fridge-start peak (~817W); inverter AC fit needs own check.
    Object.assign(state,{voltage:24,dailyKwh:1.448,autonomy:1,
      inverterW:900,articleExample:false,pendingExample:false});
    if (!state.catalogLoading && state.catalog?.length) state.run(false);
    const note=document.createElement('div');
    note.className='se-note';
    note.setAttribute('data-se-builder-cottage-model','v2');
    note.setAttribute('role','status');
    note.style.marginBottom='14px';
    const strong=document.createElement('strong');
    strong.textContent='Modelová chata z průvodce: 24 V, 1,448 kWh/den, rezerva 1 den.';
    const description=document.createElement('p');
    description.className='se-muted';
    description.textContent='Lednice, světla, notebook a Wi-Fi; požadavek 900 W zde slouží jako konzervativní model proudu BMS včetně rozběhu. Výsledek určuje pouze vhodnou baterii, nikoli schválenou solární sestavu. Čísla upravte podle svých spotřebičů a ověřte měnič, MPPT, jištění a kabeláž.';
    note.append(strong,description);
    root.insertBefore(note,root.firstChild);
  },{once:true});
})();
SOLAR_BUILDER_COTTAGE_BATTERY_V2;
    wp_add_inline_script('solar-expert-selectors', $js, 'after');
}
add_action('wp_enqueue_scripts', 'solar_expert_cottage_battery_handoff_v2_enqueue', 99999);
"""
CODE=before.CODE.replace(OLD,NEW)+EXTRA_PHP
assert CODE.count(NEW)>=1 and CODE.count('solar_expert_cottage_battery_handoff_v2_enqueue')==2
SNIPPET_ID=None
PUT_ATTEMPTS=0

class Blocked(RuntimeError):pass

def require(ok,reason):
    if not ok:raise Blocked(reason)

def rest(method,path,user,password,body=None):
    global PUT_ATTEMPTS
    get=method=='GET' and body is None and(
        path in (before.first.SNIPPETS,before.first.PLUGINS) or
        (SNIPPET_ID is not None and
         path==f'/code-snippets/v1/snippets/{SNIPPET_ID}'))
    put=(method=='PUT' and SNIPPET_ID is not None and
        path==f'/code-snippets/v1/snippets/{SNIPPET_ID}' and
        body=={'name':before.first.NAME,'code':CODE,'scope':'global',
               'active':True,'desc':before.first.DESCRIPTION})
    require(get or put,'Forbidden WordPress method/path/payload')
    require(bool(user and password),'Missing WP application credentials')
    auth=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(before.first.API+path,method=method,
        data=json.dumps(body,separators=(',',':')).encode() if body else None,
        headers={'Accept':'application/json','Content-Type':'application/json',
                 'Authorization':'Basic '+auth,
                 'User-Agent':'SolarCottageBattery-Handoff-OnePUT/1.0'})
    if method=='PUT':PUT_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(700001)
            require(res.url==before.first.API+path and
                    res.status in (200,201,204) and len(raw)<=700000,
                    'WordPress response ambiguous')
            if res.status==204:return res.status,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress JSON response missing')
            return res.status,json.loads(raw)
    except error.HTTPError as e:
        raise Blocked('WordPress HTTP '+str(e.code)+'; never retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress transport uncertain; never retry') from None

def row(user,password,expected):
    status,item=rest('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(item,dict) and isinstance(item.get('snippet'),dict):
        item=item['snippet']
    require(status==200 and isinstance(item,dict) and
            item.get('id')==SNIPPET_ID and item.get('name')==before.first.NAME and
            item.get('scope')=='global' and item.get('active') is True and
            str(item.get('code','')).strip()==expected.strip(),
            'Existing Builder recovery snippet source/identity/active drift')

def pages(before_release):
    home=before.public_home()
    builder=before.first.public_html(before.first.BUILDER+'?solar_cottage_handoff_verify=v2')
    battery=before.first.public_html(before.first.BATTERY+'?solar_cottage_handoff_verify=v2')
    target=OLD if before_release else NEW
    for label,html in (('homepage',home),('Builder',builder)):
        require(html.count('se-builder-recovery-note')==1 and
                target in html and (NEW if before_release else OLD) not in html,
                label+' Builder recovery link identity mismatch')
    if before_release:
        require('data-se-builder-cottage-model' not in battery,
                'Battery model handoff already installed; refuse duplicate')
    else:
        require('data-se-builder-cottage-model' in battery and
                "'builder-chata'" in battery and
                'solar-expert-selectors' in battery,
                'Battery selector is missing exact new model code')
        require('data-se-builder-cottage-model' not in home and
                'data-se-builder-cottage-model' not in builder,
                'Battery-only code escaped intended page scope')
    require(before.first.PHP_CODE.count(OLD)==1,'Immutable source changed')

def preflight(user,password):
    global SNIPPET_ID
    before.first.baseline(user,password)
    pages(True)
    status,plugins=rest('GET',before.first.PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for p in plugins if isinstance(p,dict) and
                str(p.get('plugin','')).startswith('code-snippets/') and
                p.get('status')=='active')==1,'Code Snippets not uniquely active')
    status,items=rest('GET',before.first.SNIPPETS,user,password)
    require(status==200 and isinstance(items,list) and len(items)<100,
            'Incomplete Code Snippets inventory')
    matches=[p for p in items if isinstance(p,dict) and
             p.get('name')==before.first.NAME]
    require(len(matches)==1 and type(matches[0].get('id')) is int and
            matches[0].get('active') is True and
            str(matches[0].get('code','')).strip()==before.CODE.strip() and
            matches[0].get('scope')=='global',
            'Existing exact Builder recovery source differs; no PATCH')
    SNIPPET_ID=matches[0]['id']
    row(user,password,before.CODE)
    pages(True)

def receipt(status,**details):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    r={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
       'put_attempts':PUT_ATTEMPTS,'new_snippets':0,
       'wordpress_post_writes':0,'catalog_changed':False,
       'theme_deployed':False,'affiliate_clicks':0,**details}
    RECEIPT.write_text(json.dumps(r,sort_keys=True,indent=2)+'\n','utf-8')
    print('SOLAR_COTTAGE_HANDOFF status='+status+' put_attempts='+
          str(PUT_ATTEMPTS)+' new_snippets=0 theme_deployed=false')

def execute(user,password):
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,'mode':MODE},
            'Cottage handoff source-locked release control not armed')
    preflight(user,password)
    status,_=rest('PUT',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password,
        {'name':before.first.NAME,'code':CODE,'scope':'global',
         'active':True,'desc':before.first.DESCRIPTION})
    require(status in (200,201,204),'Snippet PUT response uncertain; never retry')
    row(user,password,CODE)
    pages(False)
    before.first.baseline(user,password)
    receipt('wp_verified',page_scope='homepage_builder_and_selected_battery_model',
            daily_kwh=DAILY_KWH,voltage=MODEL_VOLTAGE,
            bms_screening_w=MODEL_INVERTER_W,
            browser_execution_verified=False)

def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        why=str(exc)
        if not re.match(r'^(Cottage|WordPress|Battery|Existing|Forbidden|Missing|Incomplete|Code|Snippet|Homepage|Builder|Immutable)',why):
            why='unknown or ambiguous precondition'
        receipt('blocked_no_retry',reason=why[:135])
        sys.exit(2)

if __name__=='__main__':main()
