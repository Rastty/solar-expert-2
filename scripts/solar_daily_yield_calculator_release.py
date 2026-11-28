"""One exact PUT to the existing active daily yield snippet. Never replay."""
import base64,hashlib,json,os,sys,re
from urllib import request,error
from scripts import solar_daily_yield_answer_release as old
from scripts import solar_grid_battery_calculator_paths_release as targets
from scripts.solar_gsc_direct_rest_preflight import NoRedirect
ROOT=old.ROOT
CONTROL=ROOT/'ops/solar-daily-yield-calculator-release.json'
RECEIPT=ROOT/'artifacts/solar-daily-yield-calculator-release.json'
MODE='one_existing_daily_yield_calculator_put'
SOURCE_BLOB='eceb4e282f2a758ca5b920210841b815cc68ac2d'
CODE=(ROOT/'content/snippets/daily-yield-answer-v2-calculator.php').read_text(encoding='utf-8')
raw=CODE.encode()
assert hashlib.sha1(('blob '+str(len(raw))+'\0').encode()+raw).hexdigest()==SOURCE_BLOB
assert old.SOURCE_BLOB=='ff33a44c431a6d80682e3c86e6576e6a855dbbbf'
PAYLOAD={'name':old.NAME,'code':CODE,'scope':'global','active':True,'desc':old.DESC}
ID=None
PUTS=0
class Blocked(RuntimeError):pass
def require(ok,why):
    if not ok:raise Blocked(why)
def api(method,path,user,password,body=None):
    global PUTS
    target=f'/code-snippets/v1/snippets/{ID}' if type(ID) is int and ID>0 else None
    require((method=='GET' and path in (old.SNIPPETS,old.PLUGINS,target) and body is None) or
        (method=='PUT' and target is not None and path==target and body==PAYLOAD and PUTS==0),'Unapproved request')
    require(bool(user and password),'Missing credentials')
    token=base64.b64encode((user+':'+password).encode()).decode()
    req=request.Request(old.API+path,method=method,data=json.dumps(body).encode() if body else None,
      headers={'Authorization':'Basic '+token,'Accept':'application/json','Content-Type':'application/json','User-Agent':'SolarDailyYieldCalculator-OnePUT/1.0'})
    if method=='PUT':PUTS+=1
    try:
        with request.build_opener(NoRedirect()).open(req,timeout=30) as res:
            data=res.read(750001)
            require(res.url==old.API+path and res.status in (200,204) and len(data)<=750000,'Unexpected response')
            if res.status==204:return 204,{}
            require('application/json' in res.headers.get('Content-Type','').lower(),'Non-JSON response')
            return res.status,json.loads(data)
    except (error.HTTPError,error.URLError,OSError,TimeoutError,ValueError):
        raise Blocked('Ambiguous REST outcome; never retry') from None
def check_row(user,password,code):
    st,row=api('GET',f'/code-snippets/v1/snippets/{ID}',user,password)
    if isinstance(row,dict) and isinstance(row.get('snippet'),dict):row=row['snippet']
    require(st==200 and isinstance(row,dict) and row.get('id')==ID and row.get('name')==old.NAME and
      row.get('scope')=='global' and row.get('active') is True and str(row.get('code','')).strip()==code.strip(),'Exact active snippet source drift')
def public(after):
    old.check_public(True)
    slug='/kolik-vyrobi-fotovoltaika-za-den/'
    html=old.public(slug)
    marker='<section data-se-daily-yield-calc-v2="1"'
    require(html.count(marker)==(1 if after else 0),'Unexpected calculator section count')
    if after:
        expected=re.search(r'<script id="se-dyc-script-v2">([\s\S]*?)</script>',CODE)
        live=re.search(r'<script id="se-dyc-script-v2">([\s\S]*?)</script>',html)
        require(html.count('id="se-dyc-script-v2"')==1 and bool(expected and live and expected.group(1).strip()==live.group(1).strip()) and all(html.count('id="se-dyc-'+x+'"')==1 for x in ('power','sun','factor','direct','charge','eff','buy','sell')) and all(x in html for x in ('85 Kč','24 kWh','5,4 kWh','0,6 kWh','data-dyc-results','/kdy-ma-smysl-fotovoltaika/#se-bic-title','/kolik-stoji-fotovoltaika/#kontrola-domovni-fve')),'Public calculator code or defaults missing')
    else:
        require('id="se-dyc-script-v2"' not in html,'Existing duplicate script')
    require(all(marker not in old.public(path) for path in ('/','/solarni-sestava-na-chatu/')),'Calculator leaked outside scope')
    require(targets.public('/kdy-ma-smysl-fotovoltaika/').count('id="se-bic-title"')==1 and targets.public('/kolik-stoji-fotovoltaika/').count('id="kontrola-domovni-fve"')==1,'Destination anchor missing')

def receipt(status,**kw):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    data={'status':status,'snippet_id':ID,'put_attempts':PUTS,'native_post_writes':0,'catalog_writes':0,'synthetic_analytics_posts':0,'new_snippets':0,**kw}
    RECEIPT.write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
    print('SOLAR_DAILY_YIELD_CALCULATOR status='+status+' puts='+str(PUTS)+' snippet_id='+str(ID))
def execute(user,password):
    global ID
    require(json.loads(CONTROL.read_text())=={'schema_version':1,'enabled':True,'revision':1,'mode':MODE,'source_blob_sha1':SOURCE_BLOB},'Control disarmed or drift')
    public(False)
    st,rows=api('GET',old.SNIPPETS,user,password)
    require(st==200 and isinstance(rows,list) and len(rows)<100,'Incomplete inventory')
    hits=[r for r in rows if isinstance(r,dict) and r.get('name')==old.NAME]
    require(len(hits)==1 and type(hits[0].get('id')) is int and hits[0]['id']>0,'Existing snippet identity drift')
    ID=hits[0]['id']
    check_row(user,password,old.PHP_CODE)
    st,_=api('PUT',f'/code-snippets/v1/snippets/{ID}',user,password,PAYLOAD)
    require(st in (200,204),'Unknown PUT result; no retry')
    check_row(user,password,CODE)
    public(True)
    receipt('wp_verified',public_source_verified=True,browser_proof_pending=True)
def main():
    try:execute(os.getenv('SOLAR_WP_USER','').strip(),os.getenv('SOLAR_WP_APP_PASSWORD','').strip())
    except (Blocked,old.Blocked,targets.Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        receipt('blocked_no_retry',reason=str(exc)[:160])
        sys.exit(2)
if __name__=='__main__':main()
