# Solar Expert — Pylontech US5000 stock correction, 2026-11-20 UTC

## Decision

The exact Pylontech US5000 (`battery-pylontech-us5000`, SKU E8221) retailer pages
now mark availability **Na dotaz**, while the 2026-11-07 source catalog said
`in_stock` for both shops. On 2026-11-20, direct, read-only GETs to both
merchant-owned pages returned HTTP 200, the correct US5000 model/SKU, a
VAT-inclusive price of **22 900 Kč** and `schema.org/OutOfStock`; the visible
merchant label is **Na dotaz**. These are two storefronts of one operator,
not two independent suppliers.

| Verified retailer page | Price incl. VAT | Visible stock | Source code |
| --- | ---: | --- | --- |
| [Battery.cz US5000](https://www.battery.cz/pylontech-us5000-lithiova-baterie-48v-4-8kwh/) | 22 900 Kč | Na dotaz | `OutOfStock` |
| [Solar-Import.cz US5000](https://www.solar-import.cz/baterie/pylontech-us5000-lithiova-baterie-48v-4-8kwh/) | 22 900 Kč | Na dotaz | `OutOfStock` |

Both exact offers and the product-level primary mirror now use
`availability=on_request`, with `verified_at=2026-11-20` for these *two*
actually rechecked offers only. The product's recommendation tier is
`reference`, matching the existing fail-closed treatment of unavailable
GOOWEI and SEPLOS models. No price changed. The whole-catalog `verifiedAt`
remains unchanged. No third-party or affiliate tracking redirect was called.

## Validation and release state

`tests/catalog-pylontech-stock-20261120.test.mjs` verifies source, stock,
pricing, non-stocked ranking suppression and 48 V alternative eligibility.
Historical November 7 audit assertions now explicitly allow newer replacement
receipts for these two offers while preserving the old cohort's other rows.

This change is **repository data only** until an actual guarded release.
It is not evidence of a WordPress update, fresh live prices or commissions.
The current theme release blocker is [#148](https://github.com/Rastty/solar-expert-2/issues/148);
do not bypass the separate restore and content-preservation gates.

Additional read-only checks of eight Battery.cz/Solar-Import.cz offers
(SEPLOS PUSUNG-S, GOOWEI 24 V 100 Ah, Growatt SPF 6000 ES Plus and Victron
MPPT 100/30) found unchanged exact model, source URL, VAT price and `InStock`.
VSelektro's MPPT 100/30 URL redirected to CAPTCHA, so **no new verification
or stock claim** is made for that offer.
