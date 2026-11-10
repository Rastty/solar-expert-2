'use strict';
/**
 * E.ON lead analytics must represent a real external landing-page click, not
 * broken affiliate overrides, same-site links or # placeholders.
 * No production links, network calls or WordPress writes.
 */
const assert=require('node:assert/strict');
global.window={
  location:{origin:'https://solar-expert.cz'},
  SolarExpertConfig:{affiliateMap:{products:{},leads:{}},affiliateBases:{}},
  dataLayer:[]
};
require('../assets/js/affiliate-adapter.js');
const A=window.SolarExpertAffiliate;
const events=()=>window.dataLayer.filter(event=>event.event==='lead_click');
const direct='https://www.eon.cz/domacnosti/usporne-technologie/solar/';
const base='https://ehub.cz/system/scripts/click.php?a_aid=test&a_bid=approved-eon';

for(const invalid of ['#','', '/nabidka','https://solar-expert.cz/nabidka',
  'javascript:alert(1)','data:text/html,evil','mailto:lead@example.com']){
  window.SolarExpertConfig.affiliateMap.leads['eon-solar']=invalid;
  window.dataLayer.length=0;
  const fallback=A.resolveLead('eon-solar',direct);
  assert.equal(fallback.href,direct,'Invalid lead override cannot hide real E.ON landing page: '+invalid);
  assert.equal(fallback.monetized,false,'No affiliate attribution for source-only E.ON landing');
  A.trackLead('eon-solar','quote_checker_result_needs_comparison',direct);
  assert.equal(events().length,1,'Only a real outgoing lead is measured');
  assert.equal(events()[0].hrefType,'source');
  const missing=A.resolveLead('eon-solar',invalid);
  assert.equal(missing.href,'#','Invalid override and fallback must fail closed: '+invalid);
  assert.equal(missing.monetized,false);
  window.dataLayer.length=0;
  A.trackLead('eon-solar','broken',invalid);
  assert.equal(events().length,0,'Never count broken CTA as lead, even when clicked');
}
window.SolarExpertConfig.affiliateBases['eon-cz']=base;
window.SolarExpertConfig.affiliateMap.leads['eon-solar']='javascript:alert(1)';
const generated=A.resolveLead('eon-solar',direct);
assert.equal(generated.monetized,true);
assert.equal(new URL(generated.href).searchParams.get('desturl'),direct,
  'Approved redirect must target the actual E.ON lead landing URL');
window.dataLayer.length=0;
A.trackLead('eon-solar','fve_price_guide_compare',direct);
assert.equal(events().length,1);
assert.equal(events()[0].monetized,true);
assert.equal(events()[0].hrefType,'affiliate');
window.SolarExpertConfig.affiliateMap.leads['eon-solar']='https://ehub.cz/system/scripts/click.php?a_bid=valid-override';
assert.equal(A.resolveLead('eon-solar',direct).href,
  window.SolarExpertConfig.affiliateMap.leads['eon-solar'],
  'Preserve valid owner-approved exact E.ON affiliate mapping');

window.SolarExpertConfig.affiliateMap.leads={};
window.SolarExpertConfig.affiliateBases={};
function link(id,fallback,placement){
  const attrs={'data-se-lead-id':id,'data-se-fallback':fallback,
    'data-se-placement':placement,href:fallback};
  const handlers={};
  return {attrs,handlers,
    getAttribute:key=>attrs[key]??null,
    setAttribute:(key,value)=>{attrs[key]=value;},
    removeAttribute:key=>{delete attrs[key];},
    addEventListener:(event,handler)=>{handlers[event]=handler;}
  };
}
const ok=link('eon-solar',direct,'fve_price_guide_compare');
const broken=link('eon-solar','https://solar-expert.cz/uvodni','not_real');
global.document={readyState:'complete',querySelectorAll:selector=>{
  assert.equal(selector,'[data-se-lead-id]');
  return [ok,broken];
}};
require('../assets/js/lead-cta.js');
assert.equal(ok.attrs.href,direct,'Legitimate direct CTA survives DOM initialization');
assert.equal(ok.attrs.rel,'nofollow noopener');
assert.equal(ok.attrs['aria-disabled'],undefined);
assert.equal(typeof ok.handlers.click,'function');
assert.equal(broken.attrs.href,undefined,'Dead link loses href for keyboard/navigation safety');
assert.equal(broken.attrs['aria-disabled'],'true');
assert.equal(broken.attrs['data-se-lead-unavailable'],'true');
assert.equal(broken.handlers.click,undefined,'No click listener on invalid lead CTA');
window.dataLayer.length=0;
ok.attrs['data-se-placement']='updated_live_placement';
ok.handlers.click();
assert.equal(events().length,1);
assert.equal(events()[0].placement,'updated_live_placement','Keep attribution read at click time');
console.log('PASS: only real E.ON outbound lead click reaches analytics; invalid CTAs disabled and uncounted');
