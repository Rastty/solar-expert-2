import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertOldSeoFingerprintParity,buildFirstTransitionTheme} from '../tools/build-first-transition-theme.mjs';

const manifest=files=>JSON.stringify({schemaVersion:'4',items:files.map(file=>({
  file,slug:file.includes('one')?'one':'two'
}))});
const seoEntry=(slug,title)=>`    '${slug}' => array(\n      'title' => '${title}',\n      'description' => 'Description'\n    ),\n`;
const core=(extra='',guard=true)=>`<?php\nfunction solar_expert_seo_meta($slug_override = '') {\n  $map = array(\n${seoEntry('one','Original title')}${extra}  );\n  return $map[$slug_override] ?? null;\n}\nfunction unrelated_function() {}\n${guard?'/* solar_expert_automatic_content_sync_enabled SOLAR_EXPERT_ENABLE_AUTOMATIC_CONTENT_SYNC */':''}`;

function fixture({missingGuard=false,changedOldSeo=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'solar-transition-fixture-'));
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  const put=(path,value)=>{
    mkdirSync(join(dir,path,'..'),{recursive:true});
    writeFileSync(join(dir,path),value);
  };
  git('init','-q');
  git('config','user.name','Test');
  git('config','user.email','test@example.invalid');
  put('content/manifest.json',manifest(['content/pages/one.html']));
  put('content/pages/one.html','Original editorial content');
  put('inc/core.php',core());
  git('add','.');git('commit','-qm','Baseline');
  const baselineRef=git('rev-parse','HEAD');
  put('content/manifest.json',manifest(['content/pages/one.html','content/pages/two.html']));
  put('content/pages/one.html','Changed content must not deploy');
  put('content/pages/two.html','Candidate-only file remains unreferenced');
  put('inc/core.php',core(seoEntry('two','New SEO title'),!missingGuard)
    .replace(changedOldSeo?'Original title':'NEVER_REPLACE', 'Changed old title'));
  git('add','.');git('commit','-qm','Candidate');
  return {dir,baselineRef,candidateRef:git('rev-parse','HEAD'),git};
}

const archived=(file,path)=>execFileSync('tar',['-xOzf',file,`solar-expert-2/${path}`],{encoding:'utf8'});

test('candidate keeps new PHP while restoring old manifest and managed HTML exactly',()=>{
  const f=fixture();
  try{
    const outFile=join(f.dir,'first-transition.tar.gz');
    const result=buildFirstTransitionTheme({repoDir:f.dir,baselineRef:f.baselineRef,
      candidateRef:f.candidateRef,outFile});
    assert.equal(result.necessary_content_parity,true);
    assert.equal(result.necessary_old_seo_fingerprint_parity,true);
    assert.equal(result.release_authorized,false);
    assert.equal(result.deployment_performed,false);
    assert.deepEqual(result.overlaid_paths,['content/manifest.json','content/pages/one.html']);
    assert.deepEqual(result.observed_candidate_input_drift,[
      'content/manifest.json','content/pages/one.html','content/pages/two.html'
    ]);
    assert.equal(archived(outFile,'content/manifest.json'),
      f.git('show',`${f.baselineRef}:content/manifest.json`));
    assert.equal(archived(outFile,'content/pages/one.html'),'Original editorial content');
    assert.match(archived(outFile,'inc/core.php'),/SOLAR_EXPERT_ENABLE_AUTOMATIC_CONTENT_SYNC/);
    assert.equal(f.git('show','HEAD:content/pages/one.html'),'Changed content must not deploy');
    assert.throws(()=>buildFirstTransitionTheme({repoDir:f.dir,baselineRef:f.baselineRef,
      candidateRef:f.candidateRef,outFile}),/already exists/);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('changed metadata of an existing managed slug blocks staging even when HTML is restored',()=>{
  const f=fixture({changedOldSeo:true});
  try{
    const outFile=join(f.dir,'unsafe-seo.tar.gz');
    assert.throws(()=>buildFirstTransitionTheme({repoDir:f.dir,baselineRef:f.baselineRef,
      candidateRef:f.candidateRef,outFile}),/SEO metadata/);
    assert.equal(existsSync(outFile),false);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('SEO guard rejects changed fallback and missing mapping implementation',()=>{
  const oldManifest=manifest(['content/pages/one.html']);
  assert.throws(()=>assertOldSeoFingerprintParity({oldCore:core(),
    nextCore:core().replace('return $map','return array() ?: $map'),oldManifest}),/SEO metadata/);
  assert.throws(()=>assertOldSeoFingerprintParity({oldCore:core(),
    nextCore:'<?php /* not a mapping */',oldManifest}),/Missing SEO/);
});

test('no reviewed default-off guard means no archive is emitted',()=>{
  const f=fixture({missingGuard:true});
  try{
    const outFile=join(f.dir,'unsafe.tar.gz');
    assert.throws(()=>buildFirstTransitionTheme({repoDir:f.dir,baselineRef:f.baselineRef,
      candidateRef:f.candidateRef,outFile}),/default-off guard/);
    assert.equal(existsSync(outFile),false);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('only immutable full SHAs and a fresh output path are accepted',()=>{
  const f=fixture();
  try{
    const p={repoDir:f.dir,baselineRef:'main',candidateRef:f.candidateRef,
      outFile:join(f.dir,'nope.tar.gz')};
    assert.throws(()=>buildFirstTransitionTheme(p),/40-hex/);
    assert.equal(existsSync(p.outFile),false);
    assert.throws(()=>buildFirstTransitionTheme({...p,baselineRef:f.baselineRef,
      outFile:join(f.dir,'nonexistent','nope.tar.gz')}),/directory does not exist/);
  }finally{rmSync(f.dir,{recursive:true,force:true});}
});
