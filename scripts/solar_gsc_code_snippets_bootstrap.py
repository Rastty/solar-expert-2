#!/usr/bin/env python3
"""One-time WordPress.org Code Snippets installation for GSC without WPVibe.

Runs only on explicit GitHub push control activation. Never modifies the theme,
existing plugins or WordPress posts. On uncertain POST result: STOP, no retry.
"""
from __future__ import annotations
import base64
import json
import os
from pathlib import Path
import sys
from urllib import error, request
from scripts.solar_gsc_direct_rest_preflight import SITE, NoRedirect
from scripts.solar_gsc_verification_check import read_live

ROOT=Path(__file__).resolve().parents[1]
CONTROL=ROOT/"ops/gsc-snippet-bootstrap.json"
RECEIPT=ROOT/"artifacts/solar-gsc-snippet-bootstrap-receipt.json"
PLUGIN="code-snippets"
PLUGIN_API=SITE+"/wp-json/wp/v2/plugins"
MAX_BYTES=250000
POST_ATTEMPTED=False

class Blocked(RuntimeError): pass

def require(v,msg):
    if not v: raise Blocked(msg)

def transport(method,url,user,password,payload=None):
    require(method in ("GET","POST"),"Unsupported method")
    require(url in (PLUGIN_API+"?context=edit&per_page=100",PLUGIN_API),"Endpoint not allowlisted")
    require(bool(user) and bool(password),"Missing application credentials")
    require((method=="POST")==(url==PLUGIN_API),"POST route mismatch")
    if method=="POST":
        require(payload=={"slug":PLUGIN,"status":"active"},"Cannot install another package or adjust other fields")
    auth=base64.b64encode((user+":"+password).encode()).decode()
    req=request.Request(url,method=method,
        data=json.dumps(payload,separators=(",",":")).encode() if payload is not None else None,
        headers={"Authorization":"Basic "+auth,"Accept":"application/json",
                 "Content-Type":"application/json","User-Agent":"SolarGSC-Direct-Plugin-Bootstrap/1.0"})
    opener=request.build_opener(NoRedirect())
    global POST_ATTEMPTED
    if method=="POST":
        POST_ATTEMPTED=True
    try:
        with opener.open(req,timeout=35) as response:
            raw=response.read(MAX_BYTES+1)
            require(len(raw)<=MAX_BYTES,"Oversized REST payload")
            require("application/json" in response.headers.get("Content-Type","").lower(),"Non-JSON REST response")
            return response.status,json.loads(raw)
    except error.HTTPError as exc:
        # HTTP error codes are safe; do not log response bodies that could contain private data.
        raise Blocked("WordPress REST HTTP "+str(exc.code))
    except (error.URLError,TimeoutError,OSError,ValueError) as exc:
        raise Blocked("WordPress REST uncertain network/redirect outcome")

def inventory(user,password):
    status,items=transport("GET",PLUGIN_API+"?context=edit&per_page=100",user,password)
    require(status==200 and isinstance(items,list),"Authenticated installed-plugins inventory unavailable")
    return {str(p.get("plugin","")):str(p.get("status","")) for p in items if isinstance(p,dict)}

def receipt(status,**fields):
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    safe={"schema_version":1,"status":status,"wordpress_writes":fields.pop("writes",0),
          "theme_deployed":False,"wpvibe_calls":0,**fields}
    RECEIPT.write_text(json.dumps(safe,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print("SOLAR_GSC_SNIPPET_BOOTSTRAP status="+status+" writes="+str(safe["wordpress_writes"])+" wpvibe=0")

def assess_before(tag_result,items):
    require(tag_result.get("head_present") is True,"Public HTML head not verifiable")
    require(tag_result.get("total_google_verification_tags_in_head")==0,
            "Existing Google verification tag requires manual reconciliation")
    found=[(k,v) for k,v in items.items() if k.startswith(PLUGIN+"/")]
    if found:
        require(len(found)==1 and found[0][1]=="active","Plugin already installed but not safely active")
        return "already_active"
    return "install_missing"

def execute(user,password):
    control=json.loads(CONTROL.read_text(encoding="utf-8"))
    require(control=={"schema_version":1,"enabled":True,"revision":1,
                      "mode":"once_install_code_snippets_for_gsc"},
            "Exact reviewed bootstrap control not active")
    tag=read_live()
    items=inventory(user,password)
    action=assess_before(tag,items)
    if action=="already_active":
        receipt("existing_active",writes=0)
        return
    # Exactly ONE POST. If its result is unknown, never repeat automatically.
    status,created=transport("POST",PLUGIN_API,user,password,
                             {"slug":PLUGIN,"status":"active"})
    require(status in (200,201) and isinstance(created,dict) and
            str(created.get("plugin","")).startswith(PLUGIN+"/") and
            created.get("status")=="active",
            "Install response not exactly confirmed; no retry")
    next_items=inventory(user,password)
    require(len([key for key,value in next_items.items()
                 if key.startswith(PLUGIN+"/") and value=="active"])==1,
            "Installed plugin not confirmed active on independent GET; no retry")
    receipt("plugin_installed_verified",writes=1,
            note="Plugin installed/active. GSC code NOT inserted; next operation must inspect REST API and separately approve one snippet.")


def main():
    try: execute(os.getenv("SOLAR_WP_USER","").strip(),
                 os.getenv("SOLAR_WP_APP_PASSWORD","").strip())
    except (Blocked,OSError,ValueError,TypeError,KeyError) as exc:
        receipt("blocked_uncertain_no_retry",writes=None if POST_ATTEMPTED else 0,
                post_attempted=POST_ATTEMPTED,
                reason=str(exc)[:180])
        sys.exit(2)

if __name__=="__main__": main()
