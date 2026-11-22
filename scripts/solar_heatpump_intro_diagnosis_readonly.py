#!/usr/bin/env python3
"""One-off immutable GET-only post/snippet evidence after uncertain CTA readback.
No WP writes, no E.ON/eHub requests, no raw source, URLs, credentials or tokens
in console/artifacts. Scope only the reviewed air-water article and snippet #14.
"""
import base64,json,os
from pathlib import Path
from urllib import error,request
from scripts.solar_gsc_direct_rest_preflight import NoRedirect
BASE='https://solar-expert.cz'
ROOT=BASE+'/wp-json'
SLUG='tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji'
MID='data-se-heatpump-intro-offer="v1"'
PLACE='data-se-placement="heatpump_airwater_intro"'
ORIGIN='https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/'
OUT=Path('artifacts/solar-heatpump-intro-readonly-diagnosis.json')
def get(url,user,password,private=False):
    heads={'Accept':'application/json' if private else 'text/html',
        'Cache-Control':'no-store,no-cache','User-Agent':'Solar-Heatpump-OneOff-ReadOnly/1.0'}
    if private:
        heads['Authorization']='Basic '+base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(url,method='GET',headers=heads)
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=28) as res:
            raw=res.read(2000001)
            if res.url!=url or res.status!=200 or len(raw)>2000000:
                return {'blocked':'response_identity_or_status'},None
            return {'status':200},json.loads(raw) if private else raw.decode('utf-8','replace')
    except (error.HTTPError,error.URLError,ValueError,OSError,TimeoutError) as e:
        return {'blocked':'http_or_network_read_failed'},None

def main():
    user=os.getenv('SOLAR_WP_USER','').strip()
    pwd=os.getenv('SOLAR_WP_APP_PASSWORD','').strip()
    if not(user and pwd):raise RuntimeError('Missing read-only WP credential environment')
    report={'schema_version':1,'mode':'authenticated_and_public_GET_only',
      'article_slug':SLUG,'snippet_id_expected':14,'site':BASE,
      'external_merchant_visits':0,'wordpress_writes':0,
      'partner_clicks':0,'commission_approved':'unknown'}
    status,info=get(ROOT+'/code-snippets/v1/snippets/14',user,pwd,True)
    if isinstance(info,dict) and isinstance(info.get('snippet'),dict):
        info=info['snippet']
    report['snippet']={'rest_status':status.get('status',None),
      'id_exact':isinstance(info,dict) and info.get('id')==14,
      'active':info.get('active') if isinstance(info,dict) else None,
      'name_matches':bool(isinstance(info,dict) and info.get('name')=='Solar Expert heatpump air-water qualified intro offer v1'),
      'source_marker_present':bool(isinstance(info,dict) and MID in str(info.get('code','')))}
    for typ in ('posts','pages'):
        url=ROOT+'/wp/v2/'+typ+'?slug='+SLUG+'&context=edit&per_page=2&_fields=id,slug,status,type,content,modified_gmt'
        st,rows=get(url,user,pwd,True)
        if isinstance(rows,list):
            report[typ]={'status':st.get('status'), 'count':len(rows)}
            if len(rows)==1 and isinstance(rows[0],dict):
                raw=(rows[0].get('content') or {}).get('raw','')
                report[typ].update({'id':rows[0].get('id'),'post_status':rows[0].get('status'),
                    'post_type':rows[0].get('type'),'modified_gmt':rows[0].get('modified_gmt'),
                    'raw_contains_exact_eon':ORIGIN in raw,'raw_has_paragraph_end':'</p>' in raw,
                    'raw_has_block_marker':MID in raw})
        else:
            report[typ]={'status':st.get('status'), 'count':None}
    url=BASE+'/'+SLUG+'/?solar_heatpump_diag=20261122'
    st,html=get(url,user,pwd,False)
    report['public']={'status':st.get('status'),
      'intro_marker_count':html.count(MID) if isinstance(html,str) else None,
      'placement_count':html.count(PLACE) if isinstance(html,str) else None,
      'eon_merchant_visible':ORIGIN in html if isinstance(html,str) else None,
      'lead_js_loaded':'lead-cta.js' in html if isinstance(html,str) else None}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('SOLAR_HEATPUMP_READONLY '+json.dumps(report,ensure_ascii=False))
    if(report['snippet']['rest_status']!=200 or report['public']['status']!=200):
        raise RuntimeError('Read-only diagnosis incomplete; do not retry WP writes')
if __name__=='__main__':main()
