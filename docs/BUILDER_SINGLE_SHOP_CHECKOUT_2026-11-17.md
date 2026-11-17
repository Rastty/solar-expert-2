# Builder: all components from one verified shop — 2026-11-17

## Buyer problem and real snapshot

The Builder's best cottage quote at the 2026-11-07 merchant-price snapshot
is **34,109 CZK** across the independently priced Battery.cz and
Solar-Import.cz storefront offers. These websites share the same legal
operator but remain **different checkouts**. All four principal component
types (battery, inverter, panels and MPPT) have verified in-stock listings
on Solar-Import.cz totaling **34,120 CZK**. For **11 CZK** more, the buyer
can open all four product listings within a single storefront; shipping,
mounting, cabling, protection and installation remain excluded.

For off-grid and 230V pond examples, the cheapest source-priced combination
is already available entirely at Solar-Import.cz, so adding an extra card
would only duplicate the same route. The backup example also has the 11 CZK
one-shop alternative.

## Implementation

- `singleShopFor` uses the existing exact `purchaseBreakdownFor` and
  `SolarExpertAffiliate.offers` source/date/stock/actionable-link rules.
- Only display a distinct one-shop option if **every required component**
  has a fresh in-stock quote from that SAME storefront and its full subtotal
  can be reconciled; a 3%-or-1000-CZK convenience premium cap prevents a
  high-priced upsell. No card if an equally cheap all-one-shop path already
  exists, or if the priced bill is unknown/inconsistent.
- Do not attempt to reconstruct a special battery+inverter deal's component
  discount; those offers remain in the existing separate set flow.
- Individual links are existing merchant/product offer destinations, with
  existing sponsored disclosure and `affiliate_click` emitted **only on
  actual outbound click**. There is **no single cart, one-click checkout,
  reservation, test purchase, imaginary shipping saving or promised stock**.
- 4-product quantities, offered prices, seller domains, total and price
  difference are tested from the unchanged published catalog.

No catalog data, affiliate credentials/URLs, GSC pages, product rankings,
technical sizing or WordPress production content were changed. WordPress
release still requires independent #148 DB/uploads restore evidence.
