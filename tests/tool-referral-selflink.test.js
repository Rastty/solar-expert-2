'use strict';
/**
 * A tool referral is a click FROM another page into a tool, not a click on
 * the tool's own sample button or anchor. Runs the actual browser analytics
 * with a minimal offline DOM; no WordPress, merchant or network activity.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const analytics=fs.readFileSync(path.join(__dirname,'..','assets/js/analytics.js'),'utf8');

function referrals(page,links){
  const clickHandlers=[];
  const document={
    readyState:'complete',
    body:null,
    addEventListener(type,handler){if(type==='click')clickHandlers.push(handler);},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    matches(){return false;}
  };
  const window={
    location:new URL(page,'https://solar-expert.cz/'),
    dataLayer:[],
    SolarExpertAnalyticsConfig:{}
  };
  vm.runInNewContext(analytics,{window,document,URL,console},{filename:'analytics.js'});
  assert(clickHandlers.length>=1,'Delegated link tracking must be installed');
  for(const href of links){
    const anchor={href:new URL(href,window.location.href).href};
    const event={target:{closest(selector){return selector==='a[href]'?anchor:null;}}};
    for(const listener of clickHandlers)listener(event);
  }
  return window.dataLayer.filter(item=>item.event==='tool_referral_click').map(item=>item.tool);
}

// On the Builder's canonical landing page, the visible one-click demo does
// not navigate away; activation is measured independently by tool_activation.
assert.deepEqual(referrals('/solarni-sestava-na-chatu/',[
  '#builder',
  '/solarni-sestava-na-chatu/#builder',
  '/solarni-sestava-na-chatu/?source=self',
  '/solarni-sestava-na-chatu'
]),[],'Builder self-links and demo must not inflate acquisition referrals');
assert.deepEqual(referrals('/quote-checker/',[
  '/quote-checker/',
  '/quote-checker/#result'
]),[],'The same guard applies to other canonical tools');

// Discovery-to-tool journeys remain intact, including the embedded homepage
// Builder. On-page homepage handoff is different from a canonical tool self-link.
assert.deepEqual(referrals('/fotovoltaika-vykon-na-m2/',[
  '/solarni-sestava-na-chatu/',
  '/mppt-kalkulacka/',
  'https://external.example/solarni-sestava-na-chatu/'
]),['builder','mppt'],'Owned editorial referrals still count, external domains do not');
assert.deepEqual(referrals('/',[
  '/#builder',
  '/solarni-sestava-na-chatu/'
]),['builder','builder'],'Homepage embedded Builder handoff must remain measurable');
assert.deepEqual(referrals('/solarni-sestava-na-chatu/',[
  '/quote-checker/'
]),['quote'],'Cross-tool navigation from Builder must still count');

console.log('PASS: canonical self-links excluded; editorial, homepage and cross-tool referrals preserved');
