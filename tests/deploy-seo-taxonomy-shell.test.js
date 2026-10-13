'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const lines=fs.readFileSync(path.join(root,'.github/workflows/auto-deploy-dev.yml'),'utf8').split('\n');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'content/manifest.json'),'utf8'));

function shellStep(name){
  const target='- name: '+name;
  const start=lines.findIndex(x=>x.trim()===target);
  assert(start>=0,'Expected deployed workflow stage: '+name);
  const next=lines.findIndex((x,i)=>i>start&&/^      - name: /.test(x));
  const end=next<0?lines.length:next;
  const run=lines.findIndex((x,i)=>i>start&&i<end&&x.trim()==='run: |');
  assert(run>start,'Missing bash run block for '+name);
  const body=lines.slice(run+1,end).map(x=>{
    if(!x.trim())return '';
    assert(x.startsWith('          '),'Broken YAML run indentation: '+x);
    return x.slice(10);
  }).join('\n');
  const out=cp.spawnSync('bash',['-n'],{input:body,encoding:'utf8'});
  assert.equal(out.status,0,'Invalid production bash for '+name+': '+out.stderr);
  return body;
}

const categories=shellStep('Reconcile managed categories after release convergence');
const publicVerify=shellStep('Verify public thematic categories for new managed posts');
const targets=manifest.items.filter(x=>x.type==='post'&&x.category_slug);
const published=targets.filter(x=>x.create_if_missing===true&&(x.status||x.status_if_new)==='publish');
assert(targets.length>=7,'All approved merchant and off-grid posts keep category declarations');
assert(published.length>=7,'Expected managed public buyer posts');
assert(categories.includes('expected_categories="$(jq'),'Never hardcode a five-of-five taxonomy total');
assert(categories.includes('managed_taxonomy_targets == $expected'),'Health must compare actual manifest total');
assert(publicVerify.includes('published_pairs < <(jq -r'),'Every public managed post gets a category check');
assert(publicVerify.includes('slug="${pair%%|*}"'),'Pair parsing must not lose slug');
assert(publicVerify.includes('category="${pair#*|}"'),'Pair parsing must not lose category');
assert(!publicVerify.includes('for pair in \\\n'),'No static slug list allowed in category release check');
console.log('PASS: dynamic SEO taxonomy deploy scripts are Bash-valid and manifest-bound for '+published.length+' published posts');
