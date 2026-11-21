import unittest
from unittest.mock import patch
from datetime import datetime, timezone

from tools import solar_24v_authorized_feed_evidence as m

def xml_item(sku,name,url,price,delivery="0"):
    return (f"<SHOPITEM><ITEM_ID>{sku}</ITEM_ID><PRODUCTNAME>{name}</PRODUCTNAME>"
        f"<URL>{url}</URL><PRICE_VAT>{price}</PRICE_VAT>"
        f"<DELIVERY_DATE>{delivery}</DELIVERY_DATE></SHOPITEM>")

def catalog():
    d={}
    for pid,sku,merchant,tokens,qty in m.TARGETS:
        host=m.FEEDS[merchant][1]
        price={"E8286":14690,"E7540":7431,"E7358":2984,"E8934":2251}[sku]
        d[pid]={"id":pid,"sku":sku,"offers":[{"merchant":merchant,
            "source_url":f"https://{host}/safe-product-{sku}/",
            "price_czk":price,"availability":"in_stock",
            "verified_at":"2026-11-07"}]}
    return d

class FeedEvidence(unittest.TestCase):
    def test_allowlist_and_protected_query_secret(self):
        self.assertEqual(
          m.secure_url("https://www.battery.cz/heureka/export/products.xml?hash=secret",
                       "www.battery.cz"),
          "https://www.battery.cz/heureka/export/products.xml?hash=secret")
        for url in ["http://www.battery.cz/feed.xml",
                    "https://ehub.cz/system/scripts/click.php?a_aid=secret",
                    "https://other.example.org/feed.xml",
                    "https://user:pass@www.battery.cz/feed.xml",
                    "https://www.battery.cz:443/feed.xml"]:
            with self.assertRaises(m.Blocked):
                m.secure_url(url,"www.battery.cz")

    def test_exact_source_path_model_gross_vat_and_stock_required(self):
        body=("<SHOP>"+xml_item("E8286",
            "GOOWEI ENERGY baterie CNLFP100-25.6 100Ah",
            "https://www.battery.cz/safe-product-E8286/","14690")+
            xml_item("E7540","Victron Phoenix VE.Direct 1200VA 24V",
            "https://www.battery.cz/safe-product-E7540/","7431")+
            xml_item("E7358","Victron SmartSolar MPPT 100/30",
            "https://www.battery.cz/safe-product-E7358/","2984")+"</SHOP>").encode()
        count,found=m.parse_exact_feed(body,catalog(),"battery-cz","www.battery.cz")
        self.assertEqual(count,3)
        self.assertEqual(len(found),3)
        self.assertTrue(all(v["status"]=="verified_feed_quote" for v in found.values()))
        self.assertEqual(found["mppt-victron-100-30"]["price_czk"],2984)
        bad=body.replace(b"safe-product-E7358",b"safe-product-other")
        _,found=m.parse_exact_feed(bad,catalog(),"battery-cz","www.battery.cz")
        self.assertEqual(found["mppt-victron-100-30"]["status"],
                         "exact_model_and_path_not_found")

    def test_no_inflated_price_or_unknown_stock_claim(self):
        self.assertEqual(m.money("2 984"),None)
        self.assertEqual(m.money("2,984.00"),None)
        self.assertEqual(m.money("2984.00 CZK"),2984)
        self.assertEqual(m.money("2984,00"),2984)
        self.assertEqual(m.money("0"),None)
        import xml.etree.ElementTree as ET
        self.assertEqual(m.stock(ET.fromstring("<x><DELIVERY_DATE>0</DELIVERY_DATE></x>")),
            "in_stock")
        self.assertEqual(m.stock(ET.fromstring("<x><DELIVERY_DATE>7</DELIVERY_DATE></x>")),
            "on_request")
        self.assertIsNone(m.stock(ET.fromstring("<x></x>")))
        with self.assertRaises(m.Blocked):
            m.parse_exact_feed(b"<!DOCTYPE x [<!ENTITY a 'evil'>]><SHOP></SHOP>",
                catalog(),"battery-cz","www.battery.cz")

    def test_google_rss_namespace_item_with_explicit_czk_and_stock(self):
        xml=('<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0">'
        '<channel><item>'
        '<g:title>Victron Energy Solární panel 190W/12V, monokrystalický</g:title>'
        '<g:link>https://www.solar-import.cz/safe-product-E8934/</g:link>'
        '<g:price>2251.00 CZK</g:price>'
        '<g:availability>in stock</g:availability>'
        '</item></channel></rss>').encode()
        count,found=m.parse_exact_feed(xml,catalog(),"solar-import-cz","www.solar-import.cz")
        self.assertEqual(count,1)
        self.assertEqual(found["panel-victron-190"]["status"],"verified_feed_quote")
        self.assertEqual(found["panel-victron-190"]["price_czk"],2251)

    def test_capture_uses_only_exact_two_authorized_feed_urls_and_no_writes(self):
        battery=("<?xml version='1.0'?><SHOP>"+
            xml_item("E8286","GOOWEI ENERGY CNLFP100-25.6 100Ah",
                "https://www.battery.cz/safe-product-E8286/","14690")+
            xml_item("E7540","Victron VE.Direct 1200VA 24V",
                "https://www.battery.cz/safe-product-E7540/","7431")+
            xml_item("E7358","Victron SmartSolar MPPT 100/30",
                "https://www.battery.cz/safe-product-E7358/","2984")+"</SHOP>").encode()
        solar=("<?xml version='1.0'?><SHOP>"+
            xml_item("E8934","Victron panel 190W/12V",
                "https://www.solar-import.cz/safe-product-E8934/","2251")+"</SHOP>").encode()
        observed=[]
        def data(url,accept,limit):
            observed.append(url)
            return battery if "battery.cz" in url else solar
        env={"BATTERY_CZ_FEED_URL":"https://www.battery.cz/export.xml?hash=hide",
             "SOLAR_IMPORT_FEED_URL":"https://www.solar-import.cz/export.xml?hash=hide"}
        with patch.object(m,"load_rest",return_value=catalog()),patch.object(
            m,"read_source",side_effect=data):
            report=m.capture(env,datetime(2026,11,21,12,0,tzinfo=timezone.utc))
        self.assertEqual(report["verified"],4)
        self.assertEqual(report["changed"],0)
        self.assertEqual(report["unknown"],0)
        self.assertEqual(report["wordpress_writes"],0)
        self.assertEqual(report["affiliate_network_gets"],0)
        self.assertEqual(len(observed),2)
        self.assertNotIn("hash=hide",str(report))
        self.assertTrue(all(row["status"]=="same_quote" for row in report["rows"]))
        self.assertTrue(all(row["observed_at_utc"] for row in report["rows"]))

    def test_missing_secrets_yields_unknown_not_new_verification(self):
        with patch.object(m,"load_rest",return_value=catalog()):
            report=m.capture({},datetime(2026,11,21,12,0,tzinfo=timezone.utc))
        self.assertEqual(report["verified"],0)
        self.assertEqual(report["unknown"],4)
        self.assertEqual(report["merchant_sources"]["battery-cz"]["status"],
            "feed_secret_missing")
        self.assertTrue(all(row["observed_at_utc"] is None for row in report["rows"]))

if __name__=="__main__":unittest.main()
