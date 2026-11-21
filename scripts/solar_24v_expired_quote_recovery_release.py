#!/usr/bin/env python3
"""Keep four safe, exact 24V merchant destinations when price evidence expires.

SAME live active WordPress Code Snippet ID, ONE CAS-like in-place REST PUT.
No theme deployment, new snippet, product catalog write, price/date change,
new seller, synthetic affiliate click or electrical policy relaxation.

Old source hides the entire 24V model if ANY of four price snapshots is past
its 30-day window. New code presents either:
- all FOUR freshly priced source-backed offers with exact old subtotal; OR
- an explicit UNPRICED four-component buyer checklist with safe eHub deeplinks,
  no total, NO current availability or price claim and dated-source warning.
In both modes, electrical guard and exact first-party model remain mandatory.
"""
from __future__ import annotations
import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib import request,error

from scripts import solar_24v_model_shopping_release as old
from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/'ops/solar-24v-stale-quote-handoff-release.json'
RECEIPT=ROOT/'artifacts/solar-24v-stale-quote-handoff-release.json'
MODE='one_existing_24v_snippet_unpriced_expired_quote_fallback'
SNIPPET_ID=None
PUT_ATTEMPTS=0
class Blocked(RuntimeError):pass
def require(ok,why):
    if not ok:raise Blocked(why)

def once(source,start,end,new):
    require(source.count(start)==1 and source.count(end)==1,
        'Reviewed existing 24V snippet source segment drifted')
    a=source.index(start)
    b=source.index(end,a)
    return source[:a]+new+source[b:]

# Source model/technicalCheck, current-price evidence and seller maps remain
# literally unchanged. Only buyerOffer->buildCandidate and UI rendering gain
# a safe, clearly disclosed no-current-price path.
BUYER_SOURCE=r"""  function sourceOnlyOffer(product,affiliate) {
    if (!product || !affiliate || typeof affiliate.offers!=='function') return null;
    const candidates=affiliate.offers(product).filter(o=>o && o.raw &&
      o.raw.merchant===o.merchantId && o.monetized===true &&
      trustedSellerHosts[o.raw.merchant] &&
      typeof o.raw.verified_at==='string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(o.raw.verified_at));
    for (const o of candidates) {
      const checkDay=new Date(o.raw.verified_at+'T00:00:00Z');
      if (!Number.isFinite(checkDay.getTime()) ||
          checkDay.toISOString().slice(0,10)!==o.raw.verified_at ||
          checkDay.getTime()>Date.now()) continue;
      try {
        const source=new URL(o.raw.source_url);
        const route=new URL(o.href);
        if (source.protocol!=='https:' || source.username ||
            source.password || source.port ||
            !trustedSellerHosts[o.raw.merchant].includes(source.hostname) ||
            source.pathname.length<=1) continue;
        if (route.protocol!=='https:'||route.username||route.password||
            route.port||!['ehub.cz','www.ehub.cz'].includes(route.hostname)||
            !route.searchParams.get('a_aid')||
            !route.searchParams.get('a_bid')||
            !route.searchParams.get('desturl')) continue;
        // This historical source must resolve to the EXACT same product path.
        // An affiliate link to a generic storefront is not acceptable.
        const destination=new URL(route.searchParams.get('desturl'));
        if (destination.href!==source.href) continue;
        return {raw:o.raw,price:null,href:o.href,monetized:true,
          merchantId:o.merchantId,
          merchantLabel:o.merchant?.label||o.merchantId};
      }catch(_){}
    }
    return null;
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
    let fullyPriced=true;
    for (const item of parts) {
      const product=byId.get(item.id);
      const offer=buyerOffer(product,affiliate);
      const selected=offer||sourceOnlyOffer(product,affiliate);
      if (!selected)return null; // Never publish partial or unknown SKU list.
      if (!offer)fullyPriced=false;
      rows.push({item,product,offer:selected,
        subtotal:offer?offer.price*item.qty:null});
    }
    if (!fullyPriced)return {
      mode:'unpriced',
      // No mixed-mode price values anywhere in the rendered candidate.
      // Even one independently fresh quote may not create a partial subtotal.
      rows:rows.map(r=>({...r,subtotal:null,offer:{...r.offer,price:null}})),
      total:null
    };
    const total=rows.reduce((a,row)=>a+row.subtotal,0);
    if (!Number.isSafeInteger(total) || total<=0 || total>=250000)return null;
    return {mode:'priced',rows,total};
  }
"""
CODE=once(old.PHP_CODE,"  function buyerOffer(product,affiliate) {",
    "  function element(tag,className,text) {",BUYER_SOURCE)
def replace_exact(source,a,b):
    require(source.count(a)==1,'Reviewed original 24V DOM rendering fragment drifted')
    return source.replace(a,b,1)
CODE=replace_exact(CODE,
"""      const signature=candidate.rows.map(x=>
        x.item.id+'|'+x.offer.merchantId+'|'+x.offer.price+'|'+x.offer.raw.verified_at).join('::');""",
"""      const signature=candidate.mode+'|'+candidate.rows.map(x=>
        x.item.id+'|'+x.offer.merchantId+'|'+x.offer.price+'|'+x.offer.raw.verified_at).join('::');""")
