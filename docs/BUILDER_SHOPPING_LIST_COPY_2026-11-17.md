# Builder — přenosný nákupní seznam (2026-11-17)

## Intent and change

The Builder now offers **"Zkopírovat nákupní seznam i odkazy"** immediately
below its first priced component bill. It exports one plain-text list containing
the exact recommended quantity of each separately ordered component (including
any extra battery beyond a bundle deal), its observed source-backed unit price,
row subtotal, named retailer, actionable merchant destination, and a reconciled
grand total. A mobile user can save or forward the list without going back
through every tier card. It explicitly says this is not a shared cart and that
retailer stock, quantity and final price must be checked again before checkout.

## Truthfulness and safety contracts

- **Only** enable copying if the existing `primaryShoppingList` is quoted and
  every line has an exact verified `primaryPurchaseRows` merchant destination.
  Missing, mismatched, expired, inaccessible or wrong-store destinations make
  the copy CTA disappear; no incomplete order can be exported.
- Use current `SolarExpertAffiliate` URL resolution; keep configured affiliate
  bases/deeplinks or direct source URLs. Do not hardcode affiliate credentials,
  trigger a tracking visit or claim a commission simply because text was copied.
- Copy a plain-text list, not an HTML/cart/order. No personal data, server
  persistence, new analytics event, pricing arithmetic or technical rank change.
- Clipboard permission may be unavailable; expose a selectable text area for
  manual copying. The selector/button are accessible by keyboard.
- Builder's existing engineering and price freshness gates, safety disclaimers
  and deployment rollback gate **#148** remain unchanged.

## Verification

`node tests/builder-shopping-list-copy.test.js` exercises multi-unit panel
counts, exact retail destinations, computed grand total, real clipboard success,
clipboard permission rejection, partial-link fail-closed, resets, stale
catalog expiration, and no synthetic click events. Pre-existing Builder
tests and WordPress validation should still pass in PR CI.

## Measurement after safe production release

Compare 7/28-day first-party `solar_builder_complete`, offer exposures and
actual `affiliate_click` events before/after release, segmented by placement.
Text-copy itself is deliberately **not** measured as a click or a sale.
Approved/paid merchant commissions remain the economic outcome to monitor
in Prometheus Core. Do not claim an uplift from this pre-production change.
