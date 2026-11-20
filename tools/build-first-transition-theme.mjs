#!/usr/bin/env node
/**
 * OFFLINE ONLY: prepare a first-transition theme archive without changing the
 * managed-content inputs seen by already-loaded OLD WordPress PHP upgrader hooks.
 *
 * This is a staging/rehearsal artifact, not a deploy path or authorization.
 * The baseline SHA is only a public-source history candidate until independently
 * reconciled with the complete live theme and stored WordPress fingerprint.
 */
import {constants, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync,
  readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {assessContentInputs, assessGitRefs, manifestPaths} from './theme-code-only-content-preflight.mjs';

const fullSha=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const readGit=(repoDir,rev,path)=>execFileSync('git',['show',`${rev}:${path}`],{
  cwd:repoDir,stdio:['ignore','pipe','ignore'],maxBuffer:4*1024*1024
});

function checkedDestination(root,path){
  const target=resolve(root,path);
  if(!target.startsWith(root+sep))throw new Error('Managed source escaped staging root');
  let part=root;
  for(const segment of relative(root,dirname(target)).split(sep)){
    if(!segment||segment==='.')continue;
    part=join(part,segment);
    if(existsSync(part)){
      if(!lstatSync(part).isDirectory())throw new Error('Unsafe managed source parent: '+path);
    }else mkdirSync(part);
  }
  if(existsSync(target)&&!lstatSync(target).isFile())throw new Error('Unsafe managed source target: '+path);
  return target;
}

/**
 * PHP fingerprint also hashes SEO title/description for EVERY old manifest slug.
 * Fail closed on changes to their mapping or surrounding function logic. Pure
 * additions for slugs absent from the old manifest are irrelevant to that hash.
 * This narrow check relies on the explicit literal-array formatting in core.php;
 * if the source shape changes, a human/PHP rehearsal must replace this guard.
 */
export function assertOldSeoFingerprintParity({oldCore,nextCore,oldManifest}){
  const doc=JSON.parse(Buffer.from(oldManifest).toString('utf8'));
  if(!Array.isArray(doc.items)||doc.items.some(item=>typeof item.slug!=='string')){
    throw new Error('Unusable baseline SEO slugs');
  }
  const oldSlugs=new Set(doc.items.map(item=>item.slug));
  const scoped=source=>{
    const start=source.indexOf('function solar_expert_seo_meta(');
    if(start===-1)throw new Error('Missing SEO fingerprint mapping function');
    const end=source.indexOf('\nfunction ',start+1);
    if(end===-1)throw new Error('Unbounded SEO fingerprint mapping function');
    const body=source.slice(start,end);
    const literal=/^    '([^']+)' => array\(\r?\n      'title' => '(?:\\.|[^'\\])*',\r?\n      'description' => '(?:\\.|[^'\\])*'\r?\n    \),\r?\n/gm;
    return body.replace(literal,(entry,slug)=>oldSlugs.has(slug)?entry:'');
  };
  if(scoped(oldCore)!==scoped(nextCore)){
    throw new Error('SEO metadata for baseline managed slugs (or fallback code) changed');
  }
}

