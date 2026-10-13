# VSelektro.eu — conditional onboarding dossier (research only)

Last research: **2026-10-13**. This is **NOT an approved merchant integration** and must not generate a customer-facing product offer, a direct outgoing checkout CTA, an affiliate redirect or a higher live seller count.

## Why this merchant is stronger than the previous candidates

- The seller named in [VSelektro's own terms](https://www.vselektro.eu/obchodni-podminky/) is **VS ELEKTRO PLUS s.r.o., IČ 09719458**. Existing Battery.cz and Solar-Import.cz storefronts both identify **Efteria, spol. s r.o., IČ 26763028**. This is a different legal operator, not a third brand of Efteria.
- [eHUB's VSelektro advertiser listing](https://ehub.cz/5a89d856-vselektro-eu) advertises a **2.8–4.8%** PPS commission range and **30-day** attribution window. A public programme listing **does not establish approval for our account**, acceptable placement terms or a working affiliate deep-link.
- Three catalog-identical Victron SmartSolar MPPT models appear on actual seller-domain item pages. Unlike AMPUL electronics inventory, these match the off-grid selection engine's existing MPPT product IDs.

| Live catalogue ID | Seller's direct SKU page | Price in public indexed material — research ONLY |
| --- | --- | ---: |
| `mppt-victron-100-20` | [Victron 100/20](https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-20a/) | 2,404 CZK |
| `mppt-victron-100-30` | [Victron 100/30](https://www.vselektro.eu/solarni-regulator-victron-energy-smartsolar-30a/) | 3,483 CZK |
| `mppt-victron-100-50` | [Victron 100/50](https://www.vselektro.eu/solarni-regulator-victron-energy-mppt-smartsolar-100v-50a/) | 5,002 CZK |

Source pages label these products **Skladem**, but public search extracts are cached/dated and availability can change. The prices above are *not* same-day verified checkout values, and must **never** be copied into `data/product-seed.json` or `assets/data/product-seed.json` without a fresh independent re-check. SKU model, EAN and the specified 100V max PV Voc / 20, 30, 50A charge limits need confirmation against manufacturer datasheets before accepting offers. Seller-page text alone is not proof of start-voltage and cold-Voc fit.

## Blocking approval and safe activation sequence

1. **Owner / eHUB:** verify that Solar Expert's eHUB publisher account is approved for VSelektro.eu, not just applied or pending; verify the programme permits this comparison/recommendation model. Do not claim the approval in this repository.
2. **Merchant checkout due diligence:** on **two different dates** verify real Czech-currency offer price, actual stock status, correct model/EAN and checkout directly at `vselektro.eu` for **all three** SKUs. Verify independent seller company and that stock/price is not old cached search text.
3. **Affiliate tracking:** store the approved `vselektro-eu` base URL **privately in the WordPress affiliate base map** (never in git). Confirm a real merchant-specific eHUB `desturl` reaches the exact product SKU without breaking the seller's tracking terms. Do not make fake conversion orders.
4. **Code and QA:** upgrade the registry status only once proof is available, add `vselektro-eu` to the validated allowlists and product offers in **both identical** product catalog copies, add fresh dated per-offer prices, and regression-test vendor-domain isolation, matching models/EAN, correct 100V MPPT technical rules, direct retail target, fresh prices and affiliate link generation.
5. **Staged production release:** run full selector/Builder regression, preview, gated auto-deploy and live merchant health. Require seller count ≥2 **only after** third-store checkout is monetized; require no loss of the current 2 brands / 49 audited offer URLs and no change to frozen selector ranking. Review actual offer impressions/clicks after meaningful exposure rather than attributing revenue from a code release.

**Status 2026-10-13:** steps 1–5 not completed. Files under `data/merchant-candidates/` are isolated research artifacts, never input to runtime. Existing store links and affiliate coverage are unchanged.

Reference: [Revenue blocker #112](https://github.com/Rastty/solar-expert-2/issues/112).
