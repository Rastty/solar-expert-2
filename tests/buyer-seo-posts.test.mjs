import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const manifest=JSON.parse(read('content/manifest.json'));
const core=read('inc/core.php');
const home=read('front-page.php');
const specs=[
  {slug:'jak-vybrat-mppt-regulator-pro-400w-panel',path:'content/rewrites/jak-vybrat-mppt-regulator-pro-400w-panel.html',
    primary:'MPPT',requirements:['SmartSolar MPPT 100/20','SmartSolar MPPT 100/30','SmartSolar MPPT 100/50','290 Wp','440 Wp','700 Wp','Voc','Vmp','Isc'],
    conversion:['/mppt-kalkulacka/','/kolik-panelu-je-potreba-na-jeden-string/','/jak-zapojit-solarni-panely/'],
    evidence:['victronenergy.com']},
  {slug:'solarni-sestava-na-chatu-pro-lednici',path:'content/rewrites/solarni-sestava-na-chatu-pro-lednici.html',
    primary:'lednic',requirements:['230 V','850 Wh','0,65 kWh','24 V','2,4 kWh','1,73 kWh','PVGIS','měnič','rozběh'],
    conversion:['/solarni-sestava-na-chatu/','/vyber-baterii/','/vyber-menice/','/mppt-kalkulacka/','/jak-vybrat-mppt-regulator-pro-400w-panel/'],
    evidence:['joint-research-centre.ec.europa.eu','victronenergy.com']}
];
for(const spec of specs){
  test('evidence-backed buyer intent and published discovery: '+spec.slug,()=>{
    const item=manifest.items.find(x=>x.slug===spec.slug&&x.type==='post');
    assert(item,'Must exist in source-of-truth manifest');
    assert.equal(item.file,spec.path);
    assert.equal(item.status,'publish');
    assert.equal(item.status_if_new,'publish');
    assert.equal(item.publish_ready,true);
    assert.equal(item.indexable,true);
    assert.equal(item.category_slug,'solarni-panely');
    assert.equal(item.create_if_missing,true);
    const html=read(spec.path);
    assert(html.length>3300,'Do not publish thin keyword pages');
    assert(html.includes('<h2>')&&html.includes('<h3>')&&html.includes('<table>'),'Real structured buyer guidance with checks and FAQs');
    assert(html.includes('class="se-btn se-btn-primary"'),'Offer a primary owned conversion CTA');
    assert(!/https?:\/\/ehub\.cz|desturl=|affiliate-url|a_aid=/.test(html),'No public tracking URLs in indexed articles');
    for(const required of spec.requirements)assert(html.includes(required),spec.slug+' missing technical claim '+required);
    for(const route of spec.conversion)assert(html.includes('href="'+route+'"'),spec.slug+' must link directly to owned URL '+route);
    for(const domain of spec.evidence)assert(html.includes(domain),'Missing source link '+domain);
    assert(home.includes("home_url('/"+spec.slug+"/')"),'Indexed homepage must link directly to new buyer guide');
    assert(core.includes("'"+spec.slug+"' => array("),'Yoast title + meta should be defined by slug');
    const part=core.slice(core.indexOf("'"+spec.slug+"' => array("),core.indexOf("'"+spec.slug+"' => array(")+480);
    assert(part.includes("'title' =>")&&part.includes("'description' =>"),'Both SEO title and meta description required');
    assert(!html.includes('Nejlepší regulátor pro každého')&&!html.includes('garantujeme'),'No fabricated universal ranking claims');
  });
}
test('two exact buyer topics stay noncannibalizing and preserve existing GSC owners',()=>{
  assert(specs[0].slug!==specs[1].slug);
  assert(manifest.items.some(x=>x.slug==='kolik-panelu-je-potreba-na-jeden-string'&&x.preserve_status===true));
  assert(manifest.items.some(x=>x.slug==='sady-pro-solarni-napajeni-kompletni-pruvodce'&&x.preserve_status===true));
  assert(home.includes('data-se-home-offgrid-buying="guides"'));
  assert(!read(specs[0].path).includes('href="/quote-checker/"'),'MPPT product SKU guide should avoid unrelated offers');
});
