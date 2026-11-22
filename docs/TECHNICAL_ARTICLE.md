# Separating financial truth from financial investigation

Distributed payment incidents are difficult because the systems producing payment, ledger, webhook, and settlement facts do not share a clock or delivery guarantee. A timeout can precede a late authorization; webhook delivery may repeat; and an internal journal can disagree with a provider observation. A status field alone cannot reconstruct what happened.

LedgerLens models this as a separation of authority. Integer-minor-unit journals enforce double-entry balance. External observations are append-only evidence with occurrence and ingestion timestamps. A detector compares records deterministically; a graph preserves evidence references without treating timestamp order as causality.

The current demonstration injects a duplicate internal capture posting. Its investigator is deliberately rules-based: it reports a competing missing-observation hypothesis, cites the event records, and states uncertainty about the upstream mechanism. The proposed reversal is evaluated as a simulation and is not executed.

This is an early, in-memory engineering slice. Durable idempotency, transactional revalidation, model-provider evaluation, broader fault coverage, and a full recovery approval workflow remain open work. The project reports those gaps rather than presenting simulation-only outputs as production results.
