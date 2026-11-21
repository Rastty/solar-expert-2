import json
import unittest
from unittest.mock import patch
from scripts import solar_gsc_code_snippet_release as m

class SolarGSCCodeSnippetTests(unittest.TestCase):
    def setUp(self):
        m.POSTS_ATTEMPTED = 0
        m.SNIPPET_ID = None

    def test_only_exact_payload_and_routes(self):
        with self.assertRaises(m.Blocked):
            m.http("POST", "/wp/v2/posts", "u", "p", {"name": m.NAME})
        with self.assertRaises(m.Blocked):
            m.http("POST", "/code-snippets/v1/snippets", "u", "p",
                   {"name":m.NAME,"code":"arbitrary PHP","active":True})
        self.assertEqual(m.POSTS_ATTEMPTED,0)

    def test_refuse_duplicate_token_or_name(self):
        fake = [
          (200,[{"plugin":"code-snippets/code-snippets.php","status":"active"}]),
          (200,[{"id":7,"name":m.NAME,"code":"something else"}])
        ]
        with patch.object(m,"http",side_effect=fake):
            with self.assertRaisesRegex(m.Blocked,"duplicate"):
                m.existing("u","p")
        self.assertEqual(m.POSTS_ATTEMPTED,0)

    def test_exact_two_posts_and_one_public_tag(self):
        control = json.dumps({"schema_version":1,"enabled":True,"revision":1,
                              "mode":"one_site_owner_gsc_code_snippet"})
        calls=[]
        def fake_http(method,path,user,password,data=None):
            calls.append((method,path,data))
            if path==m.PLUGINS:return 200,[{"plugin":"code-snippets/code-snippets.php","status":"active"}]
            if path==m.LIST:return 200,[]
            if path=="/code-snippets/v1/snippets" and method=="POST":
                return 201,{"id":47}
            if path=="/code-snippets/v1/snippets/47" and method=="GET":
                return 200,{"id":47,"name":m.NAME,"code":m.EXPECTED_CODE,
                            "active":len([r for r in calls if r[1].endswith("/activate")])>0}
            if path=="/code-snippets/v1/snippets/47/activate":
                return 200,{"id":47,"active":True}
            raise AssertionError(path)
        heads=iter([
          {"head_present":True,"total_google_verification_tags_in_head":0},
          {"head_present":True,"total_google_verification_tags_in_head":0},
          {"head_present":True,"total_google_verification_tags_in_head":1,
           "verified_on_live_html":True}
        ])
        with patch.object(m,"http",side_effect=fake_http), \
             patch.object(m,"read_live",side_effect=lambda:next(heads)), \
             patch.object(m,"save") as saver, \
             patch.object(m,"CONTROL") as control_mock:
            control_mock.read_text.return_value=control
            m.execute("admin","app_password")
        self.assertEqual([r[1] for r in calls if r[0]=="POST"],
            ["/code-snippets/v1/snippets","/code-snippets/v1/snippets/47/activate"])
        saver.assert_called_once()
        self.assertEqual(saver.call_args.args[0],"wp_verified")
        self.assertEqual(m.SNIPPET_ID,47)

    def test_public_existing_verification_fails_before_writes(self):
        control = json.dumps({"schema_version":1,"enabled":True,"revision":1,
                              "mode":"one_site_owner_gsc_code_snippet"})
        with patch.object(m,"CONTROL") as c,patch.object(m,"read_live",
             return_value={"head_present":True,"total_google_verification_tags_in_head":1}), \
             patch.object(m,"http") as http:
            c.read_text.return_value=control
            with self.assertRaises(m.Blocked):
                m.execute("admin","pass")
            http.assert_not_called()
        self.assertEqual(m.POSTS_ATTEMPTED,0)

if __name__=="__main__":
    unittest.main()
