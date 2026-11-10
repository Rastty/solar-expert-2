#!/usr/bin/env node
/**
 * Read-only provenance investigation: can a prior Git commit explain exactly
 * four publicly observable theme files now served by solar-expert.cz?
 *
 * Not a full WordPress-theme restore, database/media backup, safety approval,
 * deployment, proof of private PHP parity or authorization to change production.
 * The caller must first GET the actual four public files and record SHA256.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

export const GUARDED_PATHS=Object.freeze([
  'style.css',
  'assets/js/selectors.js',
  'assets/js/affiliate-adapter.js',
  'assets/data/product-seed.json'
]);

const isSha256=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const isCommit=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);

export const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');

export function evaluate(observation,{head,commits,readBlob}){
  const base={
    schema_version:1,
    measurement:'public_four_asset_sha256_git_history_candidate_only',
    observed_at_utc:observation?.observed_at_utc||null,
    dev_source_sha:observation?.dev_source_sha||null,
    inspected_commits:0,
    history_scope:'bounded_first_parent_dev_history',
    candidate_commit:null,
    candidate_full_four_file_match:false,
    best_partial_match_count:0,
    best_partial_commit:null,
    release_authorized:false,
    wordpress_backup_proven:false,
    live_theme_restore_proven:false,
    proof_limit:'Four public theme files ONLY. Git code match is not a complete live theme, PHP, database, wp_options, uploads or staging restore proof.',
    status:'invalid_or_incomplete_evidence'
  };
  const rows=observation?.files;
  if(!Array.isArray(rows)||rows.length!==GUARDED_PATHS.length||!isCommit(head)||
      !isCommit(observation.dev_source_sha)||head!==observation.dev_source_sha||
      !Array.isArray(commits)||typeof readBlob!=='function')return base;
  const map=new Map();
  for(const row of rows){
    if(!row||!GUARDED_PATHS.includes(row.path)||map.has(row.path)||
       !['match','drift','unavailable'].includes(row.status))return base;
    map.set(row.path,row);
  }
  if(GUARDED_PATHS.some(path=>!map.has(path)))return base;
  if(GUARDED_PATHS.some(path=>map.get(path).status==='unavailable'||
    !isSha256(map.get(path).live_sha256)))return base;
  base.status='no_exact_historical_candidate';
  for(const commit of commits.slice(0,300)){
    if(!isCommit(commit)){base.status='invalid_git_history';base.candidate_commit=null;return base;}
    base.inspected_commits++;
    let matches=0;
    for(const path of GUARDED_PATHS){
      try{
        const blob=readBlob(commit,path);
        if(blob && sha256(blob)===map.get(path).live_sha256)matches++;
      }catch(_){/* missing historical file is not a hash match */ }
    }
    if(matches>base.best_partial_match_count){
      base.best_partial_match_count=matches;
      base.best_partial_commit=commit;
    }
    if(matches===GUARDED_PATHS.length){
      base.candidate_commit=commit;
      base.candidate_full_four_file_match=true;
      base.status='four_public_assets_match_historical_git';
      return base;
    }
  }
  return base;
}

export function run({repoDir=process.cwd(),input,output}){
  const observation=JSON.parse(readFileSync(input,'utf8'));
  const git=(...args)=>execFileSync('git',args,{
    cwd:repoDir,encoding:'utf8',maxBuffer:8*1024*1024
  }).trim();
  const head=git('rev-parse','HEAD');
  const commits=git('rev-list','--first-parent','--max-count=300','HEAD')
    .split(/\r?\n/).filter(Boolean);
  const result=evaluate(observation,{
    head,commits,
    readBlob:(sha,path)=>execFileSync('git',['show',sha+':'+path],{
      cwd:repoDir,maxBuffer:8*1024*1024,stdio:['ignore','pipe','ignore']
    })
  });
  result.calculated_at_utc=new Date().toISOString();
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log('SOLAR_LIVE_GIT_PROVENANCE status='+result.status+
    ' public_asset_matches='+result.best_partial_match_count+'/4'+
    ' inspected_commits='+result.inspected_commits+
    ' release_authorized=false');
  return result;
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
  if(process.argv.length!==4){
    console.error('Usage: node tools/live-theme-history-audit.mjs INPUT_JSON OUTPUT_JSON');
    process.exitCode=2;
  }else{
    try{run({input:process.argv[2],output:process.argv[3]});}
    catch(_){
      // An audit failure never opens any deployment or claims parity.
      console.error('SOLAR_LIVE_GIT_PROVENANCE status=unavailable release_authorized=false');
      process.exitCode=1;
    }
  }
}
