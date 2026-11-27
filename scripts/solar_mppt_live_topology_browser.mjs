import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const SITE='https://solar-expert.cz';
const live=process.env.SOLAR_MPPT_LIVE_TOPOLOGY_PROOF==='live';
const report={mode:live?'live_no_injection':'preview_injected',status:'not_verified',analytics_posts_delivered:0,external_visits:0,wordpress_writes:0};
let browser;
try{
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:375,height:812}});
 let catalogGets=0;
 await ctx.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());if(q.method()==='GET'&&(u.origin===SITE||(u.hostname==='cdn.jsdelivr.net'&&u.pathname==='/npm/alpinejs@3.14.9/dist/cdn.min.js'))){if(u.origin===SITE&&u.pathname==='/wp-json/solar-quote-overlay/v2/catalog')catalogGets++;return r.continue();}return r.abort('blockedbyclient');});
 const p=await ctx.newPage();const root='[data-se-mppt-topology="v1"]';
 if(!live)await p.addInitScript({content:readFileSync('assets/js/mppt-live-topology.js','utf8')});
 const errors=[];p.on('pageerror',e=>errors.push(String(e.message)));
 assert.equal((await p.goto(SITE+'/mppt-kalkulacka/',{waitUntil:'domcontentloaded'})).status(),200);
 await p.waitForFunction(root=>{const e=document.querySelector(root),s=e&&window.Alpine?.$data(e);return s&&!s.catalogLoading&&!s.catalogError&&s.catalog?.length>0;},root,{timeout:35000});
 const state=()=>p.evaluate(root=>{const x=window.Alpine.$data(document.querySelector(root));return {voltage:x.voltage,panelWp:x.panelWp,series:x.seriesCount,parallel:x.parallelCount,isc:x.arrayIsc,coldVoc:x.coldStringVoc,valid:x.inputValid,ids:x.matches.map(r=>r.product.id),catalog:x.catalog.length};},root);
 const choose=async kind=>{await p.locator(root+' button').filter({hasText:kind}).click();await p.waitForTimeout(300);return state();};
 const small=await choose('1 panel 400 W');assert.equal(small.panelWp,400);assert.equal(small.isc,11);assert.ok(small.ids.includes('mppt-victron-100-20'),'400Wp at 24V must include manufacturer-rated 100/20');
 report.small=small;
 const pair=await choose('2 × 400 Wp');assert.equal(pair.panelWp,800);assert.equal(pair.isc,22);assert.ok(!pair.ids.includes('mppt-victron-100-20'));assert.ok(pair.ids.includes('mppt-victron-100-30'));
 report.pair=pair;
 const large=await choose('8 × 400 Wp');assert.equal(large.panelWp,3200);assert.equal(large.isc,44);assert.ok(large.ids.includes('mppt-victron-150-70'));assert.ok(large.ids.includes('mppt-victron-250-100'));
 report.large=large;
 const links=await p.locator(root+' a[data-se-placement="mppt-selector"]').evaluateAll(es=>es.map(e=>({href:e.href,rel:e.rel,product:e.dataset.seProductId})));
 assert.ok(links.some(l=>{const u=new URL(l.href);return u.hostname==='ehub.cz'&&u.pathname==='/system/scripts/click.php'&&u.searchParams.get('a_aid')&&u.searchParams.get('a_bid')&&u.searchParams.get('desturl')&&l.rel.includes('sponsored');}),'existing monetized offer route');
 report.affiliate_routes_preserved=true;
 // Real editable UI, not direct state mutation. Derived topology recalculates both power and current.
 await p.locator('#se-mppt-parallel-count').fill('5');await p.waitForFunction(root=>{const s=window.Alpine.$data(document.querySelector(root));return s.panelWp===4000&&s.arrayIsc===55&&!s.matches.some(x=>x.product.id==='mppt-victron-150-70');},root);
 const larger=await state();assert.ok(larger.ids.includes('mppt-victron-250-100'));report.parallel_change=larger;
 await p.locator('#se-mppt-panel-isc').fill('30');await p.waitForFunction(root=>{const s=window.Alpine.$data(document.querySelector(root));return s.arrayIsc===150&&s.matches.length===0;},root);assert.equal(await p.locator(root+' a[data-se-placement="mppt-selector"]').count(),0);report.overcurrent_blocked=true;
 await choose('8 × 400 Wp');await p.locator('#se-mppt-panel-voc').fill('150');await p.waitForFunction(root=>{const s=window.Alpine.$data(document.querySelector(root));return s.coldStringVoc>300&&s.matches.length===0;},root);report.overvoltage_blocked=true;
 await choose('8 × 400 Wp');await p.locator('#se-mppt-panel-isc').fill('');await p.waitForFunction(root=>{const s=window.Alpine.$data(document.querySelector(root));return !s.inputValid&&s.matches.length===0;},root);report.missing_isc_blocked=true;
 await choose('8 × 400 Wp');
 // Unknown or changed audited manufacturer limit must never pass.
 await p.evaluate(root=>{const s=window.Alpine.$data(document.querySelector(root));s.catalog=s.catalog.map(x=>x.type==='mppt'?{...x,max_pv_isc_a:999}:x);s.run(false);},root);
 assert.equal((await state()).ids.length,0);report.unknown_limit_blocked=true;
 assert.equal(catalogGets,1,'no duplicate catalog init');report.catalog_gets=catalogGets;
 assert.equal(errors.length,0);
 await p.goto(SITE+'/vyber-menice/',{waitUntil:'domcontentloaded'});assert.equal(await p.locator(root).count(),0);
 report.status='browser_verified';await ctx.close();
}catch(e){report.failure=String(e.message).split('\n')[0].slice(0,200);}
finally{if(browser)await browser.close();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/solar-mppt-live-topology-browser.json',JSON.stringify(report,null,2));console.log('SOLAR_MPPT_TOPOLOGY_BROWSER '+JSON.stringify(report));}
if(report.status!=='browser_verified')process.exitCode=1;
