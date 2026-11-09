import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const base = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, base), 'utf8');
const manifest = JSON.parse(read('content/manifest.json'));
const slug = 'solarni-panel-na-karavan-200w';
const file = 'content/rewrites/' + slug + '.html';
const source = read(file);
const seo = read('inc/core.php');
const home = read('front-page.php');
const oldGuide = read('content/rewrites/jakou-baterii-k-solarnimu-panelu-400w.html');

test('existing WP #1618 is source-attributed but never created or overwritten by theme', () => {
  const entries = manifest.items.filter(x => x.slug === slug);
  assert.equal(entries.length, 1, 'one canonical manifest entry');
  const x = entries[0];
  assert.equal(x.type, 'post');
  assert.equal(x.file, file);
  assert.equal(x.create_if_missing, false, 'only the native publisher may create this post');
  assert.equal(x.preserve_status, true, 'never auto-publish or demote it');
  assert.equal(x.native_editorial_owned, true, 'theme code must not replace WP title/body/status');
  assert.equal(x.category_slug, 'solarni-panely');
  assert.equal(x.indexable, true);
  for (const forbidden of ['status', 'status_if_new', 'publish_ready']) {
    assert(!Object.hasOwn(x, forbidden), 'No independent theme publisher directive: ' + forbidden);
  }
  assert(seo.includes("'" + slug + "' => array("), 'Managed SEO metadata available');
  assert(seo.includes('$native_editorial && $existing'), 'Actual PHP core must protect native content');
});

test('article source is exact reviewed Git source from original caravan PR #153', () => {
  // Git blob identity is pinned and deterministic; this is a *source* check,
  // not a claim to have fetched authenticated current WordPress raw content.
  const gitSha = execFileSync('git', ['hash-object', file], {
    cwd: new URL('.', base), encoding: 'utf8'
  }).trim();
  assert.equal(gitSha, 'c60fbbe946a185833500a19645c5dc50eb067885');
  assert(source.length > 9000);
  for (const fact of ['SPM041903903','190 Wp','21,8 V','25,5 V','9,17 A',
                      '1485 × 668 × 30 mm','Voc','Vmp','Isc','BMS']) {
    assert(source.includes(fact), 'Missing actual physical product fact: '+fact);
  }
  for (const link of ['/vyber-baterii/','/mppt-kalkulacka/','/vyber-menice/']) {
    assert(source.includes('href="' + link + '"'), 'Buyer route missing: '+link);
  }
  assert(source.includes('Současná veřejná verze kalkulačky kontroluje výkon FV pole'),
    'Avoid falsely claiming that a dev-only Isc selector feature is already live');
  assert(!['https://ehub.cz', 'a_aid=', 'desturl=', '<script'].some(token => source.toLowerCase().includes(token)),
    'No leaked affiliate IDs or executable content');
});

test('existing relevant buyer guide and future homepage guide direct to caravan', () => {
  const link = 'href="/' + slug + '/"';
  assert.equal(oldGuide.split(link).length - 1, 1, 'One contextual live buyer backlink mirrored in Git');
  assert(oldGuide.includes('Nesrovnávejte jej přímo s 400Wp sestavou'),
    'One panel around 200Wp must not cannibalize distinct 400Wp use case');
  assert(home.includes("home_url('/" + slug + "/')"), 'Future homepage discovery exists in theme');
  assert(!home.includes('Zaručená soběstačnost'), 'No false buyer guarantee');
});
