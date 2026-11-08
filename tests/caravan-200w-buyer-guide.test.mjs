import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const slug='solarni-panel-na-karavan-200w';
const file='content/rewrites/'+slug+'.html';
const article=read(file);
const manifest=JSON.parse(read('content/manifest.json'));
const core=read('inc/core.php');

test('one canonical, intentionally publish-ready caravan buyer guide',()=>{
 const entries=manifest.items.filter(i=>i.slug===slug);
 assert.equal(entries.length,1,'No duplicate managed slug');
 const m=entries[0];
 assert.equal(m.type,'post');
 assert.equal(m.file,file);
 assert.equal(m.status,'publish');
 assert.equal(m.status_if_new,'publish');
 assert.equal(m.publish_ready,true);
 assert.equal(m.indexable,true);
 assert.equal(m.create_if_missing,true);
 assert.equal(m.category_slug,'solarni-panely');
 assert(article.length>9000,'Require useful technically comprehensive source, not a thin affiliate post');
 assert(article.includes('<h2>')&&article.includes('<h3>')&&article.includes('<table>'),
   'Detailed article includes measurements, shopping criteria and FAQs');
 assert(core.includes("'"+slug+"' => array("),'Yoast title and description must be Git-managed');
});

test('physical 190Wp example cannot be passed off as arbitrary 200Wp panel',()=>{
 for(const fact of ['SPM041903903','190 Wp','21,8 V','25,5 V','9,17 A','1485 × 668 × 30 mm']){
   assert(article.includes(fact),'Missing exact model evidence: '+fact);
 }
 assert(article.includes('Jiný panel 200 Wp může mít zcela jiné'));
 for(const key of ['Voc','Vmp','Isc','BMS','sériovém','paralelním']){
   assert(article.includes(key),'Technical safety discussion missing '+key);
 }
 for(const source of ['victronenergy.com/media/pg','autobattery.cz/solarni-panel','joint-research-centre.ec.europa.eu/pvgis-online-tool']){
   assert(article.includes(source),'Primary evidence missing '+source);
 }
});

test('a published adjacent 400Wp battery guide discovers the smaller caravan use case',()=>{
 const source=read('content/rewrites/jakou-baterii-k-solarnimu-panelu-400w.html');
 assert(source.includes('href="/solarni-panel-na-karavan-200w/"'),
   'Crawlable internal link from existing 400Wp buying guide to noncannibalizing 200Wp caravan guide');
 assert(source.includes('Nesrovnávejte jej přímo s 400Wp sestavou'),
   'The 190Wp-200Wp caravan topic must not be confused with a 400Wp 12V/24V battery sizing article');
});

test('published solar kit guide adds one relevant 12V caravan buyer bridge',()=>{
 const kits=read('content/rewrites/sady-pro-solarni-napajeni-kompletni-pruvodce.html');
 assert.equal(kits.split('href="/solarni-panel-na-karavan-200w/"').length-1,1,
   'Only one related 12V caravan link in established solar kit buyer context');
 assert(kits.includes('Pro malou 12V sestavu na cestách'),
   'Link must appear at genuine system-voltage comparison, not an unrelated global footer');
 assert(kits.includes('Nejde o automaticky ověřenou univerzální sadu'),
   'A linked caravan shopping guide must not imply hardware certification');
});

test('published 400Wp MPPT guide does not claim unshipped Isc checks',()=>{
 const article=read('content/rewrites/jak-vybrat-mppt-regulator-pro-400w-panel.html');
 assert(article.includes('současná veřejná kalkulačka zatím automaticky neověřuje Isc panelů ani počet paralelních stringů'),
   'Live MPPT tool lacks this feature until guarded technical PR #150 releases');
 assert(article.includes('maximální vstupní Isc regulátoru ověřte samostatně před nákupem'),
   'Explain how buyer must verify PV Isc without risking unverified equipment');
 assert(!article.includes('zkontroluje základní proudové a napěťové podmínky'),
   'Ambiguous current wording can imply false PV Isc verification and unsafe purchase');
 assert(article.includes('včetně nezávislého VSelektro'),
   'Do not remove valid verified independent retailer discovery when clarifying safety');
});

