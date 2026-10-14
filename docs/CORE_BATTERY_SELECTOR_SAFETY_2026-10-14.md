# Battery Selector – conservative AC-to-DC battery sizing (2026-10-14)

## Bug and consequence

The published Battery Selector assumed required nominal LiFePO₄ energy = daily AC kWh × days / **0.85** and BMS continuous capability = requested inverter **AC output W** / nominal DC voltage. Both are optimistic relative to the **0.80 usable nominal battery fraction × 0.90 modeled inverter efficiency** explained in our 400Wp buying guide.

A customer requesting 900W AC with a 24V, 40A BMS module formerly passed nominal 24V×40A = 960W, although modeled DC draw at 90% efficiency is **900/.90 = 1000W**, implying 41.7A at nominal 24V. Nominal available Wh and real operating DC current are separate safety conditions.

## Scoped correction

In **Battery Selector only** (not Builder or MPPT/Inverter rankings), use:
- `requiredBatteryKwh = roundUpTo0.1(dailyKwh × autonomy / (.80 × .90))`
- `requiredBatteryDcW = ceil(requested AC inverterW / .90)`
- `requiredDischargeA = ceil(requiredBatteryDcW / nominal 12/24/48V)`
- Pass the DC power requirement to the existing unmodified shared matcher/battery-bank composer under its existing `sizing.inverterW` electrical-fit contract. Both parallel-bank and single-product fallback therefore apply the same conservative constraint.
- Analytics still reports the **original user-entered AC** `inverterW`, avoiding instrumentation discontinuity. No engagement or affiliate click is emitted merely by loading examples.
- Explain assumptions beside the input, including necessity to count inverter idle consumption within kWh/day; 0.80/0.90 are *illustrative engineering assumptions*, not certified SKU efficiencies or a guarantee of safe installation.

## Boundaries

Do not confuse 90% modeled inverter efficiency with worst-case measured efficiency, temperature derating, actual minimum DC voltage, BMS transient capabilities, wiring or breaker design; specialist verification and datasheets remain mandatory. A conservative nominal voltage class may still not cover lower voltage under deep discharge.

No edit to merchant mapping, product prices, WP database, SEO canonical, original content, quote checker, Builder, GSC indexed posts or catalog product attributes.

## Verification

CI tests the **actual GOOWEI 24V 50Ah, 40A BMS** from the seeded published catalog (with single-module fixture): a 900W AC draw must fail, whereas 800W AC can pass if energy suffices. It checks both bank and fallback matcher, 700Wh AC/day→1.0kWh nominal and once-only user analytics retaining AC W. Live deploy smoke verifies rendered user copy and actual public selector JavaScript formulas.

Improvement is a corrected safety boundary, **not** evidence of greater SEO traffic, click-through or sales.
