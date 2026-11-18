import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const article=readFileSync(new URL('../content/rewrites/kolik-stoji-fotovoltaika.html',import.meta.url),'utf8');
const eon='https://www.eon.cz/domacnosti/usporne-technologie/solar/';

test('high-intent visitor sees a prominent safe checklist jump before the price table',()=>{
  const top=article.indexOf('data-se-fve-lead="top"');
  assert(top>0,'Dedicated above-fold price-to-offer handoff is present');
  const firstTable=article.indexOf('<table>');
  assert(top<firstTable,'A visitor must not scroll beyond the price table to find the comparison path');
  const topCallout=article.slice(top,firstTable);
  assert(topCallout.includes('href="#kontrola-domovni-fve"'));
  assert(topCallout.includes('class="se-btn se-btn-primary"'));
  assert(!topCallout.includes('data-se-lead-id='),'Do not promote an external quote before the checklist');
});

test('separately attributed E.ON offer follows the expert checklist before financing details',()=>{
  const checklist=article.indexOf('id="kontrola-domovni-fve"');
  const lead=article.indexOf('data-se-fve-lead="after-checklist"');
  const funding=article.indexOf('<h2>Fotovoltaika a Nová zelená úsporám');
  assert(checklist>0&&lead>checklist&&lead<funding);
  const topCallout=article.slice(lead,funding);
  assert(topCallout.includes('data-se-lead-id="eon-solar"'));
  assert(topCallout.includes('data-se-placement="fve_price_guide_after_checklist"'));
  assert(topCallout.includes('data-se-fallback="'+eon+'"'));
  assert(topCallout.includes('href="'+eon+'"'));
  assert(topCallout.includes('class="se-btn se-btn-primary"'));
  assert(topCallout.includes('partnerský odkaz'));
  assert(topCallout.includes('Nejde o automaticky nejlevnější řešení'));
});

test('existing late-funnel offer remains separately attributable without tracking IDs in HTML',()=>{
  assert.equal((article.match(/data-se-lead-id="eon-solar"/g)||[]).length,2);
  assert.equal((article.match(/data-se-placement="fve_price_guide_compare"/g)||[]).length,1);
  assert.equal((article.match(/data-se-placement="fve_price_guide_after_checklist"/g)||[]).length,1);
  assert(!/https?:\/\/ehub\.cz|a_aid=|a_bid=|desturl=/.test(article),
    'Tracking secrets and affiliate redirect URLs remain outside indexed editorial HTML');
  assert(article.includes('href="/quote-checker/"'),'Preserve existing off-grid distinction');
  assert(article.includes('ČEZ – Battery Box Queen'),'Preserve comparative pricing evidence');
});
