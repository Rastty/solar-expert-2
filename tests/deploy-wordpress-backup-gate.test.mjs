import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';

const workflow=fs.readFileSync(new URL('../.github/workflows/auto-deploy-dev.yml',import.meta.url),'utf8');
const lines=workflow.split('\n');
const gateName='Require release-scoped WordPress database and uploads restore attestation';

function step(name){
  const index=lines.findIndex(line=>line.trim()==='- name: '+name);
  assert.ok(index>=0,'Missing release workflow stage '+name);
  const end=lines.findIndex((line,i)=>i>index && line.startsWith('      - name: '));
  return{index,lines:lines.slice(index,end<0?lines.length:end)};
}
function bash(){
 const lns=step(gateName).lines;
 const start=lns.findIndex(x=>x.trim()==='run: |');
 assert(start>=0);
 const script=lns.slice(start+1).map(l=>{
   if(!l.trim())return '';
   assert(l.startsWith('          '),'Non-shell indentation after preflight: '+l);
   return l.slice(10);
 }).join('\n');
 const parsed=cp.spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
 assert.equal(parsed.status,0,'Backup preflight shell must be valid Bash: '+parsed.stderr);
 return script;
}
const currentTime=()=>new Date().toISOString().slice(0,19)+'Z';
const daysAgo=days=>new Date(Date.now()-days*86400000).toISOString().slice(0,19)+'Z';
function evidence(){
 return{
   site:'solar-expert.cz',
   previous_dev_sha:'old-dev-revision-verified-public',
   database_backup_ref:'private-host-db-restore-point-001',
   uploads_backup_ref:'private-host-uploads-restore-point-002',
   restore_rehearsal_ref:'private-staging-restore-test-003',
   restore_owner:'backup reviewer',
   database_and_uploads_restorable:true,
   staging_restore_passed:true,
   backup_completed_at_utc:currentTime(),
   restore_rehearsal_at_utc:daysAgo(2),
 };
}
function run(receipt){
 const env={...process.env,
   GITHUB_SHA:'approved-pr-merge',
   WORDPRESS_BACKUP_RECEIPT:receipt===undefined?'':typeof receipt==='string'?receipt:JSON.stringify(receipt)};
 const code=`git(){ if [ "$1" = "rev-parse" ] && [ "$2" = "\${GITHUB_SHA}^1" ]; then printf '%s\\n' old-dev-revision-verified-public; else return 91; fi; }
${bash()}`;
 return cp.spawnSync('bash',['-c',code],{env,encoding:'utf8',timeout:8000});
}
function rejected(receipt,reason){
 const p=run(receipt);
 assert.notEqual(p.status,0,'Expected backup proof failure for '+reason);
 assert.match(p.stdout+p.stderr,/::error::/,'Fail-closed gate must emit a GitHub Actions error annotation');
 assert(!p.stdout.includes('attestation gate passed'),'An invalid receipt must not authorize release');
 const printed=p.stdout+p.stderr;
 assert(!printed.includes('private-host-db-restore-point-001'),'Never leak secret backup reference in logs');
 assert(!printed.includes('private-host-uploads-restore-point-002'),'Never leak uploads or private receipts');
}

test('backup signoff is mandatory BEFORE code archive and all Deployer operations',()=>{
 const checkout=step('Check out release');
 const prPreview=step('Verify PR WordPress preview');
 const gate=step(gateName);
 const snapshot=step('Capture verified previous-theme rollback snapshot');
 const upload=step('Persist verified previous-theme rollback snapshot');
 const mutation=step('Trigger Deployer for Git');
 assert(checkout.index<prPreview.index);
 assert(prPreview.index<gate.index);
 assert(gate.index<snapshot.index);
 assert(snapshot.index<upload.index);
 assert(upload.index<mutation.index);
 assert.match(workflow,/WORDPRESS_BACKUP_RECEIPT: \$\{\{ secrets\.SOLAR_EXPERT_WORDPRESS_BACKUP_RECEIPT \}\}/);
 assert(!gate.lines.some(x=>x.includes('continue-on-error')),'The release guard cannot be advisory');
 assert(!/curl|wget|rm -rf|git push/.test(bash()),'Attestation is read-only');
});

test('private, current and exact previous-dev source-attested DB/uploads receipt may pass',()=>{
 const p=run(evidence());
 assert.equal(p.status,0,'Valid receipt should pass: '+p.stdout+' '+p.stderr);
 assert.match(p.stdout,/attestation gate passed/);
 assert(!p.stdout.includes('private-host-db'));
 assert(!p.stdout.includes('private-host-uploads'));
});

test('unconfigured or invalid-shaped receipt fails closed',()=>{
 rejected(undefined,'unconfigured');
 rejected('not-json','malformed JSON');
 const blank=evidence();blank.database_backup_ref='';rejected(blank,'missing db snapshot');
 const noMedia=evidence();delete noMedia.uploads_backup_ref;rejected(noMedia,'missing upload copy');
 const noOwner=evidence();noOwner.restore_owner='';rejected(noOwner,'missing reviewer');
});

test('a different release SHA or site cannot reuse a private backup receipt',()=>{
 const p=evidence();p.previous_dev_sha='another-dev-source';rejected(p,'wrong prior commit');
 const site=evidence();site.site='wrong-domain.example';rejected(site,'wrong site');
 const approval=evidence();approval.database_and_uploads_restorable=false;rejected(approval,'unapproved recoverability');
 const restore=evidence();restore.staging_restore_passed=false;rejected(restore,'failed staged restore');
});

test('stale or impossible timestamps must not authorize a deployment',()=>{
 const staleBackup=evidence();staleBackup.backup_completed_at_utc=daysAgo(2);
 rejected(staleBackup,'backup older than 24h');
 const staleDrill=evidence();staleDrill.restore_rehearsal_at_utc=daysAgo(31);
 rejected(staleDrill,'restore drill older than 30d');
 const futureBackup=evidence();futureBackup.backup_completed_at_utc='2099-01-01T00:00:00Z';
 rejected(futureBackup,'future backup not allowed');
 const futureDrill=evidence();futureDrill.restore_rehearsal_at_utc='2099-01-01T00:00:00Z';
 rejected(futureDrill,'future drill not allowed');
 const invalid=evidence();invalid.backup_completed_at_utc='2026-11-31T12:00:00Z';
 rejected(invalid,'invalid calendar date cannot pass freshness');
});
