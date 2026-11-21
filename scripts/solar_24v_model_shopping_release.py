#!/usr/bin/env python3
"""Release one reversible, example-only 24V priced model buyer card to WP.

Pinned commercial decision model: exact dev composer validated one Best Value
24V electrical candidate over CURRENT 7-PV-Isc/48-quote public REST JSON in
GitHub Actions #44899415593: GOOWEI 24/100 battery, Victron Phoenix 24/1200,
Victron MPPT 100/30, 4x Victron 190Wp in 2S2P = 34,109 CZK primary
parts only at source-dated prices. This is NOT a custom electrical design or
installer sign-off. Runtime revalidates physical limits and seller evidence
for each component, discloses outstanding checks, and hides the card if any
source, price, stock or technical datum cannot be trusted. It DOES NOT
replace the site Builder engine or change the user's numeric inputs.

One inactive Code Snippets PHP create + exact readback + activation; no theme,
catalog, managed post, feed, affiliate mapping or shortcode modification.
Never retry an ambiguous write. Deactivate this unique snippet to revert.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import request,error

from scripts import solar_builder_recovery_release as existing
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

SITE=existing.SITE
REST=SITE+'/wp-json'
CONTROL=Path('ops/solar-24v-reviewed-model-card-release.json')
RECEIPT=Path('artifacts/solar-24v-reviewed-model-card-release.json')
NAME='Solar Expert exact 24V cottage reviewed buyer model v1'
DESC='Reversible 2S2P 24V example-only, fail-closed quote-priced buyer card'
MARKER='data-se-reviewed-24v-example'
MODE='one_reversible_source_checked_24v_example_card'
SNIPPET_ID=None
POST_ATTEMPTS=0

PHP_CODE=r"""
/** Narrow, first-party only; do not touch old Builder, matchers or posts. */
function solar_expert_reviewed_24v_model_card_v1_enqueue() {
    if (is_admin() ||
        !(is_front_page() || is_page('solarni-sestava-na-chatu')) ||
        !wp_script_is('solar-expert-builder', 'enqueued')) {
        return;
    }
    $js = <<<'SOLAR_REVIEWED_24V_MODEL_V1'
(function() {
  'use strict';
  const config = {
    marker: 'v1',
    origin: 'https://solar-expert.cz',
    buyerModelWh: 1448,
    buyerModelPeakW: 817,
    expectedInitialVoltage: 12,
    targetVoltage: 24,
    batteryRequiredKwh: 2.1,
    panelTargetWp: 700,
    panelCount: 4,
    panelSeries: 2,
    panelParallel: 2,
    quoteFreshDays: 30
  };
  const parts = [
    {kind:'battery',id:'battery-goowei-24-100',qty:1,label:'Baterie'},
    {kind:'inverter',id:'inverter-victron-24-1200',qty:1,label:'Měnič'},
    {kind:'mppt',id:'mppt-victron-100-30',qty:1,label:'MPPT regulátor'},
    {kind:'panel',id:'panel-victron-190',qty:4,label:'Solární panel 190 Wp'}
  ];
  const trustedSellerHosts = {
    'battery-cz': ['battery.cz','www.battery.cz'],
    'solar-import-cz': ['solar-import.cz','www.solar-import.cz']
  };
  function sourceVerified(raw) {
    if (!raw || !trustedSellerHosts[raw.merchant] ||
        raw.availability!=='in_stock' ||
        !Number.isFinite(Number(raw.price_czk)) ||
        Number(raw.price_czk)<=0 ||
        typeof raw.verified_at!=='string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(raw.verified_at)) return false;
    const day = new Date(raw.verified_at+'T00:00:00Z');
    const now = new Date();
    if (!Number.isFinite(day.getTime()) ||
        day.toISOString().slice(0,10)!==raw.verified_at ||
        day.getTime()>now.getTime() ||
        Math.floor((now.getTime()-day.getTime())/86400000)>config.quoteFreshDays) {
      return false;
    }
    try {
      const uri=new URL(raw.source_url);
      return uri.protocol==='https:'&&!uri.username&&!uri.password&&!uri.port &&
        trustedSellerHosts[raw.merchant].includes(uri.hostname) &&
        uri.pathname.length>1;
    } catch (_) { return false; }
  }
  function outbound(href) {
    if (typeof href!=='string' || !href ||
        /[\u0000-\u0020]/.test(href)) return false;
    try {
      const uri=new URL(href);
      const host=uri.hostname.toLowerCase();
      return uri.protocol==='https:' && !uri.username && !uri.password &&
        !uri.port &&
        (host==='ehub.cz'||host==='www.ehub.cz' ||
          Object.values(trustedSellerHosts).some(hosts=>hosts.includes(host)));
    } catch (_) {return false;}
  }
  function technicalCheck(catalog, state) {
    if (!Array.isArray(catalog) || catalog.length!==24 || !state || !state.result ||
        !state.previewMode || state.step!==4 || !state.catalogReady ||
        state.catalogError || state.catalogLoading ||
        Number(state.result.voltage)!==config.expectedInitialVoltage ||
        Number(state.result.energyWh)!==config.buyerModelWh ||
        Number(state.result.peak)!==config.buyerModelPeakW ||
        Number(state.result.panelWp)!==config.panelTargetWp ||
        !Array.isArray(state.completeBundles) || state.completeBundles.length!==0) return null;

    const map=new Map(catalog.map(x=>[x.id,x]));
    if (map.size!==24) return null;
    const b=map.get(parts[0].id);
    const i=map.get(parts[1].id);
    const m=map.get(parts[2].id);
    const p=map.get(parts[3].id);
    if (!b||!i||!m||!p) return null;
    if (b.type!=='battery'||b.sku!=='E8286'||Number(b.system_voltage_class)!==24 ||
        Number(b.energy_wh)<config.batteryRequiredKwh*1000 ||
        Number(b.max_discharge_a)*24<Math.ceil(config.buyerModelPeakW/0.90) ||
        !String(b.chemistry||'').toLowerCase().includes('lifepo4'))return null;
    if (i.type!=='inverter'||i.sku!=='E7540'||Number(i.dc_voltage)!==24 ||
        Number(i.continuous_w)<300 || Number(i.peak_w)<config.buyerModelPeakW ||
        i.lifepo4_charge_supported===false) return null;
    if (m.type!=='mppt'||m.sku!=='E7358'||
        !Array.isArray(m.battery_voltages)||!m.battery_voltages.includes(24) ||
        Number(m.max_pv_isc_a)!==35 ||
        Number(m.max_pv_w_by_voltage?.['24'])<760 ||
        Number(m.max_pv_voc_v)!==100 ||
        Number(m.min_pv_start_v_by_voltage?.['24'])!==29 ||
        !String(m.max_pv_isc_source_url||'').startsWith('https://www.victronenergy.com/media/pg/'))return null;
    if (p.type!=='panel'||p.sku!=='E8934'||Number(p.rated_wp)!==190 ||
        Number(p.isc_a)!==9.17||Number(p.voc_v)!==25.5||
        Number(p.vmp_v)!==21.8 || Number(p.cold_voc_factor)!==1.12 ||
        !String(p.isc_source_url||'').startsWith('https://www.solar-import.cz/'))return null;

    const totalWp=config.panelCount*Number(p.rated_wp);
    const coldVoc=config.panelSeries*Number(p.voc_v)*Number(p.cold_voc_factor);
    const arrayIsc=config.panelParallel*Number(p.isc_a);
    const vmp=config.panelSeries*Number(p.vmp_v);
    if (totalWp<config.panelTargetWp ||
        totalWp>Number(m.max_pv_w_by_voltage['24']) ||
        coldVoc>=Number(m.max_pv_voc_v)*.98 ||
        arrayIsc>Number(m.max_pv_isc_a)*.98 ||
        vmp<Number(m.min_pv_start_v_by_voltage['24']) ||
        config.panelSeries*config.panelParallel!==config.panelCount) return null;
    return map;
  }
  function buyerOffer(product,affiliate) {
    if (!product||!affiliate||typeof affiliate.offers!=='function')return null;
    const picks=affiliate.offers(product).filter(o=>o && sourceVerified(o.raw) &&
      o.availability==='in_stock' &&
      Number(o.price_czk)===Number(o.raw.price_czk) &&
      Number(o.price_czk)>0);
    const options=picks.map(o=>{
      const href=outbound(o.href)?o.href:o.raw.source_url;
      if(!outbound(href)) return null;
      return {raw:o.raw,price:Number(o.price_czk),href,
        monetized:href===o.href&&o.monetized===true,
        merchantId:o.merchantId,
        merchantLabel:o.merchant?.label||o.merchantId};
    }).filter(Boolean);
    return options.sort((a,b)=>a.price-b.price ||
      Number(b.monetized)-Number(a.monetized) ||
      String(a.merchantId).localeCompare(String(b.merchantId)))[0]||null;
  }
  function buildCandidate(state) {
    const byId=technicalCheck(state.catalog,state);
    if (!byId)return null;
    const affiliate=window.SolarExpertAffiliate;
    const rows=[];
    for (const item of parts) {
      const product=byId.get(item.id);
      const offer=buyerOffer(product,affiliate);
      if (!offer)return null; // No partial shopping list.
      rows.push({item,product,offer,subtotal:offer.price*item.qty});
    }
    const total=rows.reduce((a,row)=>a+row.subtotal,0);
    if (!Number.isSafeInteger(total) || total<=0 || total>=250000)return null;
    return {rows,total};
  }
  function element(tag,className,text) {
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function mount() {
    const root=document.querySelector('#builder[x-data="solarExpertBuilder()"]');
    const anchor=root?.querySelector('#builder-offers');
    if (!root||!anchor||!window.Alpine||
        typeof window.Alpine.effect!=='function' ||
        typeof window.Alpine.$data!=='function' ||
        root.querySelector('[data-se-reviewed-24v-example="v1"]'))return;
    const state=window.Alpine.$data(root);
    const card=element('section','se-panel se-reviewed-24v-example');
    card.setAttribute('data-se-reviewed-24v-example','v1');
    card.setAttribute('aria-label','Předběžná 24V sestava pro modelovou chatu');
    card.hidden=true;
    card.style.marginTop='16px';
    anchor.insertAdjacentElement('afterend',card);
    let fingerprint='';
    window.Alpine.effect(function() {
      const candidate=buildCandidate(state);
      if(!candidate){
        card.hidden=true;
        fingerprint='';
        return;
      }
      const signature=candidate.rows.map(x=>
        x.item.id+'|'+x.offer.merchantId+'|'+x.offer.price+'|'+x.offer.raw.verified_at).join('::');
      if(signature!==fingerprint){
        card.replaceChildren();
        card.appendChild(element('div','se-kicker','24V alternativa pro modelovou chatu'));
        card.appendChild(element('h3','',
          'Předběžný nákupní model hlavních komponent'));
        card.appendChild(element('p','se-muted',
          'Jen pro vzorovou chatu: spotřeba 1,448 kWh/den, jaro–podzim, rezerva baterie 1 den. '+
          'Výběr prošel modelovým napěťovým, proudovým a výkonovým testem; nejde o instalační projekt.'));
        const rowsBox=element('div','se-shopping-rows');
        for (const item of candidate.rows){
          const row=element('div','se-shopping-line');
          const left=element('div');
          left.appendChild(element('strong','',item.item.qty+'× '+item.product.name));
          left.appendChild(element('small','se-muted',
            item.offer.merchantLabel+' · ověřeno '+item.offer.raw.verified_at));
          const right=element('div','se-shopping-price');
          right.appendChild(element('strong','',
            item.subtotal.toLocaleString('cs-CZ')+' Kč'));
          const link=element('a','se-btn','Zobrazit produkt u prodejce ↗');
          link.href=item.offer.href;
          link.target='_blank';
          link.rel=item.offer.monetized?'sponsored nofollow noopener':'nofollow noopener';
          link.setAttribute('data-se-product-id',item.product.id);
          link.setAttribute('data-se-merchant',item.offer.merchantId);
          link.setAttribute('data-se-placement','builder-24v-reviewed-model');
          link.addEventListener('click',function() {
            if(typeof window.SolarExpertAffiliate?.trackOffer==='function') {
              window.SolarExpertAffiliate.trackOffer(
                item.product,item.offer.raw,'builder-24v-reviewed-model');
            }
          });
          right.appendChild(link);
          row.append(left,right);
          rowsBox.appendChild(row);
        }
        card.appendChild(rowsBox);
        const total=element('div','se-shopping-total');
        total.appendChild(element('strong','','Orientační součet hlavních dílů'));
        total.appendChild(element('strong','',
          candidate.total.toLocaleString('cs-CZ')+' Kč'));
        total.setAttribute('data-se-model-total','true');
        card.appendChild(total);
        card.appendChild(element('p','se-muted',
          'FV panely: 4×190 Wp, zapojení 2S2P (2 v sérii, 2 paralelní větve). '+
          'Battery.cz a Solar-Import.cz provozuje stejná společnost Efteria; '+
          'nejde o dvě nezávislé prodejny. Toto není jeden společný košík: '+
          'každou položku objednáváte zvlášť u uvedeného obchodníka.'));
        card.appendChild(element('p','se-muted',
          'Před nákupem musí odborník ověřit přesný teplotní koeficient a místní minimum, '+
          'BMS/měnič a proudy při rozběhu, kabeláž, jištění, ochrany, konstrukci, '+
          'montáž a revizi. Tyto položky nejsou v ceně. Aktuální dostupnost '+
          'a konečnou cenu ověřte přímo v obchodě.'));
        fingerprint=signature;
      }
      card.hidden=false;
    });
  }
  document.addEventListener('alpine:initialized',mount,{once:true});
})();
SOLAR_REVIEWED_24V_MODEL_V1;
    wp_add_inline_script('solar-expert-builder', $js, 'after');
}
add_action('wp_enqueue_scripts','solar_expert_reviewed_24v_model_card_v1_enqueue',99999);
"""

class Blocked(RuntimeError):pass

def require(condition,why):
    if not condition:raise Blocked(why)

def api(method,path,user,password,body=None):
    global POST_ATTEMPTS
    is_get=(method=='GET' and body is None and path in (
        existing.HEALTH,existing.SNIPPETS,existing.PLUGINS
    )) or (method=='GET' and body is None and SNIPPET_ID is not None and
            path==f'/code-snippets/v1/snippets/{SNIPPET_ID}')
    is_create=(method=='POST' and path=='/code-snippets/v1/snippets' and
        body=={'name':NAME,'code':PHP_CODE,'scope':'global',
               'active':False,'desc':DESC})
    is_activate=(method=='POST' and SNIPPET_ID is not None and body is None and
                 path==f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate')
    require(is_get or is_create or is_activate,'Forbidden WordPress request')
    require(bool(user and password),'Missing WordPress credentials')
    auth=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(REST+path,method=method,
        data=json.dumps(body,separators=(',',':')).encode() if body else None,
        headers={'Accept':'application/json','Content-Type':'application/json',
                 'Authorization':'Basic '+auth,
                 'User-Agent':'Solar24VExample-OneShot/1.0'})
    if method=='POST':POST_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as response:
            raw=response.read(700001)
            require(response.status in (200,201,204) and response.url==REST+path and
                    len(raw)<=700000,'WordPress REST identity/size/status drift')
            if response.status==204:return response.status,{}
            require('application/json' in response.headers.get('Content-Type','').lower(),
                    'WordPress response not JSON')
            return response.status,json.loads(raw)
    except error.HTTPError as e:
        raise Blocked('WordPress REST HTTP '+str(e.code)+'; never retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress REST response ambiguous; never retry') from None

def row(user,password,active):
    code,data=api('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(data,dict) and isinstance(data.get('snippet'),dict):
        data=data['snippet']
    require(code==200 and isinstance(data,dict) and
            data.get('id')==SNIPPET_ID and data.get('name')==NAME and
            data.get('scope')=='global' and data.get('active') is active and
            str(data.get('code','')).strip()==PHP_CODE.strip(),
            'Exact Code Snippets ID/source/activation readback failed')

def page_html(url):
    require(url.startswith(SITE+'/') and url.split('?')[0] in (
        SITE+'/',existing.BUILDER,existing.BATTERY),
        'Public probe URL not allowed')
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','Cache-Control':'no-cache,no-store',
        'User-Agent':'Solar24VExample-PublicGET/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as resp:
            raw=resp.read(1000001)
            require(resp.status==200 and resp.url==url and len(raw)<=1000000,
                    'Public page unexpected response')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,TimeoutError,OSError):
        raise Blocked('Public page unavailable; no write') from None

def preflight(user,password):
    existing.baseline(user,password)
    home=page_html(SITE+'/?se_24v_model_audit=before')
    builder=page_html(existing.BUILDER+'?se_24v_model_audit=before')
    battery=page_html(existing.BATTERY+'?se_24v_model_audit=before')
    require('data-se-builder-recovery' in home and
            'data-se-builder-recovery' in builder and
            'data-se-builder-cottage-model' in battery,
            'Previously released Builder and Battery handoff missing')
    require(all(MARKER not in h for h in (home,builder,battery)),
            'New 24V card already exists; no duplicate')
    status,plugins=api('GET',existing.PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100 and
            sum(1 for p in plugins if isinstance(p,dict) and
                    str(p.get('plugin','')).startswith('code-snippets/') and
                    p.get('status')=='active')==1,
            'Code Snippets plugin not uniquely active')
    status,items=api('GET',existing.SNIPPETS,user,password)
    require(status==200 and isinstance(items,list) and len(items)<100,
            'Code Snippets list incomplete')
    require(not any(isinstance(i,dict) and (
        i.get('name')==NAME or 'solar_expert_reviewed_24v_model_card_v1_enqueue' in
            str(i.get('code',''))) for i in items),'Existing card source present')
    existing.baseline(user,password)

def page_readback():
    home=page_html(SITE+'/?se_24v_model_audit=after')
    builder=page_html(existing.BUILDER+'?se_24v_model_audit=after')
    battery=page_html(existing.BATTERY+'?se_24v_model_audit=after')
    for label,html in (('homepage',home),('Builder',builder)):
        require(html.count("data-se-reviewed-24v-example")>=1 and
                'builder-24v-reviewed-model' in html and
                'solar-expert-builder' in html and
                'data-se-builder-recovery' in html,
                label+' scope/source marker not visible')
    require(MARKER not in battery and 'solar-expert-selectors' in battery,
            '24V card leaked into Battery Selector')

def receipt(status,**other):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
        'post_attempts':POST_ATTEMPTS,'theme_deployed':False,
        'product_catalog_writes':0,'managed_post_writes':0,
        'merchant_requests':0,'affiliate_clicks':0,'wpvibe_calls':0,**other}
    RECEIPT.write_text(json.dumps(data,indent=2,sort_keys=True)+'\n','utf-8')
    print('SOLAR_24V_MODEL status='+status+' post_attempts='+
          str(POST_ATTEMPTS)+' theme_deployed=false')
def execute(user,password):
    global SNIPPET_ID
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,'mode':MODE},
            '24V model release control not exactly armed')
    preflight(user,password)
    status,data=api('POST','/code-snippets/v1/snippets',user,password,
        {'name':NAME,'code':PHP_CODE,'scope':'global','active':False,'desc':DESC})
    rowdata=data.get('snippet',data) if isinstance(data,dict) else {}
    require(status in (200,201) and isinstance(rowdata,dict) and
            type(rowdata.get('id')) is int and rowdata['id']>0,
            'New snippet create response uncertain; no retry')
    SNIPPET_ID=rowdata['id']
    row(user,password,False)
    existing.baseline(user,password)
    status,_=api('POST',f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate',
                 user,password)
    require(status in (200,201,204),'Activation response uncertain; no retry')
    row(user,password,True)
    page_readback()
    existing.baseline(user,password)
    receipt('wp_verified',page_scope='homepage_and_Builder_only',
            model='example_only_24v_2S2P_source_priced',
            browser_execution_verified=False)
def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        why=str(exc)
        if not re.match(r'^(24V|Previously|New|WordPress|Code|Exact|Activation|Public|Existing|Forbidden|Missing|Homepage|Builder)',why):
            why='unknown or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=why[:145])
        sys.exit(2)
if __name__=='__main__':main()
