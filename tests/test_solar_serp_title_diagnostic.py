"""GET-only SERP diagnosis with exact field redaction and no unsafe HTTP paths."""
import unittest
from unittest.mock import patch
from scripts import solar_serp_title_diagnostic as d
from scripts import solar_serp_boundary_release as s

class TestSerpTitleDiagnostic(unittest.TestCase):
    def test_allowed_exact_paths_only(self):
        self.assertEqual(len(d.ALLOWED),4)
        for bad in ('/wp/v2/posts/123', '/code-snippets/v1/snippets/12/deactivate',
                    '/wp/v2/settings', '//evil.example/'):
            with self.assertRaises(ValueError):
                d.fetch_json(bad,'u','p')

    def test_snippet_identity_and_integrity(self):
        x={'name':s.NAME,'active':True,'code':s.PHP_CODE,'id':27}
        verified=d.snippet_summary(200,[x])
        self.assertEqual(verified, {'inventory_verified':True,'exact_active':True,
                                    'exact_code':True,'count':1})
        self.assertFalse(d.snippet_summary(200,[{**x,'code':'evil'}])['exact_code'])
        self.assertEqual(d.snippet_summary(200,[x,x])['count'],2)
        self.assertFalse(d.snippet_summary(403,None)['inventory_verified'])

    def test_only_boolean_title_comparison(self):
        data=d.result_title({'title':s.TITLE,'description':s.DESC,'secret':'private'})
        self.assertEqual(data,{'available':True,'target_title':True,'target_description':True})
        self.assertEqual(d.result_title(None)['available'],False)

    def test_diagnosis_does_not_copy_html_private_data_or_credentials(self):
        h={'titles':['Old title'], 'descriptions':[s.DESC],'canonicals':[s.TARGET],
           'robots':[]}
        items=[{'id':27,'name':s.NAME,'code':s.PHP_CODE,'active':True,'secret':'private'}]
        plugins=[{'plugin':'code-snippets/code-snippets.php','status':'active'},
                 {'plugin':'wordpress-seo/wp-seo.php','status':'active'}]
        posts=[{'slug':s.SLUG,'id':100,'yoast_head_json':{'title':s.TITLE,'description':s.DESC}}]
        yoast={'json':{'title':'Old title','description':s.DESC}}
        with patch.object(d.source,'public_head',return_value=h), \
             patch.object(d,'fetch_json',side_effect=[(200,items),(200,plugins),(200,posts),(200,yoast)]) as calls:
            out=d.diagnose('private-user','private-password')
        self.assertEqual([c.args[0] for c in calls.call_args_list],list(d.ALLOWED))
        self.assertTrue(out['snippet']['exact_code'])
        self.assertFalse(out['public']['title_equals_intent'])
        self.assertTrue(out['word_press_rest']['post_yoast_json']['target_title'])
        self.assertFalse(out['word_press_rest']['yoast_head_json']['target_title'])
        self.assertEqual(out['wp_writes'],0)
        import json
        serialized=json.dumps(out)
        for secret in ['private','private-user','private-password']:
            self.assertNotIn(secret,serialized)

if __name__=='__main__':
    unittest.main()
