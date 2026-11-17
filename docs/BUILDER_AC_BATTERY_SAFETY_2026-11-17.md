# Builder AC battery energy and BMS discharge parity — 2026-11-17

## Evidence and problem

The separate Battery Selector has used `0.80` usable nominal LiFePO4 capacity
and `0.90` modeled AC inverter efficiency since 2026-10-14; the Builder still
computed nominal capacity using just `AC Wh × days / 0.85`, and compared
nominal BMS discharge watts against **AC** inverter watts. That discrepancy
could recommend a bank with too little modeled energy or DC discharge current.

## Change (Builder and bank matching only)

- Required nominal battery kWh = round up to 0.1 kWh of
  `(AC Wh/day × autonomy days) / (1000 × 0.80 × 0.90)`.
- Required modeled BMS DC discharge W = `ceil(AC inverter target W / 0.90)`.
- The Builder passes `batteryDcW` to the existing bank candidate filter;
  `inverterW` remains the actual AC output target for inverter/surge fitting,
  real buyer display and analytics. Other Selector callers retain the old
  `sizing.inverterW` compatibility contract (they already pass DC watts).
- The buyer screen discloses both percentages, DC power, excluded inverter
  idle consumption, battery low-voltage and transient-current uncertainty.

## Catalog effects, simulated with 2026-11-17 time and 2026-11-07 quotes

| Scenario | AC Wh/day | Old required nominal kWh | New required nominal kWh | Buyer offer |
| --- | ---: | ---: | ---: | --- |
| Chata quick example | 1,448 | 1.8 | 2.1 | 24V priced bundle remains available |
| Off-grid | 1,718 | 2.1 | 2.4 | 24V priced bundle remains available |
| Backup | 1,188 | 1.4 | 1.7 | 24V priced bundle remains available |
| Pond 230V | 840 | 1.0 | 1.2 | 12V priced bundle remains available |
| Chata **plus 800W pump**, one-day reserve | 1,848 | 2.2 | **2.6** | 24V 2.56kWh bank insufficient; **no complete priced quote** |

The last outcome is deliberate: do not round the 2.56kWh physical module up
to 2.6kWh or invent a new product/parallel wiring. Users can explicitly reduce
autonomy to half a day for an existing compatible catalog path, but this is
**not** an automatic replacement for their one-day requirement.

No price, merchant, affiliate attribution, product inventory, SEO article,
Selector Core v1 ranking or production WordPress content was altered. New
regression test `tests/builder-ac-battery-safety.test.js` includes real catalog
scenario quotes, a 24V/40A BMS boundary and the blocked pump case.

## Boundaries

These efficiencies are simplified illustrative factors, not manufacturer
guarantees. Low-voltage BMS cutoff, transient start currents, charger
configuration, inverter no-load use, environmental derating, wiring and
protection require hardware-specific verification. **Issue #148** still gates
any production theme deployment until a recoverable DB/uploads restore is
demonstrated. PR merge to `dev` does not prove a production release.
