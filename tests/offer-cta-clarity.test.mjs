import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const specs=[
  ['template-parts/battery-selector.php',1,'battery-selector'],
  ['template-parts/mppt-selector.php',1,'mppt-selector'],
  ['template-parts/inverter-selector.php',1,'inverter-selector'],
  ['template-parts/solar-builder.php',4,'builder-']
];

test('every tracked product offer has a visible, honest action without breaking merchant attribution',()=>{
  for(const [path,wanted,placement] of specs){
    const markup=read(path);
    const productLinks=[...markup.matchAll(/<a class="se-offer"[\s\S]*?<\/a>/g)].map(x=>x[0]);
    assert.equal(productLinks.length,wanted,path+' product anchors must remain one-per-offer');
    for(const link of productLinks){
      assert.match(link,/:href="o.href"/,path+' product URL must remain the original affiliate resolver');
      assert.match(link,/:data-se-product-id="[^"]+"/,path+' product exposure/click identity retained');
      assert.match(link,/:data-se-merchant="o.merchantId"/,path+' merchant dimension retained');
      assert.match(link,/:data-se-placement="[^"]+"/,path+' placement retained');
      assert.match(link,/@click="SolarExpertAffiliate\.trackOffer\(/,path+' original click event retained');
      assert.match(link,/:rel="o.monetized \? 'sponsored nofollow noopener' : 'nofollow noopener'"/,
        path+' paid links still disclose sponsored rel');
      assert.equal((link.match(/class="se-offer-cta"/g)||[]).length,1,
        path+' every offer needs exactly one visible action on the SAME anchor');
      assert.match(link,/o\.price_czk \? 'Zobrazit nabídku ↗' : 'Ověřit cenu u prodejce ↗'/,
        path+' missing/stale price must not suggest a verified current amount');
      assert(!/<a\b[^>]*>[\s\S]*?<a\b/.test(link),path+' no nested/untracked action anchors');
    }
    // Explicit action must belong to each offer, not a global page footer.
    assert.equal((markup.match(/class="se-offer-cta"/g)||[]).length,wanted,path);
    assert(markup.includes(placement),'Placement regression '+path);
  }
});

test('mobile and keyboard styles make merchant offer CTA discoverable without extra clicks',()=>{
  const css=read('style.css');
  assert(css.includes('.se-offer-cta{display:inline-flex'),'Offer actions must have visible style');
  assert(css.includes('.se-offer:focus-visible'),'Keyboard focus must be obvious');
  assert(css.includes('min-height:44px'),'Offer tap target must be usable');
  assert(css.includes('.se-bundle .se-offer-links{flex-direction:column'),'Mobile offer links remain individually tappable');
});

test('backend click/exposure signals remain tied to real offer-click, not cosmetic CTA rendering',()=>{
  const script=read('assets/js/analytics.js');
  const adapter=read('assets/js/affiliate-adapter.js');
  assert(script.includes("window.SolarExpertAnalytics.track('offer_exposure',detail)"));
  assert(adapter.includes("window.dataLayer.push({event:'affiliate_click', ...detail})"));
  for(const [path] of specs){
    assert(!read(path).includes('trackOffer('+"null"+')'),'Never record fake clicks');
  }
});
