"""One exact PUT to existing active candidate snippet #17; no new snippet."""
import base64, hashlib, json, os, sys
from pathlib import Path
from urllib import request,error
from scripts import solar_battery_24v_high_current_release as old
from scripts.solar_gsc_direct_rest_preflight import NoRedirect
ROOT=old.ROOT
CONTROL=ROOT/'ops/solar-candidate-offer-measurement.json'
RECEIPT=ROOT/'artifacts/solar-candidate-offer-measurement.json'
MODE='one_existing_candidate_measurement_put'
BLOB='c48a205553d33e80423424def9c75a2e2fc27b00'
JS=(ROOT/'assets/js/battery-24v-high-current-measured.js').read_text(encoding='utf-8')
raw=JS.encode()
assert hashlib.sha1(('blob '+str(len(raw))+'\0').encode()+raw).hexdigest()==BLOB
assert old.PHP_CODE.count(old.JS)==1
CODE=old.PHP_CODE.replace(old.JS,JS,1)
ID=17
PATH='/code-snippets/v1/snippets/17'
PAYLOAD={'name':old.NAME,'code':CODE,'scope':'global','active':True,'desc':old.DESC}
PUTS=0
class Blocked(RuntimeError):pass
def require(ok,why):
    if not ok:raise Blocked(why)
def api(method,path,user,password,body=None):
    global PUTS
    require((method=='GET' and path in (PATH,old.PLUGINS,old.SNIPPETS) and body is None) or
        (method=='PUT' and path==PATH and body==PAYLOAD),'Unapproved request')
    require(bool(user and password),'Missing credentials')
    token=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(old.API+path,method=method,data=json.dumps(body).encode() if body else None,
      headers={'Authorization':'Basic '+token,'Accept':'application/json','Content-Type':'application/json','User-Agent':'SolarCandidateMeasurement-OnePUT/1.0'})
    if method=='PUT':PUTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            raw=res.read(750001)
            require(res.url==old.API+path and res.status in (200,204) and len(raw)<=750000,'Unexpected response')
            if res.status==204:return 204,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),'Non-JSON response')
            return res.status,json.loads(raw)
    except (error.HTTPError,error.URLError,OSError,TimeoutError,ValueError):
        raise Blocked('Ambiguous REST outcome; never retry') from None
def check_row(user,password,code):
    st,row=api('GET',PATH,user,password)
    if isinstance(row,dict) and isinstance(row.get('snippet'),dict):row=row['snippet']
    require(st==200 and isinstance(row,dict) and row.get('id')==ID and row.get('name')==old.NAME and
      row.get('scope')=='global' and row.get('active') is True and str(row.get('code','')).strip()==code.strip(),'Exact active snippet source drift')
def public(after):
    for path in ('/vyber-baterii/','/vyber-menice/'):
        html=old.public(path)
        target=path=='/vyber-baterii/'
        require(('data-se-24v-high-current' in html)==target,'Existing candidate scope drift')
        require(('data-se-candidate-measurement' in html)==(after and target),'Measurement public source drift')
def receipt(status,**kw):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'status':status,'snippet_id':ID,'put_attempts':PUTS,'native_post_writes':0,'catalog_writes':0,'synthetic_analytics_posts':0,'new_snippets':0,**kw}
    RECEIPT.write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
    print('SOLAR_CANDIDATE_MEASUREMENT status='+status+' puts='+str(PUTS))
def execute(user,password):
    require(json.loads(CONTROL.read_text())=={'schema_version':1,'enabled':True,'revision':1,'mode':MODE,'source_blob_sha1':BLOB},'Control disarmed or drift')
    public(False)
    st,rows=api('GET',old.SNIPPETS,user,password)
    require(st==200 and isinstance(rows,list) and len(rows)<100,'Incomplete inventory')
    hits=[r for r in rows if isinstance(r,dict) and r.get('name')==old.NAME]
    require(len(hits)==1 and hits[0].get('id')==ID,'Existing snippet identity drift')
    check_row(user,password,old.PHP_CODE)
    public(False)
    check_row(user,password,old.PHP_CODE)
    st,_=api('PUT',PATH,user,password,PAYLOAD)
    require(st in (200,204),'Unknown PUT result; no retry')
    check_row(user,password,CODE)
    public(True)
    receipt('wp_verified',public_source_verified=True,browser_proof_pending=True)
def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError):
        receipt('blocked_no_retry')
        sys.exit(2)
if __name__=='__main__':main()
