import unittest
from scripts.solar_gsc_code_snippet_schema import inspect
class TestSnippetSchema(unittest.TestCase):
    def test_only_route_shape_not_payload(self):
        root={"routes":{
            "/code-snippets/v1/snippets":{"endpoints":[{"methods":["POST"],"args":{"code":{"type":"string","required":True,"default":"private PHP"},"active":{"type":"boolean","required":False}}}]},
            "/secret/v1":{"endpoints":[{"methods":["POST"],"args":{"nonce":{"default":"PRIVATE"}}}]}
        }}
        r=inspect("u","p",fetch_impl=lambda:root)
        self.assertTrue(r["plugin_api_present"])
        self.assertEqual(len(r["routes"]),1)
        self.assertIn("code",r["routes"][0]["args"])
        self.assertEqual(r["routes"][0]["methods"],["POST"])
        self.assertNotIn("private PHP",repr(r))
        self.assertNotIn("PRIVATE",repr(r))
        self.assertEqual(r["writes"],0)
    def test_unknown_and_missing_auth_fail(self):
        with self.assertRaises(ValueError):inspect("","pass",fetch_impl=lambda:{})
        with self.assertRaises(ValueError):inspect("u","p",fetch_impl=lambda:{"routes":[]})
if __name__=="__main__":unittest.main()
