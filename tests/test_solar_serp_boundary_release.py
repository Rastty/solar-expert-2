"""Offline exact-scope, PHP execution and WordPress one-write release regression."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from scripts import solar_serp_boundary_release as m

class TestSerpBoundary(unittest.TestCase):
    def setUp(self):
        m.POSTS_ATTEMPTED = 0
        m.SNIPPET_ID = None

    def test_exact_scope_and_non_mutating_php(self):
        self.assertIn(m.SLUG, m.PHP_CODE)
        self.assertEqual(m.PHP_CODE.count("add_filter('wpseo_title'"), 1)
        self.assertEqual(m.PHP_CODE.count("add_filter('wpseo_metadesc'"), 1)
        self.assertNotIn('the_content', m.PHP_CODE)
        for term in ('update_option(', 'wp_insert_post(', 'wp_update_post(', 'wp_remote_post(', 'eval('):
            self.assertNotIn(term, m.PHP_CODE)
        self.assertIn(m.TITLE, m.PHP_CODE)
        self.assertIn(m.DESC, m.PHP_CODE)

    def test_php_real_lint_and_slug_scope(self):
        if not shutil.which('php'):
            self.skipTest('PHP not installed')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root/'serp.php').write_text('<?php\n' + m.PHP_CODE, encoding='utf-8')
            lint = subprocess.run(['php', '-l', str(root/'serp.php')], capture_output=True, text=True, timeout=10)
            self.assertEqual(lint.returncode, 0, lint.stdout + lint.stderr)
            (root/'run.php').write_text("""<?php
$callbacks = []; $slug = 'other'; $type = 'post'; $admin = false;
function add_filter($name, $fn, $priority) { global $callbacks; $callbacks[$name] = $fn; }
function is_admin() { global $admin; return $admin; }
function is_singular($allowed) { global $type; return in_array($type, $allowed, true); }
function get_queried_object_id() { return 8; }
function get_post_field($key, $id) { global $slug; return $slug; }
require __DIR__ . '/serp.php';
$result = [];
foreach (['other', 'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda'] as $slug) {
  foreach (['post', 'page', 'attachment'] as $type) {
    $result[$slug][$type] = [$callbacks['wpseo_title']('original title'), $callbacks['wpseo_metadesc']('original meta')];
  }
}
$slug='umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda'; $type='post'; $admin=true;
$result['admin'] = $callbacks['wpseo_title']('original title');
echo json_encode($result, JSON_UNESCAPED_UNICODE);
""", encoding='utf-8')
            run = subprocess.run(['php', str(root/'run.php')], capture_output=True, text=True, timeout=10)
            self.assertEqual(run.returncode, 0, run.stderr)
            data = json.loads(run.stdout)
            for typ in ('post', 'page', 'attachment'):
                self.assertEqual(data['other'][typ], ['original title', 'original meta'])
            self.assertEqual(data[m.SLUG]['attachment'], ['original title', 'original meta'])
            for typ in ('post', 'page'):
                self.assertEqual(data[m.SLUG][typ], [m.TITLE, m.DESC])
            self.assertEqual(data['admin'], 'original title')

    def test_public_head_exact_canonical_and_noindex(self):
        html = '<html><head><title>Baseline</title><link rel="canonical" href="' + m.TARGET + '"><meta name="description" content="Old"></head></html>'
        parsed = m.inspect_head(html)
        m.verify_target(parsed, False)
        with self.assertRaises(m.Blocked):
            m.verify_target(parsed, True)
        after = html.replace('Baseline', m.TITLE).replace('content="Old"', 'content="' + m.DESC + '"')
        m.verify_target(m.inspect_head(after), True)
        with self.assertRaises(m.Blocked):
            m.verify_target(m.inspect_head(after.replace('canonical', 'alternate')), True)
        with self.assertRaises(m.Blocked):
            m.verify_target(m.inspect_head(after.replace('</head>', '<meta name="robots" content="noindex"></head>')), True)

    def test_only_preapproved_rest_write_shapes(self):
        for path, payload in [('/wp/v2/posts', {'title':'x'}),
                              ('/code-snippets/v1/snippets', {'code':'other'}),
                              ('/code-snippets/v1/snippets/88/activate', None)]:
            with self.assertRaises(m.Blocked):
                m.rest('POST', path, 'x', 'y', payload)
        self.assertEqual(m.POSTS_ATTEMPTED, 0)

    def test_active_snippet_exact_2_post_sequence(self):
        current = {'active': False}
        calls = []
        def fake_rest(method, path, user, password, body=None):
            calls.append((method, path, body))
            if path == m.PLUGINS:
                return 200, [{'plugin':'code-snippets/code-snippets.php','status':'active'},
                             {'plugin':'wordpress-seo/wp-seo.php','status':'active'}]
            if path == m.LIST:
                return 200, []
            if path == '/code-snippets/v1/snippets' and method == 'POST':
                return 201, {'id': 109}
            if path == '/code-snippets/v1/snippets/109':
                return 200, {'id': 109,'name':m.NAME,'code':m.PHP_CODE,'active':current['active']}
            if path == '/code-snippets/v1/snippets/109/activate':
                current['active'] = True
                return 200, {}
            raise AssertionError((method, path))
        def head():
            return {'titles':[m.TITLE if current['active'] else 'Old title'],
                    'descriptions':[m.DESC if current['active'] else 'Old meta'],
                    'canonicals':[m.TARGET], 'robots':[]}
        control = json.dumps({'schema_version':1,'enabled':True,'revision':1,
                              'mode':'one_hp_boundary_serp_snippet'})
        with patch.object(m, 'rest', side_effect=fake_rest), patch.object(m, 'public_head', side_effect=head), \
             patch.object(m, 'receipt') as receipt, patch.object(m, 'CONTROL') as config:
            config.read_text.return_value = control
            m.execute('x','y')
        posts = [x[1] for x in calls if x[0] == 'POST']
        self.assertEqual(posts, ['/code-snippets/v1/snippets', '/code-snippets/v1/snippets/109/activate'])
        self.assertEqual(receipt.call_args.args[0], 'wp_verified')

if __name__ == '__main__':
    unittest.main()
