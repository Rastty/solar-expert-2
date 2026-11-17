import test from 'node:test';
import assert from 'node:assert/strict';
import {capture} from '../tools/capture-live-theme-evidence.mjs';
import {GUARDED_PATHS} from '../tools/live-theme-history-audit.mjs';

const SHA='a'.repeat(40);
const bytes=new TextEncoder().encode('known public theme content');
const response=(body=bytes,{status=200,redirected=false,headers=new Headers()}={})=>({
  status,redirected,headers,
  body:new ReadableStream({start(controller){controller.enqueue(body);controller.close();}})
});

test('reads exactly four public files on pinned origin with no redirects, auth or affiliate calls',async()=>{
  const urls=[];
  const result=await capture({
    sourceSha:SHA,
    readSource:(sha,path)=>{assert.equal(sha,SHA);assert.ok(GUARDED_PATHS.includes(path));return bytes;},
    fetchAsset:async(url,options)=>{
      urls.push(new URL(url));
      assert.equal(options.redirect,'manual');
      assert.equal(options.method,'GET');
      assert.equal(options.headers.Authorization,undefined);
      return response();
    },
    clock:()=>new Date('2026-11-17T20:00:00.000Z')
  });
  assert.equal(result.observed_at_utc,'2026-11-17T20:00:00.000Z');
  assert.equal(result.dev_source_sha,SHA);
  assert.deepEqual(result.files.map(item=>item.path),GUARDED_PATHS);
  assert.ok(result.files.every(item=>item.status==='match'));
  assert.equal(new Set(urls.map(url=>url.pathname)).size,4);
  assert.ok(urls.every(url=>url.origin==='https://solar-expert.cz'&&
    url.pathname.startsWith('/wp-content/themes/solar-expert-2/')&&
    url.searchParams.get('read_only_audit')==='aaaaaaaaaaaa'));
});

test('drift is evidence, not an authorization to update live WordPress',async()=>{
  const result=await capture({
    sourceSha:SHA,readSource:()=>Buffer.from('different source'),
    fetchAsset:async()=>response()
  });
  assert.ok(result.files.every(item=>item.status==='drift'));
  assert.equal(Object.hasOwn(result,'release_authorized'),false);
});

test('refuses wrong site, wrong SHA, redirect, oversize and empty response',async()=>{
  const defaults={sourceSha:SHA,readSource:()=>bytes,fetchAsset:async()=>response()};
  await assert.rejects(capture({...defaults,origin:'https://other.example'}),/non-canonical/);
  await assert.rejects(capture({...defaults,sourceSha:'main'}),/Invalid source/);
  await assert.rejects(capture({...defaults,fetchAsset:async()=>response(bytes,{status:302})}),/status 302/);
  await assert.rejects(capture({...defaults,fetchAsset:async()=>response(bytes,{redirected:true})}),/fetch failed/);
  await assert.rejects(capture({...defaults,fetchAsset:async()=>response(bytes,{headers:new Headers({'content-length':'9000000'})})}),/size limit/);
  await assert.rejects(capture({...defaults,fetchAsset:async()=>response(new Uint8Array())}),/empty/);
});
