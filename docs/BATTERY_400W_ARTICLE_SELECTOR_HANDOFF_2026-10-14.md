# Buyer handoff: 400Wp battery article → Battery Selector (2026-10-14)

## User problem

Article `/jakou-baterii-k-solarnimu-panelu-400w/` gives a transparent worked model, but formerly linked to Battery Selector with **unrelated 1.5kWh/day and 1,200W defaults**. Users have to re-enter the article's example and may abandon before product offers.

## Implementation

- Replace one top CTA URL only (no old indexed guide text rewrite): `/vyber-baterii/?scenario=panel400`.
- Battery Selector recognizes exactly one finite, allowlisted URL token: `panel400`. It applies **24V, 0.7kWh/day, one day autonomy, 800W AC continuous** to editable form fields *before the catalog asynchronously loads*. The existing ordinary no-query defaults are preserved. Arbitrary `voltage`, `inverterW`, `merchant` etc URL parameters are **ignored**; affiliate URLs and product ranking remain untouched.
- Existing shared calculation and BMS safety (80% nominal usable, 90% inverter efficiency) remain active: minimum 1.0kWh nominal, 889W DC, approx 38A at nominal 24V. Verified catalog and fit checks still decide the actual product, not the URL.
- Show a non-misleading banner about illustration and idle loads. Also provide a user-clickable `panel400` preset alongside the existing cottage and backup examples.
- Importing a scenario via article navigation does **not** call `run(true)`, `selector_engaged`, or `affiliate_click` — the previous `tool_referral_click` remains on the actual article-to-selector click, and the first subsequent real example click/change triggers one genuine engagement. Existing tool view/exposure metrics remain untouched.
- CI asserts real loaded matching, battery model & BMS fit, ignored hostile URL fields, no synthetic clicks, existing defaults and once-only actual engagement.
- Deploy smoke verifies public article link, rendered selector example, and actual updated same-origin JS.

## Validation / follow-up

Compare `tool_referral_click` → genuine `selector_engaged` and real `offer_exposure` → `affiliate_click` after sufficient organic traffic (7/14/28 days). No claim of uplift until observed. To roll back, restore the original top article link and remove the strictly scoped URL prefill and preset; no WordPress database manual edit is needed beyond normal managed content sync. This preserves the public URL, canonical, existing SEO page discovery, indexability and affiliate tracking.