CODE=replace_exact(CODE,
"""        card.appendChild(element('h3','',
          'Předběžný nákupní model hlavních komponent'));
        card.appendChild(element('p','se-muted',
          'Jen pro vzorovou chatu: spotřeba 1,448 kWh/den, jaro–podzim, rezerva baterie 1 den. '+
          'Výběr prošel modelovým napěťovým, proudovým a výkonovým testem; nejde o instalační projekt.'));""",
"""        card.setAttribute('data-se-quote-mode',candidate.mode);
        card.appendChild(element('h3','',
          candidate.mode==='priced'
          ? 'Předběžný nákupní model hlavních komponent'
          : 'Seznam komponent: ceny a dostupnost nyní neověřené'));
        card.appendChild(element('p','se-muted',
          'Jen pro vzorovou chatu: spotřeba 1,448 kWh/den, jaro–podzim, rezerva baterie 1 den. '+
          'Výběr prošel modelovým napěťovým, proudovým a výkonovým testem; nejde o instalační projekt.'));
        if(candidate.mode==='unpriced') {
          const warning=element('p','se-muted',
            'Cenové a skladové údaje všech položek už nejsou společně aktuálně ověřené. '+
            'Proto neuvádíme ceny, dostupnost ani součet. Odkazy slouží pouze '+
            'k ověření přesné položky přímo u obchodníka. Před objednávkou si '+
            'ověřte shodu SKU, cenu, stav skladu a technický návrh.');
          warning.setAttribute('role','status');
          warning.setAttribute('data-se-unpriced-warning','true');
          card.appendChild(warning);
        }""")
CODE=replace_exact(CODE,
"""          left.appendChild(element('small','se-muted',
            item.offer.merchantLabel+' · ověřeno '+item.offer.raw.verified_at));
          const right=element('div','se-shopping-price');
          right.appendChild(element('strong','',
            item.subtotal.toLocaleString('cs-CZ')+' Kč'));
          const link=element('a','se-btn','Zobrazit produkt u prodejce ↗');""",
"""          left.appendChild(element('small','se-muted',
            item.offer.merchantLabel+' · poslední zdrojový záznam '+item.offer.raw.verified_at+
            (candidate.mode==='unpriced'?' (neaktuální; neověřuje dostupnost)':'')));
          const right=element('div','se-shopping-price');
          if(candidate.mode==='priced') {
            right.appendChild(element('strong','',
              item.subtotal.toLocaleString('cs-CZ')+' Kč'));
          }else{
            right.appendChild(element('small','se-muted',
              'Cenu a skladovost ověřte u prodejce'));
          }
          const link=element('a','se-btn',candidate.mode==='priced'
            ? 'Zobrazit produkt u prodejce ↗'
            : 'Ověřit cenu a dostupnost ↗');""")
CODE=replace_exact(CODE,
"""        const total=element('div','se-shopping-total');
        total.appendChild(element('strong','','Orientační součet hlavních dílů'));
        total.appendChild(element('strong','',
          candidate.total.toLocaleString('cs-CZ')+' Kč'));
        total.setAttribute('data-se-model-total','true');
        card.appendChild(total);""",
"""        if(candidate.mode==='priced') {
          const total=element('div','se-shopping-total');
          total.appendChild(element('strong','','Orientační součet hlavních dílů'));
          total.appendChild(element('strong','',
            candidate.total.toLocaleString('cs-CZ')+' Kč'));
          total.setAttribute('data-se-model-total','true');
          card.appendChild(total);
        }""")
CODE=replace_exact(CODE,
"""          'montáž a revizi. Tyto položky nejsou v ceně. Aktuální dostupnost '+
          'a konečnou cenu ověřte přímo v obchodě.'));""",
"""          'montáž a revizi. Tyto položky nejsou v soupisu. Aktuální dostupnost '+
          'a konečnou cenu ověřte přímo v obchodě.'));""")
require(CODE!=old.PHP_CODE and CODE.count("data-se-quote-mode")==1 and
        CODE.count("sourceOnlyOffer(product,affiliate)")>=2,
        'New exact fail-closed mode was not generated')

