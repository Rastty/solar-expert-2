import test from 'node:test';
import assert from 'node:assert/strict';
import {assessContentInputs,assessGitRefs} from '../tools/theme-code-only-content-preflight.mjs';
import {execFileSync} from 'node:child_process';

const content=(items=[{file:'content/pages/selector.html'}])=>Buffer.from(JSON.stringify({schemaVersion:'1',items}));
const baseFiles={'content/pages/selector.html':Buffer.from('<p>Original managed page</p>')};
const assess=(oldManifest=content(),nextManifest=content(),before=baseFiles,after=baseFiles)=>
  assessContentInputs({baselineManifest:oldManifest,candidateManifest:nextManifest,
    readBaseline:path=>before[path],readCandidate:path=>after[path]});

test('exact managed bytes match but never authorize production',()=>{
  const result=assess();
  assert.equal(result.status,'managed_content_inputs_identical');
  assert.equal(result.necessary_content_parity,true);
  assert.deepEqual(result.changed_inputs,[]);
  assert.equal(result.release_authorized,false);
});

test('changed HTML and new manifest items are separately identified',()=>{
  const next=content([{file:'content/pages/selector.html'},{file:'content/pages/new.html'}]);
  const result=assess(content(),next,baseFiles,{
    'content/pages/selector.html':Buffer.from('<p>Altered</p>'),
    'content/pages/new.html':Buffer.from('<p>New</p>')
  });
  assert.equal(result.necessary_content_parity,false);
  assert.deepEqual(result.changed_inputs,[
    'content/manifest.json','content/pages/new.html','content/pages/selector.html'
  ]);
});

test('missing source, invalid JSON and path traversal fail closed',()=>{
  assert.deepEqual(assess(content(),content(),baseFiles,{}).changed_inputs,
    ['content/pages/selector.html']);
  assert.throws(()=>assess(Buffer.from('{'),content()),/Invalid managed-content/);
  assert.throws(()=>assess(content([{file:'content/../inc/core.php'}]),content()),/Unsafe/);
  assert.throws(()=>assess(content([{file:'https://shop.test/secret'}]),content()),/Unsafe/);
});

test('CLI git reader accepts exact current commit as identity fixture',()=>{
  const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const result=assessGitRefs({baselineRef:head,candidateRef:head});
  assert.equal(result.necessary_content_parity,true);
  assert.equal(result.release_authorized,false);
  assert.throws(()=>assessGitRefs({baselineRef:'dev',candidateRef:head}),/exact 40-hex/);
});
