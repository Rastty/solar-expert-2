#!/usr/bin/env node
/**
 * Read-only FIRST-MIGRATION check for implicit writes by the OLD WordPress
 * theme code. Old upgrader hooks calculate a fingerprint from manifest bytes,
 * every managed HTML file and their old PHP SEO mapping. Identical manifest
 * and HTML bytes are necessary (but not sufficient) for a write-free update.
 *
 * No Deployer call, WordPress write, API token, backup assertion or release
 * authorization is made by this tool. In particular, the NEW theme's opt-out
 * cannot stop old already-loaded PHP hooks within the updater request.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
const validPath=p=>typeof p==='string'&&p.startsWith('content/')&&
  !p.includes('\\')&&!p.split('/').some(x=>!x||x==='.'||x==='..');

function manifestPaths(bytes){
  let doc;
  try { doc=JSON.parse(Buffer.from(bytes).toString('utf8')); }
  catch(_) { throw new Error('Invalid managed-content manifest JSON'); }
  if(!doc||!Array.isArray(doc.items))throw new Error('Missing manifest items');
  const files=new Set();
  for(const item of doc.items){
    if(!item||!validPath(item.file))throw new Error('Unsafe managed-content file path');
    files.add(item.file);
  }
  return files;
}

export function assessContentInputs({baselineManifest,candidateManifest,readBaseline,readCandidate}){
  if(!baselineManifest||!candidateManifest||typeof readBaseline!=='function'||
     typeof readCandidate!=='function')throw new TypeError('Missing manifest or source reader');
  const old=Buffer.from(baselineManifest),next=Buffer.from(candidateManifest);
  const paths=[...new Set([...manifestPaths(old),...manifestPaths(next)])].sort();
  const changed=[];
  if(!old.equals(next))changed.push('content/manifest.json');
  for(const path of paths){
    let before,after;
    try { before=Buffer.from(readBaseline(path)); after=Buffer.from(readCandidate(path)); }
    catch(_) { changed.push(path); continue; }
    if(!before.equals(after))changed.push(path);
  }
  return {
    schema_version:1,
    mode:'first_migration_old_php_content_fingerprint_input_parity',
    status:changed.length?'managed_content_inputs_drift':'managed_content_inputs_identical',
    baseline_manifest_sha256:sha256(old),candidate_manifest_sha256:sha256(next),
    checked_managed_file_count:paths.length,changed_inputs:changed,
    necessary_content_parity:changed.length===0,
    release_authorized:false,
    limitation:'Identical files alone cannot prove stored WP fingerprint, old SEO code parity, theme PHP behavior, DB/media preservation, complete rollback or safe deployment. The protected release workflow remains authoritative.'
  };
}

const isRev=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);
export function assessGitRefs({repoDir=process.cwd(),baselineRef,candidateRef}){
  if(!isRev(baselineRef)||!isRev(candidateRef))throw new TypeError('Expected exact 40-hex commit SHAs');
  const show=(rev,path)=>execFileSync('git',['show',rev+':'+path],{
    cwd:repoDir,maxBuffer:2*1024*1024,stdio:['ignore','pipe','ignore']
  });
  return {
    baseline_ref:baselineRef,candidate_ref:candidateRef,
    ...assessContentInputs({
      baselineManifest:show(baselineRef,'content/manifest.json'),
      candidateManifest:show(candidateRef,'content/manifest.json'),
      readBaseline:path=>show(baselineRef,path),readCandidate:path=>show(candidateRef,path)
    })
  };
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
  const args=process.argv.slice(2);
  if((args.length!==2&&args.length!==3)||
      (args.length===3&&args[2]!=='--require-identical')){
    console.error('Usage: node tools/theme-code-only-content-preflight.mjs OLD_SHA NEW_SHA [--require-identical]');
    process.exitCode=2;
  }else{
    try{
      const result=assessGitRefs({baselineRef:args[0],candidateRef:args[1]});
      console.log(JSON.stringify(result,null,2));
      if(args[2]==='--require-identical'&&!result.necessary_content_parity)process.exitCode=1;
    }catch(error){
      console.error('CONTENT_PREFLIGHT_UNAVAILABLE: '+error.message+' release_authorized=false');
      process.exitCode=2;
    }
  }
}
