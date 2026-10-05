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
