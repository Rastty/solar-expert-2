import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {evaluate,GUARDED_PATHS,sha256,run} from '../tools/live-theme-history-audit.mjs';

function repoFixture(){
  const dir=mkdtempSync(join(tmpdir(),'solar-theme-provenance-'));
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  git('init','-q');
  git('config','user.email','ci-example@example.invalid');
  git('config','user.name','Synthetic Audit Fixture');
  const write=(path,value)=>{
    const full=join(dir,path);mkdirSync(dirname(full),{recursive:true});
    writeFileSync(full,value);
  };
  const commit=title=>{
    git('add','.');
    git('commit','-qm',title);
    return git('rev-parse','HEAD');
  };
  const seed=new Map();
  for(const [i,path] of GUARDED_PATHS.entries()){
    const data='historical-live-'+i+'\n';
    write(path,data);seed.set(path,data);
  }
  const old=commit('last matching public assets');
  const snapshot=(head,data=seed)=>({
    observed_at_utc:'2026-11-10T19:20:00Z',
    dev_source_sha:head,
    files:GUARDED_PATHS.map(path=>({
      path,
      status:'drift',
      live_sha256:sha256(Buffer.from(data.get(path)))
    }))
  });
  return {dir,git,write,commit,old,snapshot,seed};
}

test('historical four public assets match exact earlier commit, never authorizes a deploy',()=>{
  const f=repoFixture();
  try{
    f.write('assets/js/selectors.js','new-selector-with-DC-mode\n');
    const head=f.commit('dev added unshipped DC selector');
    const input=join(f.dir,'input.json'),out=join(f.dir,'out.json');
    writeFileSync(input,JSON.stringify(f.snapshot(head)));
    const report=run({repoDir:f.dir,input,output:out});
    assert.equal(report.status,'four_public_assets_match_historical_git');
    assert.equal(report.candidate_commit,f.old);
    assert.equal(report.candidate_full_four_file_match,true);
    assert.equal(report.best_partial_match_count,4);
    assert.equal(report.release_authorized,false);
    assert.equal(report.wordpress_backup_proven,false);
    assert.equal(report.live_theme_restore_proven,false);
    assert.deepEqual(JSON.parse(readFileSync(out)).candidate_commit,f.old);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('mixed live files with no single Git commit cannot pretend previous-dev rollback parity',()=>{
  const f=repoFixture();
  try{
    f.write('assets/js/selectors.js','second-source\n');
    const first=f.commit('modify selectors');
    f.write('assets/js/affiliate-adapter.js','third-source\n');
    const head=f.commit('modify affiliate');
    const observations=new Map(f.seed);
    observations.set('assets/js/affiliate-adapter.js','third-source\n');
    const r=evaluate(f.snapshot(head,observations),{
      head,
      commits:[head,first,f.old],
      readBlob:(sha,path)=>execFileSync('git',['show',sha+':'+path],{cwd:f.dir})
    });
    assert.equal(r.status,'no_exact_historical_candidate');
    assert.equal(r.candidate_commit,null);
    assert.equal(r.candidate_full_four_file_match,false);
    assert.equal(r.best_partial_match_count,3);
    assert.equal(r.release_authorized,false);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('missing live asset, stale dev SHA, malformed evidence and history fail closed',()=>{
  const f=repoFixture();
  try{
    const head=f.old,opts={head,commits:[head],readBlob:()=>Buffer.from('not-used')};
    const missing=f.snapshot(head);
    missing.files[2].status='unavailable';
    missing.files[2].live_sha256=null;
    assert.equal(evaluate(missing,opts).status,'invalid_or_incomplete_evidence');
    const stale=f.snapshot('a'.repeat(40));
    assert.equal(evaluate(stale,opts).status,'invalid_or_incomplete_evidence');
    const bad=f.snapshot(head);
    bad.files[1].path='../private-config.php';
    assert.equal(evaluate(bad,opts).status,'invalid_or_incomplete_evidence');
    const duplicate=f.snapshot(head);
    duplicate.files[1].path='style.css';
    assert.equal(evaluate(duplicate,opts).status,'invalid_or_incomplete_evidence');
    const invalidCommit=evaluate(f.snapshot(head),{...opts,commits:['not-a-commit']});
    assert.equal(invalidCommit.status,'invalid_git_history');
    assert.equal(invalidCommit.candidate_commit,null);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('partial hashes or paths are not enough to certify full WordPress restore',()=>{
  const sha='b'.repeat(40),live=sha256(Buffer.from('same'));
  const obs={observed_at_utc:'2026-11-10T20:10:00Z',dev_source_sha:sha,
    files:GUARDED_PATHS.map(path=>({path,status:'match',live_sha256:live}))};
  const result=evaluate(obs,{head:sha,commits:[sha],readBlob:()=>Buffer.from('same')});
  assert.equal(result.candidate_full_four_file_match,true);
  assert.equal(result.wordpress_backup_proven,false);
  assert.equal(result.live_theme_restore_proven,false);
  assert.equal(result.release_authorized,false);
  assert.match(result.proof_limit,/PHP, database/);
});
