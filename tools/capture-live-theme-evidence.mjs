#!/usr/bin/env node
/**
 * Capture SHA256 of the four public Solar Expert theme assets without mutating
 * WordPress, using affiliate links or treating the hashes as a release permit.
 * Feed the resulting JSON to tools/live-theme-history-audit.mjs.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {GUARDED_PATHS,sha256} from './live-theme-history-audit.mjs';

const SITE='https://solar-expert.cz';
const ROOT='/wp-content/themes/solar-expert-2/';
const MAX_BYTES=8*1024*1024;
const HEX_SHA=/^[0-9a-f]{40}$/;

export async function capture({
  sourceSha,
  readSource,
  fetchAsset=fetch,
  clock=()=>new Date(),
  origin=SITE
}){
  if(!HEX_SHA.test(sourceSha)||typeof readSource!=='function'||
      typeof fetchAsset!=='function'||origin!==SITE){
    throw new Error('Invalid source revision or non-canonical public site');
  }
  const observedAt=clock().toISOString();
  const records=[];
  for(const path of GUARDED_PATHS){
    const url=new URL(ROOT+path,SITE);
    url.searchParams.set('read_only_audit',sourceSha.slice(0,12));
    const response=await fetchAsset(url.toString(),{
      method:'GET',redirect:'manual',signal:AbortSignal.timeout(30000),
      headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}
    });
    if(response.status!==200||response.redirected){
      throw new Error('Public asset fetch failed for '+path+' (status '+response.status+')');
    }
    const declared=Number(response.headers?.get?.('content-length'));
    if(Number.isFinite(declared)&&declared>MAX_BYTES){
      throw new Error('Public asset exceeds audit size limit: '+path);
    }
    if(!response.body?.getReader){
      throw new Error('Public asset response has no readable body: '+path);
    }
    const reader=response.body.getReader();
    const chunks=[];
    let size=0;
    try{
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        size+=value.byteLength;
        if(size>MAX_BYTES)throw new Error('Public asset exceeds audit size limit: '+path);
        chunks.push(value);
      }
    }finally{reader.releaseLock();}
    if(size===0)throw new Error('Public asset is empty: '+path);
    const liveSha=sha256(Buffer.concat(chunks));
    const expectedSha=sha256(readSource(sourceSha,path));
    records.push({path,status:liveSha===expectedSha?'match':'drift',live_sha256:liveSha});
  }
  return {
    observed_at_utc:observedAt,
    dev_source_sha:sourceSha,
    files:records
  };
}

export async function run({repoDir=process.cwd(),output}){
  const git=(...args)=>execFileSync('git',args,{cwd:repoDir,encoding:'utf8'}).trim();
  const sourceSha=git('rev-parse','HEAD');
  const result=await capture({
    sourceSha,
    readSource:(commit,path)=>execFileSync('git',['show',`${commit}:${path}`],{
      cwd:repoDir,maxBuffer:MAX_BYTES,stdio:['ignore','pipe','ignore']
    })
  });
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log('SOLAR_LIVE_CAPTURE status=ok files='+result.files.length+
    ' compared_to_dev='+sourceSha.slice(0,12)+' release_authorized=false');
  return result;
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
  if(process.argv.length!==3){
    console.error('Usage: node tools/capture-live-theme-evidence.mjs OUTPUT_JSON');
    process.exitCode=2;
  }else{
    try{await run({output:process.argv[2]});}
    catch(error){
      console.error('SOLAR_LIVE_CAPTURE status=unavailable release_authorized=false '+error.message);
      process.exitCode=1;
    }
  }
}
