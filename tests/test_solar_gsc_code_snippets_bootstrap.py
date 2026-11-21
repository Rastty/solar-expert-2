import unittest
from unittest.mock import patch
from scripts import solar_gsc_code_snippets_bootstrap as boot

class GSCBootstrapTest(unittest.TestCase):
    def test_single_package_and_approved_urls_only(self):
        with self.assertRaises(boot.Blocked):
            boot.transport("POST",boot.PLUGIN_API,"","",{"slug":"unsafe","status":"active"})
        with self.assertRaises(boot.Blocked):
            boot.transport("POST",boot.PLUGIN_API,"","",{"slug":"code-snippets","status":"inactive"})
        with self.assertRaises(boot.Blocked):
            boot.transport("POST",boot.SITE+"/wp-json/wp/v2/posts","u","p",{"slug":"code-snippets","status":"active"})

    def test_existing_verification_or_disabled_plugin_never_writes(self):
        empty={"head_present":True,"total_google_verification_tags_in_head":0}
        self.assertEqual(boot.assess_before(empty,{}),"install_missing")
        self.assertEqual(boot.assess_before(empty,{"code-snippets/code-snippets.php":"active"}),"already_active")
        for state in ("inactive","unknown"):
            with self.assertRaises(boot.Blocked):
                boot.assess_before(empty,{"code-snippets/code-snippets.php":state})
        with self.assertRaises(boot.Blocked):
            boot.assess_before({"head_present":True,"total_google_verification_tags_in_head":1}, {})
        with self.assertRaises(boot.Blocked):
            boot.assess_before({"head_present":False,"total_google_verification_tags_in_head":0}, {})

    def test_only_allowlisted_one_post_mocked(self):
        reqs=[]
        def fake_transport(method,url,user,password,payload=None):
            reqs.append((method,url,payload))
            if method=="GET":
                return 200, ([{"plugin":"code-snippets/code-snippets.php","status":"active"}] if
                             any(q[0]=="POST" for q in reqs) else [])
            return 201,{"plugin":"code-snippets/code-snippets.php","status":"active"}
        with patch.object(boot,"transport",side_effect=fake_transport), \
             patch.object(boot,"read_live",return_value={"head_present":True,"total_google_verification_tags_in_head":0}), \
             patch.object(boot,"receipt") as r, \
             patch.object(boot,"CONTROL") as c:
            c.read_text.return_value='{"schema_version":1,"enabled":true,"revision":1,"mode":"once_install_code_snippets_for_gsc"}'
            boot.execute("user","app_pass")
            self.assertEqual([x for x in reqs if x[0]=="POST"],
                             [("POST",boot.PLUGIN_API,{"slug":"code-snippets","status":"active"})])
            r.assert_called_once()
        self.assertNotIn("app_pass",repr(reqs))

if __name__=="__main__":unittest.main()
