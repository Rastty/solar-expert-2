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
  'https://www.solar-expert.cz/nabidka','http://solar-expert.cz/nabidka',
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
window.SolarExpertConfig.affiliateBases['eon-cz']='https://www.eon.cz/domacnosti/';
const plainBase=A.resolveLead('eon-solar',direct);
assert.equal(plainBase.href,direct,'Plain E.ON homepage base must retain exact direct landing page');
assert.equal(plainBase.monetized,false,'A vendor homepage with fabricated desturl is not an affiliate lead');
window.SolarExpertConfig.affiliateBases['eon-cz']=base;
window.SolarExpertConfig.affiliateMap.leads['eon-solar']='https://ehub.cz/system/scripts/click.php?a_bid=valid-override';
assert.equal(A.resolveLead('eon-solar',direct).href,
  window.SolarExpertConfig.affiliateMap.leads['eon-solar'],
  'Preserve valid owner-approved exact E.ON affiliate mapping');


// E.ON SVJ is a separate commercial buyer route, not any external URL that
// a map happens to label affiliate. All assertions are offline only.
const svj='https://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/';
const svjId='eon-svj';
delete window.SolarExpertConfig.affiliateMap.leads[svjId];
window.SolarExpertConfig.affiliateBases['eon-cz']=base;
const svjGenerated=A.resolveLead(svjId,svj);
assert.equal(svjGenerated.monetized,true,'An approved eHub base can track this exact SVJ destination');
assert.equal(new URL(svjGenerated.href).searchParams.get('desturl'),svj,
  'Merchant deep link must preserve the real apartment-building lead form');
assert.equal(svjGenerated.leadId,svjId);
assert.equal(svjGenerated.merchantId,'eon-cz');

window.SolarExpertConfig.affiliateMap.leads[svjId]=base+'&desturl='+encodeURIComponent(
  'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/');
const svjExact=A.resolveLead(svjId,svj);
assert.equal(svjExact.monetized,true);
assert.equal(new URL(svjExact.href).searchParams.get('desturl'),svj,
  'Stale exact E.ON lead override must not send the buyer to another product');

delete window.SolarExpertConfig.affiliateBases['eon-cz'];
for(const unsafe of [
  '#','https://unrelated.example/click',
  'https://ehub.cz.evil.example/system/scripts/click.php?a_aid=bad&a_bid=bad',
  'https://ehub.cz/system/scripts/click.php?a_bid=missing-publisher',
  'https://ehub.cz/system/scripts/click.php?a_aid=missing-campaign',
  'http://ehub.cz/system/scripts/click.php?a_aid=a&a_bid=b',
  'https://ehub.cz/system/scripts/click.php?a_aid=a&a_bid=b#untrusted',
  'https://www.eon.cz/domacnosti/'
]){
  window.SolarExpertConfig.affiliateMap.leads[svjId]=unsafe;
  const directSvj=A.resolveLead(svjId,svj);
  assert.equal(directSvj.href,svj,'Invalid affiliate mapping must fall back to the exact E.ON SVJ page');
  assert.equal(directSvj.monetized,false,'Invalid mapping may not count as partner-tracked');
}
window.SolarExpertConfig.affiliateMap.leads[svjId]=base;
for(const badTarget of [
  'https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/',
  'https://www.eon.cz.evil.example/domacnosti/usporne-technologie/fotovoltaika-pro-svj/',
  'http://www.eon.cz/domacnosti/usporne-technologie/fotovoltaika-pro-svj/',
  'javascript:alert(1)'
]){
  const blocked=A.resolveLead(svjId,badTarget);
  assert.equal(blocked.href,'#','SVJ lead cannot redirect to an unrelated or insecure target');
  assert.equal(blocked.monetized,false);
  window.dataLayer.length=0;
  A.trackLead(svjId,'svj_payback_body',badTarget);
  assert.equal(events().length,0,'Invalid SVJ lead may not create an analytics click');
}
window.SolarExpertConfig.affiliateMap.leads[svjId]='https://not-ehub.invalid/outbound';
window.dataLayer.length=0;
A.trackLead(svjId,'svj_payback_body',svj);
assert.equal(events().length,1,'Qualified external direct supplier intent is counted once');
assert.equal(events()[0].placement,'svj_payback_body');
assert.equal(events()[0].monetized,false,'Direct supplier click is NOT a paid affiliate lead');
assert.equal(events()[0].hrefType,'source');
console.log('PASS: E.ON SVJ exact merchant destination, eHub-only redirect, no phantom tracked lead');

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
