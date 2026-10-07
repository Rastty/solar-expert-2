# Solar Expert methodology

## Principle

Solar Expert must answer: **What do I need, why, and which products fit together?**

Ranking order:
1. technical compatibility,
2. evidence completeness and freshness,
3. availability,
4. whole-system / right-size fit,
5. verified price and value,
6. merchant diversity.

Affiliate commission must never be an input to technical ranking.

## Selector core v1 contract

Selector Core v1 is intentionally conservative and deterministic.

- Technical compatibility is a **hard gate**. A score, lower price, stock state or affiliate relationship can never promote an incompatible product.
- Evidence quality is evaluated before commercial preference. Stale or missing evidence is downgraded explicitly.
- Availability is evaluated only after evidence quality.
- Right-size fit rewards the smallest unnecessary oversizing **after** the safety sizing requirement has already been met.
- Price comparison uses only current verified usable prices. Stale prices cannot win ranking.
- Merchant diversity is a final resilience/tie-break signal; commission size is never a ranking signal.
- Every ranked candidate carries a structured decision object with fit, evidence, availability, price/value and explanation reasons.
- If required technical evidence is absent, the engine fails closed instead of inventing compatibility.

This ordering is the frozen v1 decision contract. Any future change to ranking priority requires a regression test and an explicit methodology change in the same pull request.

## Sizing boundaries

The Builder is a decision aid, not an electrical installation design. Before a bundle is marked fully verified, it must still pass:
- cold-temperature panel Voc,
- MPPT operating-voltage window,
- battery BMS discharge current,
- inverter continuous and surge power,
- cable and protection sizing,
- manufacturer communication requirements,
- current stock/price.

## Recommendation labels

- **Preliminarily compatible**: core voltage/power/capacity rules pass, but final datasheet checks remain.
- **Verified bundle**: all recorded manufacturer constraints pass.
- **Incomplete**: the catalog lacks enough evidence or a suitable product. Do not invent a substitute.

## Reference-pattern policy

We may learn interaction patterns from Renogy, SolarReviews, EnergySage and review.solar, but never copy their branding, text, imagery or distinctive design.
