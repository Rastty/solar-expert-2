# Growatt SPF integrated MPPT: known operating limits vs unknown absolute PV Isc

Technical reconciliation date: **2026-11-07**. This is source-evidence and safety policy, **not a claim that the live website has deployed this change**.

## Exact models and verified statements

| Catalog product | Input operating current | MPPT trackers | Strings per tracker | PV Wp / tracker | Distinct absolute PV Isc evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| Growatt SPF **3500 ES** | **22 A** PV input | 1 | 1 | 4,500 Wp | **Unverified for current sold hardware revision** |
| Growatt SPF **6000 ES Plus** | **16 A per tracker** | 2 | 1 | 4,000 Wp | **Unverified; 16 A is NOT stated as absolute Isc** |

Sources:

- [Growatt SPF 3500/5000 ES installation manual, PV charging table (p. 38)](https://www.growatt.tech/wp-content/uploads/2023/02/SPF-3500-5000-ES-User-Manual-EN-202109.pdf): max PV operating input current 22 A, start approximately 150 V ±10 V, MPPT 120–430 V, cold Voc ceiling 450 V, PV power 4500 W for 3500 ES. Its battery *solar charger* output of **80 A** is a different electrical parameter.
- [Growatt SPF 6000 ES Plus datasheet, p. 2](https://growatt.tech/wp-content/uploads/shared-files/11396/?SPF_6000_ES_Plus_Datasheet_EN_202211+%281%29.pdf=&download=1): **two independent trackers, one string per tracker**, PV operating input 16 A *per tracker*, total advertised 8000 Wp (4000+4000 Wp per tracker from [model installation manual](https://www.fve-mp.cz/data/blob/product-application_pdf-20230816064921-7307-spf-6000es-plus-manual-en.pdf)), MPPT 120–450 V, Voc max 500 V, battery solar charger max 100 A.
- [ERAC historical registration for SPF 3500 ES](https://device.report/growatt/spf-3500-es) mentions **18 A (Isc)**, but its certification expiry was January 28, 2026 and its hardware revision cannot yet be matched with the precise currently sold retailer SKU. The 2021 manual's separate **22 A PV operating input** is not proof that a current production SKU has an 18 A short-circuit input ceiling. Neither 18 nor 22 is silently adopted as approved absolute current for this installation.

The catalog records **source-dated** `pv_input_operating_a_per_tracker`, `pv_tracker_count`, `pv_strings_per_tracker`, `pv_w_max_per_tracker` and the exact documentation URL, while deliberately marking `pv_isc_absolute_status=unverified` and omitting `pv_isc_absolute_limit_a`.

## Safe planner distinction

For an integrated Growatt configuration, the provisional topology finder:

1. Rejects panels with missing/invalid Isc. Uses the real panel `Isc × input strings on that tracker`, not the sum of both independent trackers.
2. Rejects `parallel > tracker_count × strings_per_tracker`. A SPF 6000 with 2 independent MPPT inputs can have 1S string per input: **7S2P means two *separate* 7-panel strings connected to different MPPT terminals**, not both parallelled at one port.
3. Applies **98% of the manufacturer's max PV operating input current** as an extra conservative screening limit per tracker. **This is only an operating-current screen; it is NOT proof of absolute PV short-circuit compatibility.**
4. Applies per-tracker PV max watts, aggregate PV max watts, minimum Vmp and cold Voc max.
5. Marks `status=pv_isc_limit_unverified` and `pvIscVerified=false` when the exact absolute PV Isc of the sold revision is not independently proven.

The UI's **purchasable bundle list, default shopping list, product/affiliate offer buttons and price comparison** exclude any such Growatt bundle; the page instead explains the outstanding PV Isc risk. Pure underlying theoretical battery/panel/price calculations remain available to old deterministic unit tests **but cannot authorize purchase**. This intentionally forgoes immediate sales rather than monetizing an unsupported installation.

**Important:** `complete=true` inside the internal composer indicates a sized set of components for diagnostics only. The explicit independent purchase eligibility state is `pvIscVerified`. Consumer UI and `purchaseBreakdownFor` **must both enforce that gate**; they do not equate a component-count-complete set with a safe purchasable recommendation.

## Review gate / source-of-truth

To release Growatt bundles for purchase, obtain a **manufacturer datasheet or written support response matching the actual currently sold hardware revision** and showing an explicit absolute **PV Isc ceiling per tracker**, alongside the input operating current and power/strings limits. Add that exact source and date to the catalog, set `pv_isc_absolute_status=verified` and `pv_isc_absolute_limit_a` ONLY after independent review. Re-run cold-Voc, per-tracker Isc, source parity, engine QA and WP Playground.

No affiliate test clicks, changed retailer price/date, WordPress production edits or live release occurred in this work. Independently approved [release safety PR #142](https://github.com/Rastty/solar-expert-2/pull/142), [WordPress database/media rollback #148](https://github.com/Rastty/solar-expert-2/issues/148) and prerequisite catalog/MPPT PRs remain mandatory. Tracking issue: [#151](https://github.com/Rastty/solar-expert-2/issues/151).
