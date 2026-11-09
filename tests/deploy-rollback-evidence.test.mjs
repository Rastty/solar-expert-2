import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';

const workflow=fs.readFileSync(new URL('../.github/workflows/auto-deploy-dev.yml',import.meta.url),'utf8');
const lines=workflow.split('\n');

function stage(name){
  const ix=lines.findIndex(line=>line.trim()==='- name: '+name);
  assert.ok(ix>=0,'Release stage absent: '+name);
  const next=lines.findIndex((line,n)=>n>ix&&line.startsWith('      - name: '));
  const section=lines.slice(ix,next<0?lines.length:next);
  return section.join('\n');
}
function bashStage(name){
  const block=stage(name);
  const lns=block.split('\n');
  const run=lns.findIndex(line=>line.trim()==='run: |');
  assert.ok(run>=0,'Missing inline release bash: '+name);
  const body=lns.slice(run+1).map(line=>{
    if(!line.trim())return '';
    assert.ok(line.startsWith('          '),'Bad YAML shell indent: '+line);
    return line.slice(10);
  }).join('\n');
  const syntax=cp.spawnSync('bash',['-n'],{input:body,encoding:'utf8'});
  assert.equal(syntax.status,0,'Invalid stage bash: '+syntax.stderr);
  return body;
}

test('persist old source fingerprint and actual archived rollback candidate BEFORE first mutable Deployer call',()=>{
  const checkout=stage('Check out release');
  assert.match(checkout,/fetch-depth: 2/);
  const pre=stage('Capture verified previous-theme rollback snapshot');
  const uploaded=stage('Persist verified previous-theme rollback snapshot');
  const mutation=stage('Trigger Deployer for Git');
  assert.ok(workflow.indexOf(pre)<workflow.indexOf(uploaded));
  assert.ok(workflow.indexOf(uploaded)<workflow.indexOf(mutation),'Never deploy before rollback package persisted');
  assert.match(uploaded,/uses: actions\/upload-artifact@v4/);
  assert.match(uploaded,/if-no-files-found: error/);
  assert.match(uploaded,/retention-days: 90/);
  assert.match(uploaded,/solar-expert-verified-predeploy/);
  assert.ok(!/continue-on-error: true/.test(uploaded),'Artifact upload failure must block deployment');
  const bash=bashStage('Capture verified previous-theme rollback snapshot');
  for(const file of ['style.css','assets/js/selectors.js','assets/js/affiliate-adapter.js','assets/data/product-seed.json']){
    assert.ok(bash.includes(file),'Prior live source parity missing '+file);
  }
  assert.ok(bash.includes('git rev-parse "${GITHUB_SHA}^1"'),'Previous dev revision must be the merge first-parent');
  assert.ok(bash.includes('git show "${previous_sha}:${relative}"'),'Previous bytes must come from real Git commit');
  assert.ok(bash.includes('sha256sum "$previous_file"')&&bash.includes('sha256sum "$live_file"'));
  assert.ok(bash.includes('if [ "$expected" != "$actual" ]'),'Mismatching public bytes must abort deployment');
  assert.ok(bash.includes('git archive --format=tar.gz')&&bash.includes('previous-theme-source.tar.gz'),'Actual prior tree must be archived');
  assert.ok(bash.includes('tar -xOzf')&&bash.includes('if [ "$recovered" != "$expected" ]'),'Archive must round-trip all four old source files before shipping');
  assert.ok(!/\bDEPLOY_URL\b|system\/scripts\/click\.php|secret=/.test(bash),'No webhook tokens or affiliate test clicks in rollback capture');
});

