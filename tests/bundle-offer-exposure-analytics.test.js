'use strict';
/**
 * Exercise actual assets/js/analytics.js tracking in a bounded fake DOM.
 * No browser, WordPress write, analytics service, cookies or real affiliate visits.
 */
const assert=require('node:assert/strict');
const sent=[];
const listeners=new Map();
const observed=[];
let observerCb=null;
let mutationCb=null;
const pending=new Map();
let nextTimer=0;
const origSet=global.setTimeout,origClear=global.clearTimeout;
global.setTimeout=(fn,ms)=>{assert.equal(ms,600,'Exposure needs >=600ms visible dwell');const id=++nextTimer;pending.set(id,fn);return id;};
global.clearTimeout=id=>{pending.delete(id);};
function flush(){const all=[...pending.entries()];pending.clear();for(const [,fn] of all)fn();}
function link(attrs){
  return {
    nodeType:1,
    href:attrs.href,
    getAttribute(name){return attrs[name]||null;},
    matches(selector){
      return attrs['data-se-deal-id']
        ? selector.includes('a[data-se-deal-id]')
        : selector.includes('.se-offer[data-se-product-id]');
    },
    querySelectorAll(){return [];},
    closest(selector){return this.matches(selector)?this:null;}
  };
}
const dealA=link({
  href:'https://www.battery.cz/real-deal/',
  'data-se-deal-id':'deal-pusung-growatt',
  'data-se-merchant':'battery-cz',
  'data-se-placement':'builder-best'
});
const dealB=link({
  href:'https://www.solar-import.cz/real-deal/',
  'data-se-deal-id':'deal-pusung-growatt',
  'data-se-merchant':'solar-import-cz',
  'data-se-placement':'builder-best'
});
const disabled=link({
  href:'#','data-se-deal-id':'deal-pusung-growatt',
  'data-se-merchant':'unknown','data-se-placement':'builder-best'
});
const product=link({
  href:'https://www.battery.cz/battery/',
  'data-se-product-id':'battery-24-100',
  'data-se-merchant':'battery-cz',
  'data-se-placement':'builder-battery-best'
});
const invalidProduct=link({
  href:'javascript:alert(1)',
  'data-se-product-id':'fake-cheap-battery',
  'data-se-merchant':'battery-cz',
  'data-se-placement':'builder-battery-best'
});
const sameSiteProduct=link({
  href:'https://solar-expert.cz/fake-offer/',
  'data-se-product-id':'fake-local-product',
  'data-se-merchant':'solar-import-cz',
  'data-se-placement':'battery-selector'
});
const roots=[dealA,dealB,disabled,invalidProduct,sameSiteProduct,product];
global.window={
  location:{href:'https://solar-expert.cz/solarni-sestava-na-chatu/',origin:'https://solar-expert.cz',pathname:'/solarni-sestava-na-chatu/'},
  dataLayer:[],
  SolarExpertAnalyticsConfig:{endpoint:'/wp-json/solar-expert/v1/funnel-event'},
  IntersectionObserver:true,
  MutationObserver:true
};
global.document={
  readyState:'complete',body:{},
  querySelector(){return null;}, // no synthetic tool activation
  querySelectorAll(){return roots;},
  addEventListener(name,cb,opts){
    if(!listeners.has(name))listeners.set(name,[]);
    listeners.get(name).push({cb,opts});
  }
};
global.IntersectionObserver=class {
  constructor(cb,opts){observerCb=cb;assert.deepEqual(opts.threshold,[0,.5,1]);}
  observe(target){observed.push(target);}
  unobserve(){}
};
global.MutationObserver=class {
  constructor(cb){mutationCb=cb;}
  observe(){}
};
global.fetch=(url,request)=>{
  assert.equal(url,'/wp-json/solar-expert/v1/funnel-event');
  assert.equal(request.method,'POST');
  assert.equal(request.keepalive,true);
  sent.push(JSON.parse(request.body));
  return Promise.resolve({ok:true});
};
function visible(target,ratio){
  observerCb([{target,isIntersecting:ratio>0,intersectionRatio:ratio}]);
}
function click(target){
  for(const {cb} of (listeners.get('click')||[])) cb({target});
}
try{
  require('../assets/js/analytics.js');
  assert.equal(typeof observerCb,'function');
  assert.equal(typeof mutationCb,'function');
  assert.equal(observed.length,3,'Only genuine external product/deal destinations may be watched');
  assert.equal(sent.length,0,'No impressions from merely stamping hidden result DOM');
  click(disabled);
  click(invalidProduct);
  click(sameSiteProduct);
  assert.equal(sent.length,0,'Clicking #, javascript: or same-site offer placeholders cannot fabricate merchant exposure');

  visible(dealA,.4);
  flush();
  assert.equal(sent.length,0,'Less than 50% of offer CTA in viewport is not exposure');
  visible(dealA,.8);
  assert.equal(sent.length,0,'No impression without 600ms stable visibility');
  flush();
  assert.equal(sent.length,1);
  assert.deepEqual(sent[0],{
    event:'bundle_deal_exposure',dealId:'deal-pusung-growatt',merchant:'battery-cz',
    placement:'builder-best',page:'solarni-sestava-na-chatu'
  });
  visible(dealA,.8);flush();click(dealA);
  assert.equal(sent.length,1,'Same merchant+set+placement counts once per page, incl. click fallback');

  visible(dealB,.8);
  visible(dealB,0);
  flush();
  assert.equal(sent.length,1,'Off-screen before 600ms cancels exposure');
  click(dealB);
  assert.equal(sent.length,2,'Real outbound click proves actual exposure if IntersectionObserver misses it');
  assert.equal(sent[1].event,'bundle_deal_exposure');
  assert.equal(sent[1].merchant,'solar-import-cz');
  assert.equal(sent[1].dealId,'deal-pusung-growatt');
  click(dealB);
  assert.equal(sent.length,2,'No duplicate impression for same real dealer CTA');

  visible(product,.8);flush();
  assert.equal(sent.length,3);
  assert.equal(sent[2].event,'offer_exposure',
    'Product impression remains separate from set impression');
  assert.equal(sent[2].productId,'battery-24-100');
  assert.equal(sent.filter(x=>x.event==='bundle_deal_click').length,0,
    'Neither viewport presence nor simulated click on offer tracking helper creates an affiliate conversion');
  assert(!JSON.stringify(sent).includes('https://www.battery.cz/'),
    'Privacy: never transmit merchant destination or affiliate tokens');

  const clonedDeal=link({
    href:'https://www.battery.cz/real-deal/',
    'data-se-deal-id':'deal-pusung-growatt',
    'data-se-merchant':'battery-cz',
    'data-se-placement':'builder-best'
  });
  mutationCb([{type:'childList',addedNodes:[clonedDeal]}]);
  assert(observed.includes(clonedDeal),'Alpine dynamically stamped bundle offer must be observed');
  visible(clonedDeal,.8);flush();
  assert.equal(sent.length,3,'Dynamic clone cannot inflate exposure for same deal/merchant/placement');

  const otherTier=link({
    href:'https://www.battery.cz/real-deal/',
    'data-se-deal-id':'deal-pusung-growatt',
    'data-se-merchant':'battery-cz',
    'data-se-placement':'builder-premium'
  });
  mutationCb([{type:'childList',addedNodes:[otherTier]}]);
  visible(otherTier,.8);flush();
  assert.equal(sent.length,4,'Different tier placement remains distinct genuine impression');
  assert.equal(sent[3].placement,'builder-premium');
  console.log('PASS: real viewport/click-driven bundle impressions (50%/600ms), product separation, dynamic DOM, per-store attribution');
}finally{
  global.setTimeout=origSet;
  global.clearTimeout=origClear;
}
