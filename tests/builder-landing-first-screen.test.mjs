import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync(new URL('../page.php', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../template-parts/solar-builder.php', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../front-page.php', import.meta.url), 'utf8');

test('only the canonical Builder tool page adds first-screen actions', () => {
  assert.match(page, /is_page\('solarni-sestava-na-chatu'\)/);
  assert.match(page, /has_shortcode\([^;]+?['"]solar_expert_builder['"]\)/);
  assert.match(page, /\$is_builder_page \) :/);
  assert.match(page, /class="se-content<\?php echo \$is_builder_page \? ' se-content-builder' : ''; \?>"/);
});

test('one-click sample uses the same supported event as the homepage', () => {
  const dispatch = `@click.prevent="$dispatch('solar-expert-open-demo')"`;
  assert.ok(page.includes(dispatch));
  assert.ok(homepage.includes(dispatch));
  assert.ok(builder.includes('@solar-expert-open-demo.window='));
  assert.match(page, /Ukázat vzorovou sestavu/);
  assert.match(page, /href="#builder">Spočítat vlastní spotřebu/);
});

test('first-screen layout is scoped to the Builder page and works on phones', () => {
  assert.match(css, /\.se-content-builder\{padding-top:28px\}/);
  assert.match(css, /\.se-content-builder h1\{font-size:clamp\(36px,5vw,54px\)/);
  assert.match(css, /\.se-page-builder-actions \.se-btn\{min-height:48px/);
  assert.match(css, /@media\(max-width:570px\)\{[\s\S]*?\.se-page-builder-actions\{flex-direction:column/);
  assert.match(css, /\.se-content-builder>\.se-lead/);
});
