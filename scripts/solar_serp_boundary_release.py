#!/usr/bin/env python3
"""Exact, reversible WordPress SERP-title experiment for one GSC-observed page.
GitHub Actions -> WP Application Password; no WPVibe, post edits, catalog or theme deploy.
Uncertain POST outcomes are never retried.
"""
from __future__ import annotations

import base64
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
from urllib import error, request

from scripts.solar_gsc_direct_rest_preflight import NoRedirect

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / 'ops/solar-serp-boundary-release.json'
RECEIPT = ROOT / 'artifacts/solar-serp-boundary-release.json'
SITE = 'https://solar-expert.cz/'
SLUG = 'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda'
TARGET = SITE + SLUG + '/'
API = SITE.rstrip('/') + '/wp-json'
PLUGINS = '/wp/v2/plugins?context=edit&per_page=100'
LIST = '/code-snippets/v1/snippets?context=edit&per_page=100'
NAME = 'Solar Expert heat pump boundary SERP intent v1'
DESCRIPTION = 'One exact heat pump boundary page: honest SEO title and description, no post edit.'
TITLE = 'Tepelné čerpadlo od hranice pozemku: vzdálenost a hluk 2026'
DESC = ('Jak daleko od souseda smí být tepelné čerpadlo? Univerzální odstup v metrech '
        'neexistuje. Rozhoduje hluk, umístění a podmínky konkrétní stavby.')
PHP_CODE = """function solar_expert_hp_boundary_serp_v1() {
    if (is_admin() || !is_singular(array('post', 'page'))) {
        return false;
    }
    return get_post_field('post_name', get_queried_object_id()) === 'umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda';
}
add_filter('wpseo_title', static function ($old) {
    return solar_expert_hp_boundary_serp_v1()
        ? 'Tepelné čerpadlo od hranice pozemku: vzdálenost a hluk 2026' : $old;
}, 90);
add_filter('wpseo_metadesc', static function ($old) {
    return solar_expert_hp_boundary_serp_v1()
        ? 'Jak daleko od souseda smí být tepelné čerpadlo? Univerzální odstup v metrech neexistuje. Rozhoduje hluk, umístění a podmínky konkrétní stavby.' : $old;
}, 90);
"""

POSTS_ATTEMPTED = 0
SNIPPET_ID = None

class Blocked(RuntimeError):
    pass

def require(ok, reason):
    if not ok:
        raise Blocked(reason)

