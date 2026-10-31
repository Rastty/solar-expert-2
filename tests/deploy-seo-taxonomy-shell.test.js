'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const lines=fs.readFileSync(path.join(root,'.github/workflows/auto-deploy-dev.yml'),'utf8').split('\n');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'content/manifest.json'),'utf8'));

// Validate the entire workflow's Bash scalar boundaries. A previously
// appended fragment with zero indentation invalidated GitHub Actions before
// any job could start, even though the two taxonomy scripts were bash-valid.
let workflowBlocks=0;
for(let i=0;i<lines.length;i++){
  if(lines[i] !== '        run: |') continue;
  workflowBlocks++;
  for(let j=i+1;j<lines.length;j++){
    if(/^      - name: /.test(lines[j])) break;
    if(!lines[j].trim()) continue;
    assert(lines[j].startsWith('          '),
      'Unindented/garbled text outside run YAML literal at line '+(j+1)+': '+lines[j]);
  }
}
assert(workflowBlocks>=20,'Production deploy must retain complete expected verification stages');
// A second dev push must not cancel an in-flight Deployer update after it has
// mutated WordPress but before health, public CTA and content checks finish.
// GitHub queues the next run rather than abandoning an unverified live release.
const releaseWorkflow=lines.join('\n');
assert.ok(releaseWorkflow.includes('timeout-minutes: 30'),
  'Guarded deploy must allow enough time for merge checks, Deployer and public source hashes');
assert.match(releaseWorkflow,/concurrency:\n  group: solar-expert-dev-auto-deploy\n  cancel-in-progress: false/,
  'Never cancel an in-flight production deploy; queue subsequent dev pushes');
assert(!/group: solar-expert-dev-auto-deploy\n  cancel-in-progress: true/.test(releaseWorkflow),
  'A cancelled release could leave an unverified public WordPress mutation');
assert(lines.some(x=>x.includes('Verify live release and managed-content sync')),
  'Preserve actual live release readback');
assert(lines.some(x=>x.includes('Verify rendered residential FVE CTA')),
  'Preserve buyer-facing public CTA gate');

const finalCheck='- name: Verify real public Czech buyer guidance (no stale homepage cache)';
assert.equal(lines.filter(x=>x.trim()===finalCheck).length,1,'Workflow must not append duplicate trailing step fragments');
assert.equal(lines.filter(x=>x.trim()).at(-1).trim(),'done',
  'No unmatched stray text after last production verification');


function shellStep(name){
  const target='- name: '+name;
  const start=lines.findIndex(x=>x.trim()===target);
  assert(start>=0,'Expected deployed workflow stage: '+name);
  const next=lines.findIndex((x,i)=>i>start&&/^      - name: /.test(x));
  const end=next<0?lines.length:next;
  const run=lines.findIndex((x,i)=>i>start&&i<end&&x.trim()==='run: |');
  assert(run>start,'Missing bash run block for '+name);
  const body=lines.slice(run+1,end).map(x=>{
    if(!x.trim())return '';
    assert(x.startsWith('          '),'Broken YAML run indentation: '+x);
    return x.slice(10);
  }).join('\n');
  const out=cp.spawnSync('bash',['-n'],{input:body,encoding:'utf8'});
  assert.equal(out.status,0,'Invalid production bash for '+name+': '+out.stderr);
  return body;
}

// The Deployer endpoint can redirect to a login page, and jq's false // true
// silently turns an explicit rejected deployment into success. Neither may
// authorize managed-content mutation or public-live claims.
const deployTrigger=shellStep('Trigger Deployer for Git');
const mutatingCurlStart=deployTrigger.indexOf('http_code="$(curl');
const mutatingCurlEnd=deployTrigger.indexOf('\\necho "Deployer HTTP status:',mutatingCurlStart);
assert(mutatingCurlStart>=0&&mutatingCurlEnd>mutatingCurlStart,
  'Expected a bounded Deployer HTTP trigger');
assert(!/--retry(?:[ =]|$)/m.test(deployTrigger.slice(mutatingCurlStart,mutatingCurlEnd)),
  'Do not replay an ambiguous production Deployer request after a timeout');

