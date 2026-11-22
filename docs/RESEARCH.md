# Domain and architecture research

Research performed 2026-11-22. Links are primary/official references where available.

## Verified findings

- Stripe describes its ledger as an immutable, auditable log and uses double-entry fund-flow modeling to detect uncleared balances, late/missing data, and producer inconsistencies. This supports append-only facts plus deterministic reconciliation rather than interpreting provider statuses as accounting truth. [Stripe Ledger engineering article](https://stripe.com/blog/ledger-stripe-system-for-tracking-and-validating-money-movement)
- Stripe PaymentIntent capture applies to an uncaptured intent in `requires_capture`; capture amount cannot exceed capturable amount. Authorization and capture must be distinct states. [Stripe capture API](https://docs.stripe.com/api/payment_intents/capture)
- Stripe exposes payment lifecycle events such as processing, requires_action, and succeeded; external observations are asynchronous. [Stripe events API](https://docs.stripe.com/api/events)
- Razorpay webhook guidance states duplicate deliveries are expected under at-least-once delivery, event order may differ, and event IDs help detect duplicates. [Razorpay webhook best practices](https://hdfcbank-collectnow-docs.razorpay.com/webhooks/best-practices/)
- Modern Treasury documents per-currency balanced transactions, immutable posted entries, compensating transactions, idempotency, atomic writes, and locking for balance-dependent writes. These are design references, not claims of equivalent guarantees in this prototype. [Ledger guarantees](https://docs.moderntreasury.com/ledgers/docs/ledgers-guarantees)
- TigerBeetle models transfers as immutable debit/credit records. [TigerBeetle transfer reference](https://docs.tigerbeetle.com/reference/transfer/)
- RBI's September 2019 circular defines failed-transaction TAT and compensation by payment-system case; the annex distinguishes cases and has calendar-day language. Applicability must be evaluated by rail, actor, and current amendments; this project does not enforce a generalized rule. [RBI circular notification and annex](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11693)
- NetworkX supports directed graph construction and serialization algorithms. [NetworkX tutorial](https://networkx.org/documentation/stable/tutorial.html)

## Implications

Store observed events as immutable records with occurrence and ingestion times, source identifiers, sequence when available, and provenance. Arrival order is not causality. Maintain deterministic read models and reconcile internal journals against external observations. Persist idempotency keys under unique constraints and reject same-key/different-request reuse. Use a directed evidence graph with explicit inferred edges. Keep external payment state, internal journal state, and settlement state independent.

## Assumptions and unresolved questions

The initial simulator uses INR integer paise and a simplified card-like authorization/capture/settlement flow. Fee and settlement behavior are synthetic. No bank account or external cash is represented as an internal asset. The current demo uses process-local state and is not concurrency safe across processes. Regulatory applicability, current RBI amendments, precise provider semantics, production accounting policies, and tenancy/authentication design require domain review before enforcement.

Some requested URLs (full Razorpay docs, RBI site, Stripe docs) were searched/opened; authoritative claims above only reflect content returned by the linked primary documents. Hypothesis and Ruff are installed through the development lock, but property-based tests have not yet been written. Z3 and SimPy remain uninstalled/unintegrated.
