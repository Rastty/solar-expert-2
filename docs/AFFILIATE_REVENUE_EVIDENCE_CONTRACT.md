# Affiliate revenue evidence contract for Prometheus

Solar Expert's public health payload (`/wp-json/solar-expert/v1/health`)
includes `affiliate_financial_outcomes`. Until an authenticated publisher
network transaction report is integrated, the payload is intentionally:

- `status: not_connected`;
- `confirmed_orders: null`;
- `approved_commission_amount: null`;
- `paid_commission_amount: null`;
- `currency: null`;
- `attribution_scope: unavailable`;
- `derived_from_clicks: false`.

**Unknown is not zero.** The first-party `outcome_scoreboard` reports only
offer impressions, tool activity and outbound route choices. Neither an eHub
base configured in WordPress nor a completed tracking redirect proves an order.

The canonical paid/approved commission ledger should reside in Prometheus
Core, not a second WordPress-ledger per site. A future connector should:

1. Read a network-authenticated export/API, preserving transaction ID, network,
   merchant, publisher/site attribution, status, commission amount, currency,
   recorded and updated timestamps, and source provenance.
2. Deduplicate updates by `(network, transaction ID)`; avoid counting the same
   pending→approved→paid transaction repeatedly, and handle reversals.
3. Report approved and **actually paid** totals separately, with explicit
   period and currency; do not sum CZK and EUR without an audited conversion.
4. Attribute transactions to Solar Expert only when the affiliate network
   provides defensible site/sub-ID evidence. Otherwise mark site attribution
   unknown rather than assigning portfolio sales by click ratio.
5. Publish only aggregated, non-sensitive outcomes to the public health
   contract; keep transaction-level evidence and API secrets private.

This change introduces the honest read-only handoff, **not** a simulated
network connector or proof of revenue. It does not change technical product
ranking, affiliate destinations, WordPress settings, or release gates.