def api(method,path,user,password,body=None):
    global PUT_ATTEMPTS
    get=(method=='GET' and body is None and path in(
         old.existing.HEALTH,old.existing.SNIPPETS,old.existing.PLUGINS)
         or (method=='GET' and body is None and SNIPPET_ID is not None and
             path==f'/code-snippets/v1/snippets/{SNIPPET_ID}'))
    payload={'name':old.NAME,'code':CODE,'scope':'global',
             'active':True,'desc':old.DESC}
    put=(method=='PUT' and SNIPPET_ID is not None and
        path==f'/code-snippets/v1/snippets/{SNIPPET_ID}' and body==payload)
    require(get or put,'Forbidden WordPress method/path/payload')
    require(bool(user and password),'Missing WordPress app credentials')
    auth=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(old.REST+path,method=method,
      data=json.dumps(body,separators=(',',':')).encode() if body else None,
      headers={'Accept':'application/json','Content-Type':'application/json',
          'Authorization':'Basic '+auth,
          'User-Agent':'Solar-24V-ExpiredQuote-EvidenceSafe-OnePUT/1.0'})
    if method=='PUT':PUT_ATTEMPTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(800001)
            require(res.status in (200,201,204) and
                    res.url==old.REST+path and len(raw)<=800000,
                    'Unexpected WordPress response status/url/size')
            if res.status==204:return res.status,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),
                    'WordPress response non-JSON')
            return res.status,json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress HTTP '+str(exc.code)+'; never retry') from None
    except (error.URLError,OSError,ValueError,TimeoutError):
        raise Blocked('WordPress response uncertain; never retry') from None

def row(user,password,code):
    status,got=api('GET',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password)
    if isinstance(got,dict) and isinstance(got.get('snippet'),dict):
        got=got['snippet']
    require(status==200 and isinstance(got,dict) and
        got.get('id')==SNIPPET_ID and got.get('name')==old.NAME and
        got.get('scope')=='global' and got.get('active') is True and
        str(got.get('code','')).strip()==code.strip(),
        'Exact existing 24V snippet source/ID/active readback drift')

def page(before):
    for link in (old.SITE+'/?solar_stale_card_audit='+('before' if before else 'after'),
                 old.existing.BUILDER+'?solar_stale_card_audit='+('before' if before else 'after')):
        html=old.page_html(link)
        require(old.MARKER in html and 'builder-24v-reviewed-model' in html,
                'Production 24V card source missing')
        require(('data-se-unpriced-warning' not in html) if before
                else ('data-se-unpriced-warning' in html and
                      'Cenové a skladové údaje' in html),
                'Public old/new 24V snippet guard not exact')
    battery=old.page_html(old.existing.BATTERY+
        '?solar_stale_card_audit='+('before' if before else 'after'))
    require(old.MARKER not in battery,'Quote fallback leaked into Battery Selector')

def preflight(user,password):
    global SNIPPET_ID
    old.existing.baseline(user,password)
    page(True)
    status,plugins=api('GET',old.existing.PLUGINS,user,password)
    require(status==200 and isinstance(plugins,list) and len(plugins)<100 and
        sum(1 for x in plugins if isinstance(x,dict) and
            str(x.get('plugin','')).startswith('code-snippets/') and
            x.get('status')=='active')==1,'Code Snippets plugin not active')
    status,items=api('GET',old.existing.SNIPPETS,user,password)
    require(status==200 and isinstance(items,list) and len(items)<100,
            'Incomplete WordPress snippet inventory')
    matches=[x for x in items if isinstance(x,dict) and x.get('name')==old.NAME]
    require(len(matches)==1 and type(matches[0].get('id')) is int and
        matches[0].get('active') is True and matches[0].get('scope')=='global' and
        str(matches[0].get('code','')).strip()==old.PHP_CODE.strip(),
        'Current 24V model source differs; refuse in-place modification')
    SNIPPET_ID=matches[0]['id']
    row(user,password,old.PHP_CODE)
    page(True)

def receipt(status,**other):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    result={'schema_version':1,'status':status,'snippet_id':SNIPPET_ID,
        'put_attempts':PUT_ATTEMPTS,'new_snippets':0,
        'wordpress_post_writes':0,'catalog_writes':0,
        'affiliate_clicks':0,'theme_deployed':False,**other}
    RECEIPT.write_text(json.dumps(result,sort_keys=True,indent=2)+'\n','utf-8')
    print('SOLAR_24V_STALE_QUOTES status='+status+' put_attempts='+
       str(PUT_ATTEMPTS)+' snippets_created=0 theme_deployed=false')

def execute(user,password):
    control=json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control=={'schema_version':1,'enabled':True,'revision':1,
                     'mode':MODE},'Stale 24V quote one-PUT control not armed')
    preflight(user,password)
    status,_=api('PUT',f'/code-snippets/v1/snippets/{SNIPPET_ID}',user,password,
      {'name':old.NAME,'code':CODE,'scope':'global','active':True,'desc':old.DESC})
    require(status in (200,201,204),'WordPress PUT return uncertain; never retry')
    row(user,password,CODE)
    page(False)
    old.existing.baseline(user,password)
    receipt('wp_verified',existing_snippet_updated=True,
      quote_freshness_days=30,priced_mode_preserved=True,
      expired_mode_unpriced_only=True,browser_timewarp_not_yet_proved=True)

def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        why=str(exc)
        if not re.match(r'^(Stale|Forbidden|Reviewed|Current|Existing|Production|Public|Exact|Missing|Incomplete|WordPress|Unexpected|Code|Quote|New)',why):
            why='unknown or ambiguous prerequisite'
        receipt('blocked_no_retry',reason=why[:135])
        sys.exit(2)
if __name__=='__main__':main()