def rest(method, path, user, password, body=None):
    global POSTS_ATTEMPTED
    get_ok = path in (PLUGINS, LIST) or bool(re.fullmatch(r'/code-snippets/v1/snippets/[1-9][0-9]*', path))
    create = path == '/code-snippets/v1/snippets' and body == {
        'name': NAME, 'code': PHP_CODE, 'scope': 'global', 'active': False, 'desc': DESCRIPTION
    }
    activate = (SNIPPET_ID is not None and path ==
                f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate' and body is None)
    require((method == 'GET' and get_ok and body is None) or
            (method == 'POST' and (create or activate)), 'Unapproved REST request')
    require(bool(user and password), 'Missing WordPress application credentials')
    token = base64.b64encode(f'{user}:{password}'.encode()).decode('ascii')
    data = json.dumps(body, separators=(',', ':')).encode() if body is not None else None
    req = request.Request(API + path, method=method, data=data, headers={
        'Authorization': 'Basic ' + token, 'Accept': 'application/json',
        'Content-Type': 'application/json', 'User-Agent': 'SolarSerpBoundary-OneShot/1.0'})
    if method == 'POST':
        POSTS_ATTEMPTED += 1
    try:
        with request.build_opener(NoRedirect()).open(req, timeout=30) as res:
            raw = res.read(700001)
            require(res.status in (200, 201, 204) and len(raw) <= 700000,
                    'Malformed WordPress REST response')
            if res.status == 204:
                return res.status, {}
            require('application/json' in res.headers.get('Content-Type', '').lower(),
                    'WordPress REST non-JSON response')
            return res.status, json.loads(raw)
    except error.HTTPError as exc:
        raise Blocked('WordPress REST HTTP ' + str(exc.code)) from None
    except (error.URLError, OSError, TimeoutError, ValueError):
        raise Blocked('WordPress REST result uncertain; no retry') from None

class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.in_title = False
        self.titles = []
        self.meta = []
        self.canonical = []
        self.robots = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'head':
            self.in_head = True
        elif self.in_head and tag == 'title':
            self.in_title = True
            self.titles.append('')
        elif self.in_head and tag == 'meta':
            name = str(attrs.get('name', '')).lower()
            if name == 'description':
                self.meta.append(attrs.get('content', ''))
            elif name == 'robots':
                self.robots.append(attrs.get('content', ''))
        elif self.in_head and tag == 'link' and 'canonical' in str(attrs.get('rel', '')).lower().split():
            self.canonical.append(attrs.get('href', ''))

    def handle_data(self, data):
        if self.in_title and self.titles:
            self.titles[-1] += data

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        elif tag == 'head':
            self.in_head = False
            self.in_title = False

def inspect_head(html):
    h = HeadParser()
    h.feed(html)
    return {'titles': h.titles, 'descriptions': h.meta,
            'canonicals': h.canonical, 'robots': h.robots}

def public_head():
    req = request.Request(TARGET, method='GET', headers={
        'Accept': 'text/html', 'Cache-Control': 'no-cache',
        'User-Agent': 'SolarSerpBoundary-PublicReadback/1.0'})
    try:
        with request.build_opener(NoRedirect()).open(req, timeout=25) as res:
            require(res.status == 200 and res.url == TARGET, 'Public URL identity changed')
            require('text/html' in res.headers.get('Content-Type', '').lower(), 'Public response non-HTML')
            raw = res.read(1500001)
            require(len(raw) <= 1500000, 'Public HTML oversized')
            return inspect_head(raw.decode('utf-8', errors='replace'))
    except (error.HTTPError, error.URLError, OSError, ValueError):
        raise Blocked('Public HTML unavailable') from None

def verify_target(head, deployed):
    require(len(head['titles']) == 1 and len(head['canonicals']) == 1 and
            head['canonicals'][0].rstrip('/') == TARGET.rstrip('/'),
            'Public canonical or title identity not exact')
    require(not any('noindex' in str(x).lower() for x in head['robots']),
            'Public post is noindex')
    if deployed:
        require(head['titles'][0] == TITLE and head['descriptions'] == [DESC],
                'Public SEO title/description did not match deployed intent')
    else:
        require(head['titles'][0] != TITLE and DESC not in head['descriptions'],
                'SERP title experiment already present; no duplicate')

def existing(user, password):
    status, plugins = rest('GET', PLUGINS, user, password)
    require(status == 200 and isinstance(plugins, list) and len(plugins) < 100,
            'WordPress plugin inventory incomplete')
    require(sum(1 for x in plugins if isinstance(x, dict) and
                str(x.get('plugin', '')).startswith('code-snippets/') and
                x.get('status') == 'active') == 1, 'Code Snippets plugin identity not unique')
    require(sum(1 for x in plugins if isinstance(x, dict) and
                str(x.get('plugin', '')).startswith('wordpress-seo/') and
                x.get('status') == 'active') == 1, 'Yoast SEO not uniquely active')
    status, items = rest('GET', LIST, user, password)
    require(status == 200 and isinstance(items, list) and len(items) < 100,
            'Code Snippets inventory incomplete')
    for item in items:
        require(isinstance(item, dict), 'Snippet identity unknown')
        require(item.get('name') != NAME and 'solar_expert_hp_boundary_serp_v1' not in str(item.get('code', '')),
                'Existing SERP experiment; no duplicate')

def readback(user, password, identifier, active):
    status, item = rest('GET', f'/code-snippets/v1/snippets/{identifier}', user, password)
    if isinstance(item, dict) and isinstance(item.get('snippet'), dict):
        item = item['snippet']
    require(status == 200 and isinstance(item, dict) and item.get('id') == identifier and
            item.get('name') == NAME and str(item.get('code', '')).strip() == PHP_CODE.strip() and
            item.get('active') is active, 'Snippet identity/code/active drift')

def receipt(status, **fields):
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    value = {'schema_version': 1, 'status': status, 'post_attempts': POSTS_ATTEMPTED,
             'snippet_id': SNIPPET_ID, 'wpvibe_calls': 0, 'theme_deployed': False,
             'word_press_post_writes': 0, 'target_slug': SLUG, **fields}
    RECEIPT.write_text(json.dumps(value, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print('SOLAR_SERP_BOUNDARY status=' + status + ' post_attempts=' + str(POSTS_ATTEMPTED) + ' wpvibe=0')

def execute(user, password):
    global SNIPPET_ID
    control = json.loads(CONTROL.read_text(encoding='utf-8'))
    require(control == {'schema_version': 1, 'enabled': True, 'revision': 1,
                        'mode': 'one_hp_boundary_serp_snippet'}, 'Release control not armed')
    verify_target(public_head(), False)
    existing(user, password)
    payload = {'name': NAME, 'code': PHP_CODE, 'scope': 'global', 'active': False, 'desc': DESCRIPTION}
    status, item = rest('POST', '/code-snippets/v1/snippets', user, password, payload)
    item = item.get('snippet', item) if isinstance(item, dict) else None
    require(status in (200, 201) and isinstance(item, dict) and type(item.get('id')) is int and
            item['id'] > 0, 'Snippet creation response uncertain; no retry')
    SNIPPET_ID = item['id']
    readback(user, password, SNIPPET_ID, False)
    verify_target(public_head(), False)
    status, _ = rest('POST', f'/code-snippets/v1/snippets/{SNIPPET_ID}/activate', user, password)
    require(status in (200, 201, 204), 'Snippet activation uncertain; no retry')
    readback(user, password, SNIPPET_ID, True)
    verify_target(public_head(), True)
    receipt('wp_verified', exact_public_title=True, exact_public_meta_description=True)

def main():
    try:
        execute(os.getenv('SOLAR_WP_USER', '').strip(),
                os.getenv('SOLAR_WP_APP_PASSWORD', '').strip())
    except (Blocked, OSError, KeyError, TypeError, ValueError) as exc:
        reason = str(exc)
        if not re.match(r'^(Release|Existing|Snippet|WordPress|Code|Malformed|Public|Unapproved|Missing|SERP|Yoast)', reason):
            reason = 'unknown or ambiguous prerequisite'
        receipt('blocked_no_retry', reason=reason[:130])
        sys.exit(2)

if __name__ == '__main__':
    main()
