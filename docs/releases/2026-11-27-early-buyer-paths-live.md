# Production release: three early buyer-path blocks — 2026-11-27

**Status: LIVE / publicly rendered verified.** This is a source/rollback record of direct, server-side, authenticated WordPress `/wpvibe/v1/content/edit` one-match edits. It is not a request to replay a write and not a GitHub Actions publisher activation. No native theme, catalog, product selector or affiliate destination was modified.

## 1) WordPress #1592 — `/kolik-stoji-fotovoltaika/`
Original exact match anchor: `</div>\n\n<h2>Aktuální příklady cen fotovoltaiky</h2>`. One inserted block between the existing opening CEZ price benchmark and heading:

```html
<div class="se-note" data-se-growth="fve-price-intro-v1"><strong>Zajímá vás skutečná cena FVE pro váš dům?</strong> Ceník výše je jen srovnávací příklad. Pro rozhodnutí si nechte nacenit stejný výkon panelů, kapacitu baterie, montáž i případnou zálohu od dalšího dodavatele.
<p><a class="se-btn se-btn-primary" href="https://www.eon.cz/domacnosti/usporne-technologie/solar/" data-se-lead-id="eon-solar" data-se-placement="fve_price_guide_intro" data-se-fallback="https://www.eon.cz/domacnosti/usporne-technologie/solar/" rel="sponsored nofollow noopener">Nezávazně získat nabídku E.ON →</a></p><small>Partnerský odkaz: pokud odesláním formuláře splníte podmínky programu, web může získat provizi. Cena ani úspora nejsou garantovány; srovnejte alespoň dvě nabídky.</small></div>
```

## 2) WordPress #1614 — `/fotovoltaika-a-elektrokotel/`
Original exact match anchor: `</div>\n\n<nav class="se-note" aria-label="Obsah průvodce">`. One inserted block after the original quick conclusion, before the table of contents:

```html
<div class="se-note" data-se-growth="electroboiler-fve-choice-v1"><strong>Máte elektrokotel a zvažujete investici?</strong> Nechte si porovnat návrh fotovoltaiky pro vaši skutečnou spotřebu a odděleně si spočítejte, zda se nevyplatí změnit vytápění. Fotovoltaika sama negarantuje zimní provoz kotle.
<p><a class="se-btn se-btn-primary" href="https://www.eon.cz/domacnosti/usporne-technologie/solar/" data-se-lead-id="eon-solar" data-se-placement="electroboiler_intro" data-se-fallback="https://www.eon.cz/domacnosti/usporne-technologie/solar/" rel="sponsored nofollow noopener">Poptat FVE pro svůj dům →</a> <a class="se-btn" href="/tepelne-cerpadlo-nebo-elektrokotel/">Porovnat s tepelným čerpadlem →</a></p><small>Odkaz na E.ON je partnerský a může webu přinést provizi; vyžádejte si srovnatelné nabídky. Výpočty článku jsou modelové, nikoli nabídka ani zaručená úspora.</small></div>
```

## 3) WordPress #1175 — `/kolik-vyrobi-fotovoltaika-za-rok/`
Original exact match anchor: `<h2>Nejdůležitější vztah</h2>`. Added one buyer-choice block directly before the heading:

```html
<div class="se-note" data-se-growth="yield-annual-choice-v1"><strong>Počítáte výrobu kvůli nákupu FVE?</strong> U domovní elektrárny potřebujete kromě ročních kWh i cenu, baterii, montáž a způsob využití přebytků. U chaty nebo ostrova rozhoduje zejména denní spotřeba a zimní výroba.
<p><a class="se-btn se-btn-primary" href="/kolik-stoji-fotovoltaika/">Porovnat cenu domovní FVE →</a> <a class="se-btn" href="/solarni-sestava-na-chatu/">Navrhnout ostrovní sestavu →</a></p><small>Oba odkazy vedou na průvodce Solar Expertu; nejde o slib návratnosti ani potvrzení vhodnosti konkrétní instalace.</small></div>
```

## Execution evidence
- WordPress server patch results: all three `status: edited`, `replaced: 1`.
- Independent rendered production HTML readback: exact marker on each URL, CTA before first H2, original content and canonical retained, no `noindex`. Price page kept its existing lower `fve_price_guide_compare` offer.
- E.ON HTTPS destination and `eon-solar` lead identity reused from existing live price guide; no commission eligibility, real lead, click uplift or revenue asserted.
- Measurement: compare genuine Core event counts for `fve_price_guide_intro` and `electroboiler_intro`, actual 28d GSC and approved commission evidence later; never create synthetic clicks.

## Exact rollback
After verifying no other WP editor changed the respective post, remove **only** the exact `<div class="se-note" data-se-growth="...">...</div>` block above using a one-match server content/edit replacement and separately check public HTML. Do not blanket-overwrite whole posts. Keep all existing lower CTAs, editorial text and third-party snippets intact. Do not replay these changes when reading this record.
