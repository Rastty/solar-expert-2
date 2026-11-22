#!/usr/bin/env python3
"""GET-only E.ON lead path audit. Never request an affiliate/merchant URL.

WordPress emits a direct E.ON HTML fallback; JavaScript can replace it with a
tracked affiliate route. Check only public config; never click or claim commission.
"""
from __future__ import annotations
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib import error,parse,request
from scripts.solar_gsc_direct_rest_preflight import NoRedirect
from scripts.solar_serp_boundary_release import TARGET

OUTPUT=Path('artifacts/solar-eon-lead-path-readonly.json')
MARKER='eon-heat-pump'
SVJ_URL='https://solar-expert.cz/navratnost-fotovoltaicke-elektrarny-v-bytovem-dome/'
SVJ_MERCHANT_URL='https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/'
GRID_FVE_PATH='/kolik-stoji-fotovoltaika/'
SCRIPT_NAMES=('affiliate-adapter.js','lead-cta.js')

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[]
        self.anchors=[]
        self.script_src=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if tag=='a':
            self.anchors.append(data)
            if data.get('data-se-lead-id')==MARKER:
                self.links.append(data)
        elif tag=='script' and data.get('src'):
            self.script_src.append(data['src'])

def locate_config(html):
    # wp_localize_script outputs a public JavaScript JSON literal.
    match=re.search(r'\b(?:var|const|let)\s+SolarExpertConfig\s*=\s*',html)
    if not match:
        return None
    try:
        data,_=json.JSONDecoder().raw_decode(html[match.end():].lstrip())
        return data if isinstance(data,dict) else None
    except (json.JSONDecodeError,ValueError,TypeError):
        return None

def valid_outbound(value):
    if not isinstance(value,str) or not value or re.search(r'[\x00-\x20]',value):
        return False
    try:
        u=parse.urlsplit(value)
        host=(u.hostname or '').lower().rstrip('.')
        return u.scheme in ('http','https') and bool(host) and (
            not u.username and not u.password and host!='solar-expert.cz' and
            not host.endswith('.solar-expert.cz') and
            host not in ('localhost','127.0.0.1','::1'))
    except ValueError:
        return False

def valid_ehub(value):
    if not valid_outbound(value):
        return False
    u=parse.urlsplit(value)
    params=parse.parse_qs(u.query)
    return u.hostname.lower()=='ehub.cz' and u.path=='/system/scripts/click.php' and (
        bool(params.get('a_aid',[None])[0]) and bool(params.get('a_bid',[None])[0]))

def summarize(html):
    parser=LinkParser()
    parser.feed(html)
    cfg=locate_config(html)
    cfg=cfg if isinstance(cfg,dict) else {}
    amap=cfg.get('affiliateMap') if isinstance(cfg.get('affiliateMap'),dict) else {}
    leads=amap.get('leads') if isinstance(amap.get('leads'),dict) else {}
    bases=cfg.get('affiliateBases') if isinstance(cfg.get('affiliateBases'),dict) else {}
    mapped=leads.get(MARKER)
    base=bases.get('eon-cz')
    active=parser.links[0] if len(parser.links)==1 else {}
    href=active.get('href')
    fallback=active.get('data-se-fallback')
    loaded=all(any('/'+s in src for src in parser.script_src) for s in SCRIPT_NAMES)
    affiliate_mapped=valid_ehub(mapped)
    affiliate_base=valid_ehub(base)
    return {
       'schema_version':1,'site':'https://solar-expert.cz',
       'target_slug':TARGET.rstrip('/').rsplit('/',1)[-1],
       'method':'GET','external_link_visits':0,'wordpress_writes':0,'wpvibe_calls':0,
       'page':{'target_eon_links':len(parser.links),
               'fallback_matches_markup':href==fallback and valid_outbound(fallback),
               'lead_runtime_scripts_present':loaded,
               'config_object_present':bool(cfg)},
       'affiliate_configuration':{
          'exact_ehub_link':affiliate_mapped,
          'valid_ehub_base':affiliate_base,
          'valid_other_exact_mapping':valid_outbound(mapped) and not affiliate_mapped,
          'has_eon_key':MARKER in leads,
          'has_eon_base_key':'eon-cz' in bases,
          'potential_trackable_route':affiliate_mapped or affiliate_base},
       'proven_commission':False,
       'proven_browser_navigation':False,
    }

