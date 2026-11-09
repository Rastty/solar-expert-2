import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = new URL('../', import.meta.url);
const file = 'content/rewrites/solarni-panel-pro-wifi-kameru-a-router-na-chate.html';
const slug = 'solarni-panel-pro-wifi-kameru-a-router-na-chate';
const expectedSha = '5fb048b7be6a49c9d5db706b0b1cd284b257739cd20ecfd70cdde9b07188d45a';
const manifest = JSON.parse(fs.readFileSync(new URL('content/manifest.json', root), 'utf8'));
const article = fs.readFileSync(new URL(file, root), 'utf8');

test('existing native-publisher article is a noncreating, status-preserving managed item', () => {
  const matching = manifest.items.filter(item => item.slug === slug);
  assert.equal(matching.length, 1, 'one managed article identity');
  const entry = matching[0];
  assert.equal(entry.type, 'post');
  assert.equal(entry.file, file);
  assert.equal(entry.category_slug, 'solarni-panely');
  assert.equal(entry.create_if_missing, false, 'only native writer may create this post');
  assert.equal(entry.preserve_status, true, 'never auto-set existing WordPress post status');
  assert.equal(entry.native_editorial_owned, true, 'theme sync must never overwrite native WP body, title or status');
  assert(!Object.hasOwn(entry, 'publish_ready'), 'theme must not claim native publisher approval');
  assert(!Object.hasOwn(entry, 'status'), 'do not mutate existing WP publication state');
  assert.equal(entry.indexable, true);
  assert(!Object.hasOwn(entry, 'status_if_new'), 'no latent create-on-sync instruction');
});

test('dev source matches the latest immutable native-publisher EDIT buyer handoff', () => {
  assert.equal(crypto.createHash('sha256').update(article, 'utf8').digest('hex'), expectedSha);
  assert(article.length > 9000);
  assert(article.includes('461 Wh'));
  assert(article.includes('nepřebírejte z nich proto bez přepočtu kapacitu baterie'));
  for (const guide of ['/jakou-baterii-k-solarnimu-panelu-400w/', '/jak-vybrat-mppt-regulator-pro-400w-panel/']) {
    assert(article.includes('href="' + guide + '"'), '400Wp buyer decision should reach the existing dedicated guide');
  }
  assert(article.includes('PV Isc ani počet paralelních větví zatím automaticky neověřuje'));
  assert(article.includes('joint-research-centre.ec.europa.eu'));
  assert(article.includes('victronenergy.com'));
  for (const tool of ['/vyber-baterii/', '/mppt-kalkulacka/', '/vyber-menice/']) {
    assert(article.includes('href="' + tool + '"'));
  }
  assert(!/https?:\/\/ehub\.cz|a_aid=|desturl=|<script/i.test(article));
});
