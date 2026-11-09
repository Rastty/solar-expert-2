import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

const root = new URL('../', import.meta.url);
const workflow = fs.readFileSync(new URL('.github/workflows/auto-deploy-dev.yml', root), 'utf8');
const config = JSON.parse(fs.readFileSync(new URL('ops/theme-deploy-release.json', root), 'utf8'));

test('dev merges are not implicit production releases', () => {
  assert.equal(config.schema_version, 1);
  assert.equal(config.enabled, false);
  assert.equal(config.mode, 'explicit_theme_release');
  assert.match(workflow, /branches:\s*\n\s*- dev/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /deploy:\s*\n\s*needs: release-intent\s*\n\s*if: needs\.release-intent\.outputs\.active == 'true'/);
  assert.match(workflow, /git diff --name-only "\$BEFORE_SHA" "\$AFTER_SHA" -- ops\/theme-deploy-release\.json/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /Verify PR WordPress preview/);
  assert.match(workflow, /Wait for merge-commit validation/);
  assert.match(workflow, /Verify live release and managed-content sync/);
  assert.match(workflow, /Converge managed content/);
});

test('real release-intent shell script activates ONLY for a changed enabled control', {skip: !fs.existsSync('/usr/bin/jq') && !spawnSync('which', ['jq']).stdout?.length}, () => {
  const hit = workflow.match(/      - name: Require a newly changed explicit theme release authorization[\s\S]*?\n        run: \|\n([\s\S]*?)\n\n  deploy:/);
  assert(hit, 'Find the actual GitHub Actions guard shell, not a copied fixture');
  const shell = hit[1].split('\n').map(line => {
    if (!line.trim()) return '';
    assert(line.startsWith('          '), 'Unexpected YAML indentation in guard: ' + line);
    return line.slice(10);
  }).join('\n');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solar-theme-guard-'));
  try {
    const run = (cmd, args) => execFileSync(cmd, args, {cwd: dir, encoding: 'utf8'}).trim();
    run('git', ['init', '-q', '-b', 'dev']);
    run('git', ['config', 'user.email', 'test@example.invalid']);
    run('git', ['config', 'user.name', 'Solar guard test']);
    fs.mkdirSync(path.join(dir, 'ops'));
    const controlFile = path.join(dir, 'ops', 'theme-deploy-release.json');
    const record = (value) => fs.writeFileSync(controlFile, JSON.stringify(value) + '\n');
    const writeReadme = (value) => fs.writeFileSync(path.join(dir, 'README.md'), value);
    const commit = (label) => { run('git', ['add', '-A']); run('git', ['commit', '-qm', label]); return run('git', ['rev-parse', 'HEAD']); };
    let cfg = structuredClone(config);
    record(cfg);
    writeReadme('initial');
    let before = commit('initial');
    const probe = (after) => {
      const out = path.join(dir, 'github-output');
      fs.writeFileSync(out, '');
      const result = spawnSync('bash', ['-c', shell], {
        cwd: dir,
        env: {...process.env, BEFORE_SHA: before, AFTER_SHA: after, GITHUB_OUTPUT: out},
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, 'Guard script failed: ' + result.stderr);
      const match = fs.readFileSync(out, 'utf8').match(/active=(true|false)/g);
      assert(match && match.length > 0, 'Missing guard output');
      before = after;
      return match[match.length - 1] === 'active=true';
    };

    writeReadme('ordinary source code change');
    assert.equal(probe(commit('ordinary development')), false, 'ordinary dev push must never deploy');
    cfg = {...cfg, enabled: false, release_id: 'solar-theme-approved-20261108a'};
    record(cfg);
    assert.equal(probe(commit('disabled release notice')), false, 'disabled control change must never deploy');
    cfg = {...cfg, enabled: true, release_id: 'solar-theme-approved-20261108a'};
    record(cfg);
    assert.equal(probe(commit('explicit release')), true, 'changed enabled control should activate existing guarded publisher');
    writeReadme('next ordinary source change');
    assert.equal(probe(commit('development after approved release')), false, 'enabled state does not authorize every later dev push');
    cfg = {...cfg, enabled: true, release_id: 'bad-id'};
    record(cfg);
    assert.equal(probe(commit('invalid release identifier')), false, 'bad release identity must fail closed');
    cfg = {...cfg, enabled: false, release_id: ''};
    record(cfg);
    assert.equal(probe(commit('disarm release')), false, 'disarming must never deploy');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
