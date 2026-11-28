import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const report={status:'not_verified',mode:'live_no_injection',analytics_posts_delivered:0,external_visits:0,pages:[]};
mkdirSync('artifacts',{recursive:true});
let browser;
try{
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
 await ctx.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js')))return r.continue();return r.abort('blockedbyclient');});
 for(const [kind,path,field] of [['battery','/vyber-baterii/','#se-battery-daily-kwh'],['inverter','/vyber-menice/','#se-inverter-continuous'],['mppt','/mppt-kalkulacka/','#se-mppt-panel-voc']]){
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e.message)));
  assert.equal((await p.goto(SITE+path,{waitUntil:'domcontentloaded'})).status(),200);
  const root='[data-se-selector-ux-v1="'+kind+'"]';
  await p.waitForFunction(root=>{const e=document.querySelector(root),s=e&&window.Alpine?.$data(e);return e&&s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0;},root,{timeout:35000});
  const summary=p.locator(root+' .se-sux-summary');const state=await summary.getAttribute('data-state');
  assert.ok(['ready','empty'].includes(state));
  assert.equal(await p.locator(root+' .se-sux-nav a').count(),3);
  assert.ok(await p.locator(root+' .se-sux-metric').count()>=2);
  assert.ok((await p.locator(field).getAttribute('aria-describedby'))?.includes('ux-help'));
  const checkLayout=()=>p.evaluate(root=>{const r=document.querySelector(root),b=r.getBoundingClientRect();const form=r.querySelector('.se-formgrid');return {pageOverflow:document.documentElement.scrollWidth>innerWidth+2,rootOverflow:r.scrollWidth>r.clientWidth+2,formOverflow:form.scrollWidth>form.clientWidth+2,rootWidth:b.width,fields:[...form.querySelectorAll('input,select')].every(e=>e.getBoundingClientRect().height>=44)};},root);
  const guide=p.locator(root+' [data-se-contextual-guide="1"]');
  if(kind==='inverter'){await p.locator('#se-inverter-peak').fill('4000');await p.locator('#se-inverter-peak').blur();}
  const cases=kind==='mppt'?[{values:{panelUnitWp:400,seriesCount:1,parallelCount:1,voltage:24},href:'/jak-vybrat-mppt-regulator-pro-400w-panel/#se-mppt-offer-title'},{values:{panelUnitWp:400,seriesCount:2,parallelCount:1,voltage:24},href:'/jakou-baterii-a-mppt-k-solarnim-panelum-800w/#se-800wp-offer-title'}]:[{values:{[kind==='battery'?'inverterW':'continuousW']:2000,voltage:24},href:'/jakou-baterii-k-menici-2000w/#se-battery2000-buying-title'},{values:{[kind==='battery'?'inverterW':'continuousW']:3000,voltage:48},href:'/jakou-baterii-k-menici-3000w/#se-battery3000-offers-title'}];
  // Actual input bindings; do not inject state or change the matcher.
  const ids={voltage:kind==='mppt'?'#se-mppt-voltage':kind==='battery'?'#se-battery-voltage':'#se-inverter-voltage',inverterW:'#se-battery-inverter-w',continuousW:'#se-inverter-continuous',panelUnitWp:'#se-mppt-panel-wp',seriesCount:'#se-mppt-series-count',parallelCount:'#se-mppt-parallel-count'};
  for(const test of cases){
    for(const [k,v] of Object.entries(test.values)){
      let input=p.locator(ids[k]);
      if(await input.count()!==1)input=p.locator(root+' [x-model\\.number="'+k+'"],'+root+' [x-model="'+k+'"]');
      assert.equal(await input.count(),1,'Input '+kind+' '+k);
      if(await input.evaluate(e=>e.tagName==='SELECT'))await input.selectOption(String(v));else await input.fill(String(v));
      await input.blur();
    }
    await p.waitForFunction(({root,href})=>{const g=document.querySelector(root+' [data-se-contextual-guide="1"]');return g&&!g.hidden&&g.querySelector('a').getAttribute('href')===href;},{root,href:test.href});
    assert.ok(await guide.isVisible());
  }
  const mobile=await checkLayout();assert.ok(!mobile.rootOverflow&&!mobile.formOverflow&&mobile.fields,JSON.stringify(mobile));
  await p.locator(root+' .se-sux-next').click();assert.equal(await p.evaluate(()=>document.activeElement?.id),'se-sux-'+kind+'-results');
  await p.locator(field).fill('0');await p.waitForFunction(root=>document.querySelector(root+' .se-sux-summary')?.dataset.state==='invalid',root);
  assert.equal(await p.locator(root+' .se-sux-metric strong').first().textContent(),'—');
  assert.equal(await p.locator(root+' .se-bundles').isVisible(),false);
  assert.equal(await guide.isVisible(),false);
  console.log('SEUX_PAGE_OK',kind,JSON.stringify(mobile));
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForFunction(root=>{const e=document.querySelector(root),s=e&&window.Alpine?.$data(e);return e&&s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0;},root,{timeout:35000});
  await p.locator(root+' .se-sux-summary').screenshot({path:'artifacts/selector-ux-'+kind+'.png'});
  await p.setViewportSize({width:1280,height:900});const desktop=await checkLayout();assert.ok(!desktop.rootOverflow&&!desktop.formOverflow&&desktop.fields,JSON.stringify(desktop));
  assert.equal(errors.length,0,errors.join('; '));
  report.pages.push({kind,state,mobile,desktop,invalid_input_visible:true,keyboard_focus_verified:true});
  await p.close();
 }
 report.status='browser_verified';console.log('SOLAR_SELECTOR_UX_GUIDES_BROWSER '+JSON.stringify(report));
}finally{writeFileSync('artifacts/solar-selector-ux-browser.json',JSON.stringify(report,null,2));if(browser)await browser.close();}
