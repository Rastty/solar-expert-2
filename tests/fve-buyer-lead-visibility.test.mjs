import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const article=readFileSync(new URL('../content/rewrites/kolik-stoji-fotovoltaika.html',import.meta.url),'utf8');
const eon='https://www.eon.cz/domacnosti/usporne-technologie/solar/';

test('high-intent grid-FVE visitor sees a disclosed offer CTA before the price table',()=>{
  const top=article.indexOf('data-se-fve-lead="top"');
  assert(top>0,'Dedicated above-fold price-to-offer handoff is present');
  const firstTable=article.indexOf('<table>');
  assert(top<firstTable,'A visitor must not scroll beyond the comparison table to find an offer');
  const topCallout=article.slice(top,firstTable);
  assert(topCallout.includes('data-se-lead-id="eon-solar"'));
  assert(topCallout.includes('data-se-placement="fve_price_guide_top"'));
  assert(topCallout.includes('data-se-fallback="'+eon+'"'));
  assert(topCallout.includes('href="'+eon+'"'));
  assert(topCallout.includes('class="se-btn se-btn-primary"'));
  assert(topCallout.includes('partnerský odkaz'));
  assert(topCallout.includes('Nejde o automaticky nejlevnější řešení'));
});

test('existing late-funnel offer remains separately attributable without tracking IDs in HTML',()=>{
  assert.equal((article.match(/data-se-lead-id="eon-solar"/g)||[]).length,2);
  assert.equal((article.match(/data-se-placement="fve_price_guide_compare"/g)||[]).length,1);
  assert.equal((article.match(/data-se-placement="fve_price_guide_top"/g)||[]).length,1);
  assert(!/https?:\/\/ehub\.cz|a_aid=|a_bid=|desturl=/.test(article),
    'Tracking secrets and affiliate redirect URLs remain outside indexed editorial HTML');
  assert(article.includes('href="/quote-checker/"'),'Preserve existing off-grid distinction');
  assert(article.includes('ČEZ – Battery Box Queen'),'Preserve comparative pricing evidence');
});
