'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const lines=fs.readFileSync(path.join(root,'.github/workflows/auto-deploy-dev.yml'),'utf8').split('\n');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'content/manifest.json'),'utf8'));

// Validate the entire workflow's Bash scalar boundaries. A previously
// appended fragment with zero indentation invalidated GitHub Actions before
// any job could start, even though the two taxonomy scripts were bash-valid.
let workflowBlocks=0;
for(let i=0;i<lines.length;i++){
  if(lines[i] !== '        run: |') continue;
  workflowBlocks++;
  for(let j=i+1;j<lines.length;j++){
    if(/^      - name: /.test(lines[j])) break;
    if(!lines[j].trim()) continue;
    assert(lines[j].startsWith('          '),
      'Unindented/garbled text outside run YAML literal at line '+(j+1)+': '+lines[j]);
  }
}
assert(workflowBlocks>=20,'Production deploy must retain complete expected verification stages');
const finalCheck='- name: Verify real public Czech buyer guidance (no stale homepage cache)';
assert.equal(lines.filter(x=>x.trim()===finalCheck).length,1,'Workflow must not append duplicate trailing step fragments');
assert.equal(lines.filter(x=>x.trim()).at(-1).trim(),'done',
  'No unmatched stray text after last production verification');


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
// The site currently renders Yoast's real robots tag with SINGLE quotes:
 // <meta name='robots' content='noindex, follow' />. Do not gate on
 // a double-quote-only synthetic fixture or report a false failed release.
const hygiene=shellStep('Verify foreign-import noindex pilot on live WordPress');
const noindexPattern=/<meta[^>]+robots[^>]+noindex|<meta[^>]+noindex[^>]+robots/i;
for(const html of [
  "<meta name='robots' content='noindex, follow' />",
  '<meta name="robots" content="noindex, follow" />',
  '<meta content="noindex, follow" name="robots" />'
]){
  assert(noindexPattern.test(html),'Smoke must accept live and double-quoted Yoast robots metadata');
}
assert(hygiene.includes("grep -Eiq '<meta[^>]+robots[^>]+noindex|<meta[^>]+noindex[^>]+robots'"),
  'The release smoke must support both single- and double-quoted actual Yoast HTML');
assert(!hygiene.includes('name="robots"[^>]*content="'),
  'Old double-quote-only gate would falsely fail a real Yoast noindex tag');
console.log('PASS: dynamic SEO taxonomy and public noindex smoke are Bash-valid and manifest-bound for '+published.length+' published posts');