def _exact_first_party(href, path):
    if not isinstance(href,str):
        return False
    u=parse.urlsplit(href)
    return (u.path==path and not u.query and not u.fragment and
            ((u.scheme=='' and u.netloc=='' and href.startswith('/') and not href.startswith('//'))
             or (u.scheme=='https' and u.hostname=='solar-expert.cz' and
                 not u.username and not u.password and u.port is None)))

def svj_summarize(html):
    """Exact SVJ landing evidence; do not request any affiliate or E.ON URL."""
    parser=LinkParser()
    parser.feed(html)
    config=locate_config(html) or {}
    amap=config.get('affiliateMap') if isinstance(config.get('affiliateMap'),dict) else {}
    leads=amap.get('leads') if isinstance(amap.get('leads'),dict) else {}
    bases=config.get('affiliateBases') if isinstance(config.get('affiliateBases'),dict) else {}
    exact=sum(1 for a in parser.anchors if a.get('href')==SVJ_MERCHANT_URL)
    # A fallback can remain a direct merchant link; this does not prove a
    # qualified advertiser click or campaign eligibility for SVJ businesses.
    tagged=sum(1 for a in parser.anchors if a.get('data-se-lead-id')=='eon-svj' and
               a.get('data-se-fallback')==SVJ_MERCHANT_URL)
    grid=sum(1 for a in parser.anchors if _exact_first_party(a.get('href'),GRID_FVE_PATH))
    return {
       'page':'svj_payback', 'grid_fve_links':grid,
       'exact_eon_svj_links':exact, 'svj_lead_markup_count':tagged,
       'eon_network_config_present':valid_ehub(leads.get('eon-svj')) or valid_ehub(bases.get('eon-cz')),
       'program_accepts_svj_lead':'unknown',
       'attributed_affiliate_clicks':'unknown',
       'paid_commissions':'unknown',
       'method':'GET','external_link_visits':0,'wordpress_writes':0
    }


def public_html(url=TARGET):
    if url not in (TARGET,SVJ_URL):
        raise ValueError('Only reviewed first-party target URLs are allowed')
    req=request.Request(url,method='GET',headers={
        'Accept':'text/html','User-Agent':'SolarEon-PublicLinkAudit-GETOnly/1.0',
        'Cache-Control':'no-cache'})
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
            if res.status != 200 or res.url != url or (
                'text/html' not in res.headers.get('Content-Type','').lower()):
                raise RuntimeError('Unexpected target HTTP response')
            raw=res.read(1500001)
            if len(raw)>1500000:
                raise RuntimeError('Public HTML over limit')
            return raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,OSError,TimeoutError,ValueError):
        raise RuntimeError('Public target unavailable') from None

def main():
    data=summarize(public_html())
    data['svj']=svj_summarize(public_html(SVJ_URL))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(data,sort_keys=True,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    p=data['page'];a=data['affiliate_configuration']
    print('SOLAR_EON_LEAD_PATH status=public_get'
          +' links='+str(p['target_eon_links'])
          +' runtime='+str(p['lead_runtime_scripts_present']).lower()
          +' config='+str(p['config_object_present']).lower()
          +' exact_network='+str(a['exact_ehub_link']).lower()
          +' base_network='+str(a['valid_ehub_base']).lower()
          +' trackable_route='+str(a['potential_trackable_route']).lower()
          +' external_visits=0 writes=0')
    print('SOLAR_EON_SVJ_PATH status=public_get'
          +' grid_fve_links='+str(data['svj']['grid_fve_links'])
          +' exact_eon_svj_links='+str(data['svj']['exact_eon_svj_links'])
          +' source_checked_affiliate_candidate='+str(data['svj']['eon_network_config_present']).lower()
          +' external_visits=0 writes=0')
if __name__=='__main__':
    main()