function trySnapshot({match=true,parentPresent=true,corruptArchive=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'solar-rollback-proof-'));
 try{
   const output=path.join(dir,'actions-output');
   const stub=[
     'set -euo pipefail',
     'git() {',
     ' case "$1" in',
     '  rev-parse) printf "historical-source-sha\\n";;',
     '  cat-file) if [ "$MOCK_PARENT_PRESENT" = "yes" ]; then return 0; else return 1; fi;;',
     '  show) relative="${2#*:}"; printf "old-reviewed-source:%s" "$relative";;',
"  archive) for arg in \"$@\"; do case \"$arg\" in --output=*) archive=\"${arg#--output=}\";; esac; done",
"           test -n \"${archive:-}\" || return 8",
"           if [ \"$MOCK_CORRUPT_ARCHIVE\" = \"yes\" ]; then printf \"broken-archive\" > \"$archive\"; else",
"             temporary=\"$(mktemp -d)\"",
"             for relative in style.css assets/js/selectors.js assets/js/affiliate-adapter.js assets/data/product-seed.json; do",
"               mkdir -p \"$temporary/solar-expert-2/$(dirname \"$relative\")\"",
"               printf \"old-reviewed-source:%s\" \"$relative\" > \"$temporary/solar-expert-2/$relative\"",
"             done",
"             tar -czf \"$archive\" -C \"$temporary\" solar-expert-2",
"             rm -rf \"$temporary\"",
"           fi;;",
     '  *) echo "Unexpected git command: $1" >&2; return 77;;',
     ' esac',
     '}',
     'curl() {',
     ' out=""; request_url="";',
     ' while [ "$#" -gt 0 ]; do',
     '  case "$1" in',
     '   -o) out="$2"; shift 2;;',
     '   https://*) request_url="$1"; shift;;',
     '   *) shift;;',
     '  esac',
     ' done',
     ' case "$request_url" in https://solar-expert.cz/wp-content/themes/solar-expert-2/*) :;; *) return 12;; esac',
     ' relative="${request_url#https://solar-expert.cz/wp-content/themes/solar-expert-2/}"; relative="${relative%%\\?*}"',
     ' if [ "$MOCK_PUBLIC_MATCH" = "yes" ]; then printf "old-reviewed-source:%s" "$relative" > "$out"; else printf "unexpected-deployed-version:%s" "$relative" > "$out"; fi',
     '}',
     bashStage('Capture verified previous-theme rollback snapshot')
   ].join('\n');
   const proc=cp.spawnSync('bash',['-c',stub],{
     env:{...process.env,GITHUB_SHA:'approved-test-sha',RUNNER_TEMP:dir,GITHUB_OUTPUT:output,
       MOCK_PARENT_PRESENT:parentPresent?'yes':'no',MOCK_PUBLIC_MATCH:match?'yes':'no',
       MOCK_CORRUPT_ARCHIVE:corruptArchive?'yes':'no'},
     encoding:'utf8',timeout:8000,
   });
   const saved=path.join(dir,'solar-expert-rollback');
   const evidence=fs.existsSync(saved)?fs.readdirSync(saved):[];
   const marker=fs.existsSync(output)?fs.readFileSync(output,'utf8'):'';
   const manifest=fs.existsSync(path.join(saved,'live-source-sha256.txt'))
     ?fs.readFileSync(path.join(saved,'live-source-sha256.txt'),'utf8'):'';
   return{status:proc.status,stdout:proc.stdout,stderr:proc.stderr,evidence,marker,manifest};
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
test('offline byte-perfect public old release yields a durable source/archive evidence bundle',()=>{
 const result=trySnapshot();
 assert.equal(result.status,0,'Valid preflight should pass: '+result.stdout+' '+result.stderr);
 assert.ok(result.marker.includes('previous_sha=historical-source-sha'));
 assert.ok(result.evidence.includes('archive-sha256.txt'));
 assert.ok(result.evidence.includes('previous-theme-source.tar.gz'));
 assert.ok(result.evidence.includes('release-ids.txt'));
 assert.ok(result.evidence.includes('RESTORE-LIMITATIONS.txt'));
 assert.equal(result.manifest.trim().split('\n').length,4);
});
test('wrong live bytes or missing old commit prevents any rollback archive and fails before a deploy',()=>{
 for(const scenario of [{match:false},{parentPresent:false}]){
   const result=trySnapshot(scenario);
   assert.notEqual(result.status,0,'Unexpected green path for '+JSON.stringify(scenario));
   assert.ok(!result.evidence.includes('previous-theme-source.tar.gz'),'Never prepare a falsely verified rollback artifact');
   assert.equal(result.marker,'','Never authorize release step output after a failed preflight');
 }
});

test('corrupt prior-source archive fails before any upload-authorizing output',()=>{
 const result=trySnapshot({corruptArchive:true});
 assert.notEqual(result.status,0,'Corrupt archive must fail');
 assert.ok(!result.evidence.includes('archive-sha256.txt'),'Broken archives must never get a valid checksum receipt');
 assert.equal(result.marker,'','Corrupt package must not be approved');
});
