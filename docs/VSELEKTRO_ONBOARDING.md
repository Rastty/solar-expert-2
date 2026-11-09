# VSelektro.eu — first independent merchant integration

**Released candidate:** 2026-10-13 · Solar Expert v0.12.25 · three exact MPPT SKUs.

## Commercial confirmation

- Owner supplied the **merchant-specific eHUB base link** and a deep-link example using the standard `desturl` parameter. The base was successfully inserted into the private WordPress option `solar_expert_affiliate_bases['vselektro-eu']` with WPVibe WP-CLI `option patch insert` (exit code 0, option/object cache flushed). **Do not copy the base or publisher ID into Git.**
- VSelektro is run by **VS ELEKTRO PLUS s.r.o., IČ 09719458**; Battery.cz and Solar-Import.cz share Efteria, IČ 26763028. Only the former gives us a *second independent legal operator*.
- The existing eHUB deep-link builder preserves merchant-specific base parameters and safely URL-encodes `desturl`. A browser-side unit test covers exact SKU targeting with a **synthetic test base**, and protected production checks verify the live merchant base and catalog. **A completed referral redirect or actual affiliate commission/order was NOT tested/observed.**

## Verified seller-page SKU snapshots, 2026-10-13

All three product pages were retrieved independently from the seller domain on Oct 13 and showed the manufacturer model, exact EAN, relevant MPPT specifications, Czech price with VAT and **Skladem**. Seller's live price and stock can change; these are *dated public listing snapshots*, not a checkout guarantee. Never continue showing them as fresh after the existing 30-day freshness window.

| Catalog ID | Manufacturer EAN | Seller price incl VAT | Seller SKU source |
|---|---|---:|---|
| `mppt-victron-100-20` | 8719076043027 | **2 404 Kč** | [100/20](https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/) |
| `mppt-victron-100-30` | 8719076040170 | **3 444 Kč** | [100/30](https://www.vselektro.eu/solarni-regulator-victron-energy-smartsolar-30a/) |
| `mppt-victron-100-50` | 8719076040194 | **4 946 Kč** | [100/50](https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/) |

The product-level source and original two-store offers remain unchanged. We append only the **third** VSelektro per-SKU offer; no duplicate products, rankings, solar panel math or battery compatibility modifications. The MPPT selectors and the Builder MPPT purchase group now display *up to three store offers*, ensuring this independent but sometimes dearer seller is actually visible. Battery.cz and Solar-Import.cz continue to be disclosed as one legal seller even on three-offer cards.

## Safety and measurement

1. Affiliate base is stored only in private WP options. The public catalog contains **direct, untracked, exact product links**, never affiliate redirect URLs.
2. `data/product-seed.json` and `assets/data/product-seed.json` have identical 24-product/4-bundle data. The 49 previous source URLs are preserved, and three exact SKU URLs are added (52 audited sources in total).
3. Static source audit allowlists only VSelektro's own HTTPS host. An independent source auditor uses HTTP HEAD / GET only, not eHUB clicks, and does not infer a completed order.
4. Regression checks validate three SKU identities, stock/price snapshot date, per-merchant tracking generation with fake test parameters, 52 direct source URLs, merchant ownership disclosure and zero affiliate IDs in tracked JSON. CI and WordPress preview must pass before merging.
5. Deployment requires live health to report **at least three monetized storefronts and two independent legal merchants**. The public product catalog and localized JS config must show VSelektro on the live site. If the private WP option is absent or code/caches are stale, the gate fails. No manual purchase click should be generated for QA.
6. Watch first-party `offer_exposure` / `affiliate_click` by placement and merchant. A tracked click is **not** a confirmed transaction; compare real publisher commissions in eHUB when available.

Sources: [VSelektro terms](https://www.vselektro.eu/obchodni-podminky/), [public eHUB programme](https://ehub.cz/5a89d856-vselektro-eu), [Revenue independent seller issue](https://github.com/Rastty/solar-expert-2/issues/112).
