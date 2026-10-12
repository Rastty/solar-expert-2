/* Browser-free first-party attribution smoke for the new cross-root Builder CTA.
 * Exercises the real analytics runtime. No network, browser or WP write.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const rootListeners={};
const root={
  addEventListener(type,fn){(rootListeners[type]||(rootListeners[type]=[])).push(fn);},
  dispatchEvent(event){for(const fn of (rootListeners[event.type]||[]))fn(event);},
  querySelectorAll(){return [];},
  matches(){return false;},
};
const document={
  readyState:'complete',
  body:{},
  querySelector(selector){return selector==='#builder'?root:null;},
  querySelectorAll(){return [];},
  addEventListener(){},
};
const window={
  dataLayer:[],
  location:{pathname:'/'},
  SolarExpertAnalyticsConfig:{endpoint:'/wp-json/solar-expert/v1/track'},
};
const requests=[];
const sandbox={window,document,console,
  fetch(url,opts){requests.push({url,body:JSON.parse(opts.body)});return Promise.resolve({ok:true});},
  setTimeout(){return 1;},clearTimeout(){},
};
const analytics=fs.readFileSync(path.join(__dirname,'..','assets/js/analytics.js'),'utf8');
vm.runInNewContext(analytics,sandbox,{filename:'analytics.js'});

const count=(event)=>window.dataLayer.filter(x=>x.event===event&&x.tool==='builder').length;
assert.equal(count('tool_view'),1,'Builder presence counted once on homepage');
assert.equal(count('tool_exposure'),0,'Do not count viewport exposure before visibility or activation');
assert.equal(count('tool_activation'),0,'No interaction yet');
root.dispatchEvent({type:'solar-expert-builder-activated'});
assert.equal(count('tool_exposure'),1,'Hero CTA must attribute a real Builder exposure');
assert.equal(count('tool_start'),1,'Hero CTA must emit the ordinary tool start');
assert.equal(count('tool_activation'),1,'Hero CTA must emit an ordinary tool activation');
root.dispatchEvent({type:'pointerdown'});
root.dispatchEvent({type:'change'});
root.dispatchEvent({type:'solar-expert-builder-activated'});
assert.equal(count('tool_start'),1,'Later clicks inside Builder must not double-count start');
assert.equal(count('tool_activation'),1,'Repeated preview must not double-count activation');
assert.equal(count('tool_exposure'),1,'Repeated preview must not double-count exposure');

const homepage=fs.readFileSync(path.join(__dirname,'..','front-page.php'),'utf8');
const builder=fs.readFileSync(path.join(__dirname,'..','template-parts/solar-builder.php'),'utf8');
assert(homepage.includes('data-se-home-demo="builder-preview"'),'Homepage must expose explicit sample CTA');
assert(homepage.includes('x-data="{}" @click.prevent="$dispatch(\'solar-expert-open-demo\')"'),
  'Explicit hero interaction must notify the Builder without auto-playing');
assert(homepage.includes('href="#builder"'),'Graceful anchor fallback must keep the Builder reachable');
assert(builder.includes('@solar-expert-open-demo.window='),'Builder must handle CTA event with Alpine on window');
assert(builder.includes("new CustomEvent('solar-expert-builder-activated')"),
  'Cross-root CTA must bridge into the first-party deduplicated activation');
assert(builder.includes('quickPreview(); $nextTick('),'Preview must be user-initiated and reveal results');
assert(builder.includes('Modelový výsledek, ne návrh na míru.'),
  'Sample must disclose that it is not personal sizing');
assert(builder.includes('@click="editPreview()"'),'Example must remain editable');
assert(requests.filter(x=>x.body.event==='tool_activation').length===1,
  'First-party endpoint must get only one activation');
console.log('PASS: one-click hero sample, graceful fallback, once-only first-party activation, explicit example disclosure');