test('model calculations and limits are transparent, not claimed as observed output',()=>{
 for(const part of ['0,20 kWp × 3,5 h × 0,75 = 0,525 kWh','525 Wh','338 Wh','12,8 V','640 Wh','1 280 Wh','461 Wh','922 Wh','25,5 × 1,12 = 28,56 V','Isc 9,17 A']){
   assert(article.includes(part),'Model math or safety note missing: '+part);
 }
 for(const caution of ['modelové','ilustrační','nízkých teplotách','nejnižší teplotu','montáží']){
   assert(article.includes(caution),'Risk disclosure missing '+caution);
 }
});

test('buyer traffic routes to real existing tools without unsourced deals or fake Isc checks',()=>{
 for(const route of ['/vyber-baterii/','/mppt-kalkulacka/','/vyber-menice/','/solarni-sestava-na-chatu-pro-lednici/','/jak-vybrat-mppt-regulator-pro-400w-panel/','/jak-doporucujeme/','/affiliate-transparentnost/']){
   assert(article.includes('href="'+route+'"'),'Missing contextual owned buyer link '+route);
 }
 assert(article.includes('Současná veřejná verze kalkulačky kontroluje výkon FV pole, Voc a Vmp'),
   'Do not advertise Isc automation before its independently reviewed theme release is deployed');
 assert(article.includes('samostatně ověřit Isc a počet paralelních stringů'),
   'Current physical safety check must not disappear while MPPT PR #150 is waiting');
 assert(!/https?:\/\/ehub\.cz|desturl=|a_aid=|affiliate-url/.test(article),
   'Never leak private merchant affiliate IDs or hardcode a tracking click in editorial source');
 assert(!/garantujeme výnos|zaručená soběstačnost|nejlevnější sestava/i.test(article));
});

test('live 850Wh fridge article hands users into the actual 3-step Builder, without fake 1-click prefill',()=>{
 const page=read('content/rewrites/solarni-sestava-na-chatu-pro-lednici.html');
 const form=read('template-parts/solar-builder.php');
 assert.equal(page.split('data-se-fridge-manual-builder-guide="850wh"').length-1,1,
   'One exact manual setup handoff at the illustrated fridge calculation');
 assert(page.includes('Hodnotu 850 Wh nyní nelze vložit přímo jako jeden vstup'),
   'Do not imply an unavailable direct 850Wh/day input or as-yet unreleased article prefill');
 assert(page.includes('Příkony spotřebičů má současný nástroj přednastavené'),
   'Users must understand the published appliance wattage is not currently editable');
 assert(page.includes('hodiny provozu za den a počet kusů'),
   'Only actual editable live Builder controls are advertised');
 assert(page.includes('href="/solarni-sestava-na-chatu/"'),
   'Users have a crawlable, useful action to open the Builder');
 assert(form.includes('x-model.number="a.hours"')&&form.includes('x-model.number="a.qty"'),
   'Builder really does permit changing runtime and appliance counts');
 assert(!form.includes('x-model.number="a.watts"'),
   'Test must be revisited if a future theme release makes wattage editable');
 assert(page.includes('Ve 3. kroku vyberte <strong>sezónu a rezervu baterie</strong>'),
   'Guide must explain what to select before seeing a product recommendation');
});

test('series-parallel solar panel wiring guide routes a safe 12V buyer toward relevant tools',()=>{
 const page=read('content/rewrites/jak-zapojit-solarni-panely.html');
 assert.equal(page.split('data-se-wiring-mppt-buyer-handoff="20261108"').length-1,1,
   'Exactly one contextual buyer handoff in existing wiring guide');
 assert(page.includes('průvodce 200W panelem na karavan, baterií a MPPT')&&
   page.includes('href="/solarni-panel-na-karavan-200w/"'),
   'Existing electrical wiring page must discover published 12V caravan buying guide');
 assert(page.includes('Předběžně ověřit Voc/Vmp a výkon v MPPT kalkulačce'),
   'CTA should explain the scope of CURRENT calculator, not imply certified wiring');
 assert(page.includes('Současná veřejná verze kalkulačky ještě automaticky nekontroluje celkový Isc paralelních stringů'),
   'Do not promise yet-unreleased Isc check from PR #150');
 assert(page.includes('Součet Isc jednotlivých paralelních větví'),
   'Safety caveat must explain why multiple parallel branches require independent Isc proof');
 assert(!page.includes('Ověřit 12V string v MPPT kalkulačce →'),
   'Do not retain ambiguous stronger original CTA in edited section');
});
