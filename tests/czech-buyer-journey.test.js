'use strict';
// Buyer-facing Czech copy smoke; deliberately does not modify selector ranking,
// verified merchant links or WordPress managed post canonical/slug metadata.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const front=read('front-page.php');
const builder=read('template-parts/solar-builder.php');
const editorial=read('content/pages/solarni-sestava-na-chatu.html');
const links=[
  ['vyber-baterii','Výběr baterie'],
  ['mppt-kalkulacka','Výběr MPPT regulátoru'],
  ['vyber-menice','Výběr měniče'],
  ['quote-checker','Kontrola nabídky pro chatu'],
];
for(const [slug,label] of links){
  assert(front.includes("solar_expert_public_url('"+slug+"')"),'Keep working public tool route for '+slug);
  assert(front.includes('<h3>'+label+'</h3>'),'Explain '+slug+' in Czech on the homepage');
  assert(editorial.includes('href="/'+slug+'/">'),'Keep direct contextual route from Builder guide for '+slug);
}
assert(!/\bDecision tools\b|\bProduct comparison\b|<span class="se-chip">(?:P1|NEW)<\/span>/.test(front+'\n'+builder),
  'Do not expose developer statuses or English section labels to buyers');
assert(!/sizing|compatibility check|snapshoty|technický ranking/.test(builder),
  'Customer-facing purchase caveats should be plain Czech');
assert(builder.includes('affiliate provize'),'Keep the editorial independence disclosure');
assert(builder.includes('Battery.cz a Solar-Import.cz provozuje stejná společnost Efteria'),
  'Preserve source-backed warning about shared legal retailer');
assert(builder.includes('SolarExpertAffiliate.trackOffer(')&&builder.includes('SolarExpertAffiliate.trackBundleDealOffer('),
  'Keep buyer click attribution intact');
assert(front.includes('data-se-home-demo="builder-preview"'),
  'Keep one-click preview CTA intact');
assert(front.includes("do_shortcode('[solar_expert_builder]')"),
  'Keep active tool embedded on homepage');
assert(editorial.includes('[solar_expert_builder]'),'Keep Builder page shortcode');
console.log('PASS: Czech buyer journey copy, tool routes, tracking and retailer disclosure');
