#!/usr/bin/env python3
"""Authenticated GET-only discovery of Code Snippets' WordPress REST contract."""
import base64
import json
import os
from pathlib import Path
from urllib import request,error
from scripts.solar_gsc_direct_rest_preflight import SITE,NoRedirect

OUTPUT=Path("artifacts/solar-gsc-snippet-rest-schema.json")

def inspect(user,password,fetch_impl=None):
    if not user or not password: raise ValueError("No WordPress Application Password")
    if fetch_impl is None:
        def fetch_impl():
            auth=base64.b64encode((user+":"+password).encode()).decode("ascii")
            req=request.Request(SITE+"/wp-json/",method="GET",headers={
                "Authorization":"Basic "+auth, "Accept":"application/json",
                "User-Agent":"Solar-GSC-CodeSnippets-Schema-GET/1.0"})
            try:
                with request.build_opener(NoRedirect()).open(req,timeout=25) as res:
                    if res.status!=200 or "application/json" not in res.headers.get("Content-Type","").lower():
                        raise ValueError("Cannot inspect WordPress REST index")
                    data=res.read(2_000_001)
                    if len(data)>2_000_000: raise ValueError("Oversize REST index")
                    return json.loads(data)
            except (error.HTTPError,error.URLError,OSError) as exc:
                raise ValueError("WordPress REST index unavailable") from None
    root=fetch_impl()
    if not isinstance(root,dict) or not isinstance(root.get("routes"),dict):
        raise ValueError("Invalid REST index")
    endpoints=[]
    for path,metadata in root["routes"].items():
        if not isinstance(path,str) or not path.startswith("/code-snippets/v1"):
            continue
        if not isinstance(metadata,dict): continue
        for end in metadata.get("endpoints",[]):
            if not isinstance(end,dict): continue
            names=end.get("args",{})
            fields={
                key:{"type":str(value.get("type","unspecified")),"required":value.get("required") is True}
                for key,value in names.items() if isinstance(names,dict) and
                isinstance(key,str) and isinstance(value,dict)
            } if isinstance(names,dict) else {}
            endpoints.append({"path":path,"methods":[m for m in end.get("methods",[]) if m in ("GET","POST","PUT","PATCH","DELETE")],"args":fields})
    return {"schema_version":1,"site":SITE,"source":"native_rest_index_readonly",
            "routes":endpoints,"writes":0,"wpvibe_calls":0,
            "plugin_api_present":any(e["path"].startswith("/code-snippets/v1/snippets") for e in endpoints),
            "theme_deployed":False}

def main():
    r=inspect(os.getenv("SOLAR_WP_USER","").strip(),os.getenv("SOLAR_WP_APP_PASSWORD","").strip())
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(r,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("SOLAR_GSC_SNIPPET_SCHEMA present="+str(r["plugin_api_present"]).lower()+" routes="+str(len(r["routes"]))+" writes=0")

if __name__=="__main__":main()