export function buildFirstTransitionTheme({repoDir=process.cwd(),baselineRef,candidateRef,outFile}){
  if(!fullSha(baselineRef)||!fullSha(candidateRef))throw new TypeError('Both refs must be exact 40-hex commit SHAs');
  if(typeof outFile!=='string'||!outFile.endsWith('.tar.gz'))throw new TypeError('Provide an output .tar.gz path');
  const destination=resolve(outFile);
  if(existsSync(destination))throw new Error('Output already exists; refusing overwrite');
  if(!existsSync(dirname(destination)))throw new Error('Output directory does not exist');
  const gitDir=resolve(repoDir);
  const original=assessGitRefs({repoDir:gitDir,baselineRef,candidateRef});
  const temporary=mkdtempSync(join(tmpdir(),'solar-first-transition-'));
  try{
    const stage=join(temporary,'solar-expert-2');
    mkdirSync(stage);
    const sourceTar=join(temporary,'candidate.tar');
    execFileSync('git',['archive','--format=tar',`--output=${sourceTar}`,candidateRef],{
      cwd:gitDir,stdio:['ignore','pipe','pipe'],maxBuffer:1024*1024
    });
    execFileSync('tar',['-xf',sourceTar,'-C',stage],{stdio:['ignore','pipe','pipe']});

    // The candidate must already contain the reviewed default-off PHP guard.
    // This literal guard is a necessary check; its behavior is tested in PHP CI.
    const core=readFileSync(join(stage,'inc/core.php'),'utf8');
    if(!core.includes('SOLAR_EXPERT_ENABLE_AUTOMATIC_CONTENT_SYNC')||
       !core.includes('solar_expert_automatic_content_sync_enabled')){
      throw new Error('Candidate lacks reviewed automatic-sync default-off guard');
    }

    const oldManifest=readGit(gitDir,baselineRef,'content/manifest.json');
    assertOldSeoFingerprintParity({
      oldCore:readGit(gitDir,baselineRef,'inc/core.php').toString('utf8'),
      nextCore:core,oldManifest
    });
    const changed=[];
    for(const path of ['content/manifest.json',...manifestPaths(oldManifest)]){
      const oldBytes=path==='content/manifest.json'?oldManifest:readGit(gitDir,baselineRef,path);
      const target=checkedDestination(stage,path);
      if(!existsSync(target)||!readFileSync(target).equals(oldBytes))changed.push(path);
      writeFileSync(target,oldBytes);
    }
    const parity=assessContentInputs({
      baselineManifest:oldManifest,
      candidateManifest:readFileSync(join(stage,'content/manifest.json')),
      readBaseline:path=>readGit(gitDir,baselineRef,path),
      readCandidate:path=>readFileSync(join(stage,path))
    });
    if(!parity.necessary_content_parity)throw new Error('Managed-content parity failed after baseline overlay');

    const archive=join(temporary,'candidate-preserving-content.tar.gz');
    execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0',
      '--numeric-owner','--format=posix','-czf',archive,'-C',temporary,'solar-expert-2'],{
      stdio:['ignore','pipe','pipe']
    });
    const archiveSha=digest(readFileSync(archive));
    copyFileSync(archive,destination,constants.COPYFILE_EXCL);
    if(digest(readFileSync(destination))!==archiveSha)throw new Error('Output archive checksum mismatch');
    return {
      schema_version:1,mode:'offline_first_transition_content_preserving_candidate',
      baseline_ref:baselineRef,candidate_ref:candidateRef,
      observed_candidate_input_drift:original.changed_inputs,
      baseline_managed_file_count:parity.checked_managed_file_count,
      overlaid_paths:changed.sort(),
      necessary_content_parity:parity.necessary_content_parity,
      necessary_old_seo_fingerprint_parity:true,
      staged_manifest_sha256:parity.candidate_manifest_sha256,
      archive_path:destination,archive_sha256:archiveSha,
      release_authorized:false,deployment_performed:false,
      limitation:'Only an offline candidate. Public SHA history does not prove the complete live theme, stored WP content fingerprint, old SEO map, DB/media safety or full rollback. No GitHub dev deploy or WordPress update is performed.'
    };
  }finally{
    rmSync(temporary,{recursive:true,force:true});
  }
}

if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
  const args=process.argv.slice(2);
  if(args.length!==4||args[2]!=='--out'){
    console.error('Usage: node tools/build-first-transition-theme.mjs OLD_SHA NEW_SHA --out /existing/dir/candidate.tar.gz');
    process.exitCode=2;
  }else try{
    console.log(JSON.stringify(buildFirstTransitionTheme({
      baselineRef:args[0],candidateRef:args[1],outFile:args[3]
    }),null,2));
  }catch(error){
    console.error('TRANSITION_ARCHIVE_NOT_READY: '+error.message+' release_authorized=false');
    process.exitCode=2;
  }
}