// CI previously passed even though a new dev-ref curl command used doubled
// backslashes at line ends. Bash -n accepts that, but execution treats the
// following -H as a separate command and blocks every guarded live release.
// Execute only the GitHub-ref read with a mock curl: no network or secrets.
const refStart=deployTrigger.indexOf('remote_dev_sha="$(curl');
const refEnd=deployTrigger.indexOf('\nif [ "$remote_dev_sha"',refStart);
assert(refStart>=0&&refEnd>refStart,'Expected exact pre-deploy dev SHA read');
const devRefSnippet=deployTrigger.slice(refStart,refEnd);
assert(!devRefSnippet.split('\n').some(line=>line.endsWith('\\\\')),
  'Double-escaped shell continuation breaks dev SHA verification at runtime');
const mockedDevShaProbe=[
  'set -euo pipefail',
  'GH_TOKEN=offline-fixture',
  'GITHUB_REPOSITORY=Rastty/solar-expert-2',
  'curl() {',
  '  if [ "$#" -ne 10 ]; then echo "Unexpected curl args: $#" >&2; return 91; fi',
  '  printf \'%s\\n\' \'{"object":{"sha":"verified-dev-sha"}}\'',
  '}',
  devRefSnippet,
  'printf \'sha=%s\\n\' "$remote_dev_sha"',
].join('\n');
const devShaProbe=cp.spawnSync('bash',['-c',mockedDevShaProbe],{encoding:'utf8'});
assert.equal(devShaProbe.status,0,
  'Pre-deploy dev SHA shell must execute with all curl headers: '+devShaProbe.stderr);
assert.equal(devShaProbe.stdout.trim(),'sha=verified-dev-sha',
  'Ref gate must parse the mocked GitHub SHA before allowing a deploy');
assert(deployTrigger.includes('git/ref/heads/dev') && deployTrigger.includes('remote_dev_sha') && deployTrigger.includes('remote_dev_sha\" != \"$GITHUB_SHA'),
  'A queued stale workflow must not trigger Deployer for a newer dev branch');
assert(deployTrigger.indexOf('remote_dev_sha') < deployTrigger.indexOf('body_file='),
  'Verify dev HEAD before preparing or calling the production Deployer trigger');
assert(deployTrigger.includes('curl -sS --max-redirs 0'),
  'Deployer trigger must not follow a redirect to an unrelated 200 page');
assert(!deployTrigger.includes('curl -sSL'),
  'A redirected login page must never be accepted as a Deployer receipt');
assert(deployTrigger.includes('Deployer returned HTML instead of a deployment receipt'),
  'Reject HTML login/challenge bodies even when HTTP 200');
// Actual production deployment on 2026-10-14 returned a JSON receipt with
// success=true, package_type=theme, package_slug=solar-expert-2. Do not accept
// generic HTTP 200 text or a success for a different package.
assert(deployTrigger.includes("jq -s -e 'length == 1"),
  'Require exactly one structured Deployer receipt');
assert(deployTrigger.includes('.success == true') &&
       deployTrigger.includes('.package_type == "theme"') &&
       deployTrigger.includes('.package_slug == "solar-expert-2"'),
  'Require exact successful target theme in Deployer receipt');
assert(!deployTrigger.includes('.success // true'),
  'Never coalesce explicit JSON false to true');
assert(!deployTrigger.includes('non-JSON body; accepted'),
  'Arbitrary HTTP 200 text must never authorize a release');
const receiptStart=deployTrigger.indexOf('if ! jq -s -e');
assert(receiptStart>=0,'Expected exact JSON Deployer receipt gate');
const receiptScript=deployTrigger.slice(receiptStart);
const tmpDir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'solar-deployer-receipt-'));
try {
  for(const [name,body,allowed] of [
    ['accepted', '{"success":true,"package_type":"theme","package_slug":"solar-expert-2","message":"Package updated successfully."}', true],
    ['explicit-rejection', '{"success":false,"package_type":"theme","package_slug":"solar-expert-2"}', false],
    ['wrong-theme', '{"success":true,"package_type":"theme","package_slug":"another-theme"}', false],
    ['wrong-type', '{"success":true,"package_type":"plugin","package_slug":"solar-expert-2"}', false],
    ['missing-success', '{"package_type":"theme","package_slug":"solar-expert-2"}', false],
    ['missing-package', '{"success":true}', false],
    ['success-as-string', '{"success":"true","package_type":"theme","package_slug":"solar-expert-2"}', false],
    ['bare-false', 'false', false],
    ['bare-null', 'null', false],
    ['json-array', '[]', false],
    ['json-string', '"success"', false],
    ['multiple-json', '{"success":false}\n{"success":true,"package_type":"theme","package_slug":"solar-expert-2"}', false],
    ['malformed-json', '{"success":true,"package_type":"theme",', false],
    ['empty-body', '', false],
    ['legacy-text', 'OK: updated theme', false],
    ['fake-text', 'Unauthorized', false]
  ]) {
    const fixture=path.join(tmpDir,name+'.txt');
    fs.writeFileSync(fixture,body);
    const out=cp.spawnSync('bash',['-c','set -euo pipefail\n'+receiptScript],
      {env:{...process.env,body_file:fixture},encoding:'utf8'});
    assert.equal(out.status===0,allowed,
      'Deployer receipt gate gave wrong verdict for '+name+': '+out.stdout+' '+out.stderr);
  }
} finally {
  fs.rmSync(tmpDir,{recursive:true,force:true});
}

