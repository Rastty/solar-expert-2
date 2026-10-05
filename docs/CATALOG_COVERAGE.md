# Solar Expert catalog coverage baseline

Snapshot: 2026-10-05, catalog schema 1.0.0.

This matrix is a regression baseline for the current verified public catalog. A tier is considered complete only when battery, inverter, MPPT/integrated MPPT and a valid panel topology all pass the engine checks.

| Scenario | Best Value | Premium | Main remaining gap |
| --- | --- | --- | --- |
| 12V small | complete | incomplete | no verified premium 12V battery/inverter lane |
| 12V heavy | complete | incomplete | no verified premium 12V battery/inverter lane |
| 24V small | complete | incomplete | no verified premium 24V battery lane |
| 24V medium | complete | incomplete | no verified premium 24V battery lane |
| 24V heavy | complete | incomplete | no verified premium 24V battery lane |
| 48V small | complete | complete | Budget battery lane missing |
| 48V medium | complete | complete | Budget battery/inverter lane missing |
| 48V high | complete via 2× PUSUNG-S | complete via 2× Pylontech US5000 | Budget lane missing |

## Verified parallel battery evidence

- SEPLOS PUSUNG-S: up to 16 batteries in parallel, evidence stored in catalog.
- Pylontech US5000: up to 16 modules in a single string, evidence stored in catalog.
- Battery banks are created only for products with explicit `parallel_max_units` evidence.
- The composer chooses the minimum verified quantity that satisfies both nominal energy and battery discharge power.
- Single-battery merchant bundle deals never apply to multi-battery banks.

## Product strategy

Do not fill an incomplete tier with discontinued or weakly evidenced products merely to make all three tier cards complete. Technical evidence and availability take priority over visual symmetry.

- Battery Selector shares the same parallel-bank engine as the Builder, so high-capacity standalone battery sizing no longer falsely reports “no match” when a verified multi-module bank is available.
- A multi-module bank may use one verified battery+inverter set when it is cheaper; only one battery is covered by the set and all extra modules are added at verified unit price.

## 2026-10-05 approved-merchant gap audit

Current approved-merchant evidence confirms that the remaining 12V/24V Premium gaps should stay intentionally empty:

- 12V: GOOWEI CNLFP100-12.8 and CNLFP200-12.8 are verified in-stock Budget/Best Value choices. Higher-spec smart alternatives found in the approved merchant inventory are not consistently in stock.
- 24V: GOOWEI CNLFP50-25.6 and CNLFP100-25.6 are verified in stock. Voltium VE-SPBT-24100 and VE-SPBT-2450 are currently listed **on request**, so they do not qualify for an active Premium recommendation.
- 48V already has verified Best/Premium coverage through SEPLOS and Pylontech.

Decision: do not create a Premium tier merely for visual symmetry. A tier may be shown as complete only when every required product is technically evidenced and currently recommendable.

## Price freshness policy

- Verified price snapshots use a 30-day freshness window.
- A known stale merchant price may not drive cheapest-price ranking or a bundle/set discount.
- The merchant link can remain available, but the stale price is hidden until re-verified.
- Legacy snapshots without a verification date are reported as `verification_unknown`; they are not silently relabeled with a current date.
- Health/admin diagnostics expose fresh, stale and unknown counts so the remaining legacy snapshots can be migrated without inventing evidence.

