# Solar Expert — targeted seller correction, second cohort (2026-11-20 UTC)

Read-only direct-merchant inventory inspected **52 source URLs** in the current
catalog (48 product-offer rows and 4 bundle-offer rows), without eHub tracking
links or WordPress writes. Of them, 49 returned exact URLs with visible
structured product price/availability metadata. Three VSelektro pages redirected
to CAPTCHA: **inconclusive**, not a basis to update price or stock. This scan
alone does not certify product identity, technical compatibility or the accuracy
of every unchanged listing.

## Independently confirmed changes

| Exact SKU/retailer | Previous source | Visible seller page, 2026-11-20 | Change |
| --- | --- | --- | --- |
| [Victron 190W panel, Battery.cz](https://www.battery.cz/victron-energy-solarni-panel-190w-12v--monokrystalicky/) E8934 | 2 496 Kč, skladem | 3 486 Kč incl. VAT, skladem | Alternate offer price +990 Kč; primary Solar-Import 2 251 Kč unchanged |
| [SEPLOS POLO-W + Growatt bundle, Battery.cz](https://www.battery.cz/set-lithiova-baterie-seplos-polo-w--5-12kwh--menic-growatt-spf-6000es-plus--6000w-48v/) E9021 | 32 990 Kč, skladem | 32 990 Kč, **Na dotaz** | Not purchase-ready |
| [SEPLOS POLO-W + Growatt bundle, Solar-Import.cz](https://www.solar-import.cz/solarni-sestavy-ac/set-lithiova-baterie-seplos-polo-w--5-12kwh--menic-growatt-spf-6000es-plus--6000w-48v/) E9021 | 32 990 Kč, skladem | 32 990 Kč, **Na dotaz** | Not purchase-ready |

Both bundle pages also expose `schema.org/OutOfStock`. The set's two merchant
offer rows and its primary mirror are marked `on_request` and checked on
`2026-11-20`. The alternate Victron panel offer has the observed 3 486 Kč and
its own new verified date. The two JSON catalog mirrors stay identical and
other offer timestamps remain unchanged. The available PUSUNG-S + Growatt
bundle remains untouched and eligible.

**False-positive guard:** Two Victron 48V/1200 inverter pages advertise
`schema.org/InStock` but the actual visible label says **obvykle skladem,
expedice do 7 dnů**. Their existing `usually_in_stock` classification is
correct and was deliberately left unchanged.

## Verification and release

`tests/catalog-bundle-panel-20261120.test.mjs` proves that the unavailable
POLO-W bundle cannot claim a savings or enter an actionable buyable bundle,
that the stocked PUSUNG set remains eligible, and that the changed panel price
does not overwrite a different retailer's quote. Historical audit fixtures
acknowledge precisely three newly checked offer rows.

This is a `dev` source correction, **not** a WordPress deployment. Full theme
release still requires issue #148's independent restore/staging proof and the
existing guarded one-time release process.
