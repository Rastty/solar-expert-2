#!/usr/bin/env python3
"""Solar Expert's four revenue-critical 24V quotes: authorized XML feed evidence.

Uses previously established GitHub secret names BATTERY_CZ_FEED_URL and
SOLAR_IMPORT_FEED_URL; never prints URLs, query tokens or feed bodies.
Never visits eHub click endpoints, merchant checkout links, WordPress writes,
GitHub mutations or updates quote verified_at automatically.

Only same-merchant exact product path PLUS source-model tokens PLUS a live
gross CZK price PLUS explicit stock state qualifies for dated evidence.
Missing, incomplete, blocked, ambiguous and changed data never renew dates.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from xml.etree import ElementTree as ET

SITE="https://solar-expert.cz"
REST=SITE+"/wp-json/solar-quote-overlay/v2/catalog"
OUT=Path("artifacts/solar-24v-authorized-feed-evidence.json")
MAX_FEED=25_000_000
MAX_REST=650_000
FEEDS={
    "battery-cz":("BATTERY_CZ_FEED_URL","www.battery.cz"),
    "solar-import-cz":("SOLAR_IMPORT_FEED_URL","www.solar-import.cz"),
}
TARGETS=(
    ("battery-goowei-24-100","E8286","battery-cz",("goowei","cnlfp100-25.6"),1),
    ("inverter-victron-24-1200","E7540","battery-cz",("victron","1200","24v"),1),
    ("mppt-victron-100-30","E7358","battery-cz",("victron","smartsolar","100/30"),1),
    ("panel-victron-190","E8934","solar-import-cz",("victron","190w"),4),
)

class Blocked(RuntimeError): pass
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

def require(ok,why):
    if not ok:raise Blocked(why)

def secure_url(raw,host):
    require(isinstance(raw,str) and 12<len(raw)<1024,"invalid_url_secret")
    try:u=urlsplit(raw)
    except ValueError:raise Blocked("invalid_url_secret") from None
    require(u.scheme=="https" and u.hostname in (host,host.removeprefix("www.")) and
            u.username is None and u.password is None and u.port is None and
            len(u.path)>5 and not u.fragment,
            "url_not_authorized_merchant")
    return raw

def read_source(url,accept,limit):
    req=Request(url,method="GET",headers={
        "Accept":accept,"Cache-Control":"no-cache",
        "Accept-Encoding":"identity","User-Agent":"SolarExpert-AuthorizedFeed-Evidence/1.0"})
    try:
        with build_opener(NoRedirect()).open(req,timeout=35) as r:
            require(r.status==200 and r.url==url,"source_not_exact_200")
            data=r.read(limit+1)
            require(0<len(data)<=limit,"source_size_unbounded")
            return data
    except (HTTPError,URLError,TimeoutError,OSError):
        raise Blocked("source_unavailable_or_redirected") from None

def load_rest():
    data=json.loads(read_source(REST,"application/json",MAX_REST))
    require(isinstance(data.get("products"),list) and len(data["products"])==24,
            "live_rest_catalog_cohort_changed")
    return {p["id"]:p for p in data["products"]}

def local(tag):
    return str(tag).split("}")[-1].split(":")[-1].upper()

def item_field(node,*names):
    wanted={x.upper() for x in names}
    for child in node:
        if local(child.tag) in wanted and child.text:
            return child.text.strip()
    return None

def model_name_qualified(name,tokens):
    norm=re.sub(r"\s+"," ",str(name or "").lower())
    return all(token in norm for token in tokens)

def money(raw):
    if not isinstance(raw,str):return None
    text=raw.strip().replace("\xa0"," ")
    text=re.sub(r"\s+CZK$","",text,flags=re.I)
    if re.fullmatch(r"\d{1,6},\d{1,2}",text):
        text=text.replace(",",".")
    if not re.fullmatch(r"\d{1,6}(?:\.\d{1,2})?",text):
        return None
    try:n=Decimal(text)
    except InvalidOperation:return None
    return int(n) if n>0 and n<250000 and n==n.to_integral() else None

def stock(item):
    raw=item_field(item,"AVAILABILITY")
    if raw:
        state=raw.strip().lower().replace("_"," ")
        if state in ("in stock","instock","skladem"):return "in_stock"
        if state in ("out of stock","outofstock","není skladem"):return "out_of_stock"
        return None
    # Heureka XML feed semantics: DELIVERY_DATE=0 means immediately in stock.
    delivery=item_field(item,"DELIVERY_DATE")
    if delivery=="0":return "in_stock"
    if delivery and re.fullmatch(r"\d{1,2}",delivery):
        return "on_request"
    return None

def canonical_path(url,expected_host):
    try:
        u=urlsplit(url)
        if (u.scheme!="https" or
            u.hostname not in (expected_host,expected_host.removeprefix("www.")) or
            u.username or u.password or u.port or not u.path):
            return None
        return u.path.rstrip("/")
    except (TypeError,ValueError):
        return None

def parse_exact_feed(feed_bytes,products,merchant,host):
    require(len(feed_bytes)<=MAX_FEED,"feed_oversize")
    require(b"<!DOCTYPE" not in feed_bytes.upper() and
            b"<!ENTITY" not in feed_bytes.upper(),"unsafe_xml_doctype_or_entity")
    try:root=ET.fromstring(feed_bytes)
    except ET.ParseError:raise Blocked("invalid_authorized_xml_feed") from None
    items=[item for item in root.iter()
           if local(item.tag) in ("SHOPITEM","ITEM")]
    require(0<len(items)<200000,"unexpected_feed_item_count")
    evidence={}
    for pid,sku,seller,tokens,qty in TARGETS:
        if seller!=merchant:continue
        product=products.get(pid)
        require(product and product.get("sku")==sku,
                "live_rest_model_identity_changed")
        offers=product.get("offers") or []
        selected=[o for o in offers if o.get("merchant")==seller]
        require(len(selected)==1,"catalog_seller_row_not_unique")
        quoted=selected[0]
        target_path=canonical_path(quoted.get("source_url"),host)
        require(target_path is not None,"catalog_source_path_untrusted")
        matches=[]
        for item in items:
            link=item_field(item,"URL","LINK")
            if canonical_path(link,host)!=target_path:continue
            name=item_field(item,"PRODUCTNAME","PRODUCT","TITLE")
            if not model_name_qualified(name,tokens):continue
            price=money(item_field(item,"PRICE_VAT","PRICE"))
            # The generic PRICE field is ambiguous VAT treatment; only
            # Heureka PRICE_VAT and Google price with explicit CZK are valid.
            gross=item_field(item,"PRICE_VAT")
            google=item_field(item,"PRICE")
            if gross is None and google is not None:
                if not re.search(r"\bCZK$",google.strip(),re.I):price=None
            availability=stock(item)
            matches.append((price,availability))
        if len(matches)!=1:
            evidence[pid]={"status":"not_unique_exact_sku_url" if matches else
                "exact_model_and_path_not_found","price_czk":None,
                "availability":None}
            continue
        price,availability=matches[0]
        evidence[pid]={"status":"verified_feed_quote" if price and availability else
            "incomplete_feed_price_or_stock",
            "price_czk":price if price and availability else None,
            "availability":availability if price and availability else None}
    return len(items),evidence

def capture(environ=os.environ, now=None):
    now=now or datetime.now(timezone.utc)
    catalog=load_rest()
    rows=[]
    merchant_summaries={}
    for merchant,(secret_key,host) in FEEDS.items():
        secret=environ.get(secret_key,"")
        if not secret:
            merchant_summaries[merchant]={"status":"feed_secret_missing"}
            for pid,sku,m,_,qty in TARGETS:
                if m==merchant:
                    rows.append({"id":pid,"merchant":m,"sku":sku,"qty":qty,
                        "status":"not_configured","observed_at_utc":None})
            continue
        try:
            url=secure_url(secret,host)
            data=read_source(url,"application/xml,text/xml",MAX_FEED)
            item_count,found=parse_exact_feed(data,catalog,merchant,host)
            merchant_summaries[merchant]={"status":"parsed","items":item_count,
                "content_sha256":hashlib.sha256(data).hexdigest()}
            for pid,sku,m,_,qty in TARGETS:
                if m!=merchant:continue
                product=catalog[pid]
                quote=next(o for o in product["offers"] if o["merchant"]==m)
                q=found[pid]
                same=(q["status"]=="verified_feed_quote" and
                    q["price_czk"]==int(quote.get("price_czk") or 0) and
                    q["availability"]==quote.get("availability"))
                rows.append({"id":pid,"sku":sku,"merchant":m,"qty":qty,
                  "status":("same_quote" if same else "quote_changed")
                    if q["status"]=="verified_feed_quote" else q["status"],
                  "catalog_price_czk":quote.get("price_czk"),
                  "catalog_availability":quote.get("availability"),
                  "catalog_verified_at":quote.get("verified_at"),
                  "observed_price_czk":q["price_czk"],
                  "observed_availability":q["availability"],
                  "observed_at_utc":now.isoformat() if q["status"]=="verified_feed_quote" else None})
        except (Blocked,ValueError,TypeError,KeyError) as exc:
            # Never print feed URLs or token-bearing exceptions.
            reason=str(exc)
            if reason not in ("invalid_url_secret","url_not_authorized_merchant",
                "source_unavailable_or_redirected","source_not_exact_200",
                "source_size_unbounded","feed_oversize",
                "unsafe_xml_doctype_or_entity","invalid_authorized_xml_feed",
                "unexpected_feed_item_count","live_rest_model_identity_changed",
                "catalog_seller_row_not_unique","catalog_source_path_untrusted"):
                reason="unverified_feed_condition"
            merchant_summaries[merchant]={"status":reason}
            for pid,sku,m,_,qty in TARGETS:
                if m==merchant:rows.append({"id":pid,"sku":sku,"merchant":m,
                    "qty":qty,"status":"feed_unverified","observed_at_utc":None})
    rows.sort(key=lambda row:row["id"])
    require(len(rows)==4,"incomplete_four_product_accounting")
    verified=sum(row["status"] in ("same_quote","quote_changed") for row in rows)
    return {
      "schema_version":1,"mode":"authorized_2_merchant_xml_feed_quote_evidence",
      "observed_run_at_utc":now.isoformat(),
      "merchant_sources":merchant_summaries,"rows":rows,
      "selected_sku_count":4,"verified":verified,
      "changed":sum(r["status"]=="quote_changed" for r in rows),
      "unknown":4-verified,
      "wordpress_writes":0,"affiliate_network_gets":0,
      "affiliate_clicks":0,"automatic_date_refresh":False,
      "configured_secret_values_logged":False
    }

def main():
    try:report=capture()
    except (Blocked,KeyError,ValueError,TypeError):
        report={"schema_version":1,"status":"blocked_no_write",
            "wordpress_writes":0,"affiliate_clicks":0,
            "automatic_date_refresh":False}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,
                              indent=2)+"\n",encoding="utf-8")
    print("SOLAR_AUTHORIZED_FEED_EVIDENCE status="+
      report.get("status","captured")+" verified="+str(report.get("verified",0))+
      "/4 changed="+str(report.get("changed",0))+
      " unknown="+str(report.get("unknown",4))+
      " writes=0 affiliate_clicks=0")
    for merchant,row in report.get("merchant_sources",{}).items():
        print("SOLAR_FEED merchant="+merchant+" status="+row.get("status","unknown")+
            " items="+str(row.get("items","unknown")))
    for row in report.get("rows",[]):
        print("SOLAR_FEED_SKU id="+row["id"]+" status="+row["status"]+
            " observed_price="+str(row.get("observed_price_czk","unknown")))
    if report.get("status")=="blocked_no_write":sys.exit(2)

if __name__=="__main__":main()