// Public theme source bytes must match the exact reviewed checkout, not only
// a reused style.css version or a previously cached buyer CTA.
const sourceBytes=shellStep('Verify public deployed source bytes');
for(const file of [
  'style.css',
  'assets/js/selectors.js',
  'assets/js/affiliate-adapter.js',
  'assets/data/product-seed.json'
]){
  assert(sourceBytes.includes(file),'Missing release source parity target: '+file);
}
assert(sourceBytes.includes('sha256sum "$relative"') &&
       sourceBytes.includes('sha256sum "$body_file"'),
  'Public static source bytes must be hashed and compared with checkout');
assert(sourceBytes.includes('if [ "$actual" = "$expected" ]'),
  'Only exact SHA256 parity can pass the public release source gate');
assert(sourceBytes.includes('curl -fsS --max-redirs 0'),
  'Source parity must reject login/challenge redirects');
assert(sourceBytes.includes('if [ "$verified" != "1" ]') &&
       sourceBytes.includes('Public theme source hash did not match'),
  'Missing/stale source bytes must fail closed, never count as deployed');

const categories=shellStep('Reconcile managed categories after release convergence');
const publicVerify=shellStep('Verify public thematic categories for new managed posts');
const targets=manifest.items.filter(x=>x.type==='post'&&x.category_slug);
const published=targets.filter(x=>x.create_if_missing===true&&(x.status||x.status_if_new)==='publish');
assert(targets.length>=7,'All approved merchant and off-grid posts keep category declarations');
assert(published.length>=7,'Expected managed public buyer posts');
assert(categories.includes('expected_categories="$(jq'),'Never hardcode a five-of-five taxonomy total');
assert(categories.includes('managed_taxonomy_targets == $expected'),'Health must compare actual manifest total');
assert(publicVerify.includes('published_pairs < <(jq -r'),'Every public managed post gets a category check');
assert(publicVerify.includes('slug="${pair%%|*}"'),'Pair parsing must not lose slug');
assert(publicVerify.includes('category="${pair#*|}"'),'Pair parsing must not lose category');
assert(!publicVerify.includes('for pair in \\n'),'No static slug list allowed in category release check');
// The site currently renders Yoast's real robots tag with SINGLE quotes:
 // <meta name='robots' content='noindex, follow' />. Do not gate on
 // a double-quote-only synthetic fixture or report a false failed release.
const hygiene=shellStep('Verify foreign-import noindex pilot on live WordPress');
const noindexPattern=/<meta[^>]+robots[^>]+noindex|<meta[^>]+noindex[^>]+robots/i;
for(const html of [
  "<meta name='robots' content='noindex, follow' />",
  '<meta name="robots" content="noindex, follow" />',
  '<meta content="noindex, follow" name="robots" />'
]){
  assert(noindexPattern.test(html),'Smoke must accept live and double-quoted Yoast robots metadata');
}
assert(hygiene.includes("grep -Eiq '<meta[^>]+robots[^>]+noindex|<meta[^>]+noindex[^>]+robots'"),
  'The release smoke must support both single- and double-quoted actual Yoast HTML');
assert(!hygiene.includes('name="robots"[^>]*content="'),
  'Old double-quote-only gate would falsely fail a real Yoast noindex tag');
console.log('PASS: dynamic SEO taxonomy and public noindex smoke are Bash-valid and manifest-bound for '+published.length+' published posts');
