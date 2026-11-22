# Resume bullets (implemented scope only)

- Built a simulation-only payment incident reconstruction slice with integer-cent USD double-entry journals, guarded payment transitions, idempotency conflict checks, and compensating reversals.
- Implemented a seeded duplicate-posting detector, evidence graph, evidence-referenced rule diagnosis, counterfactual recovery report, and FastAPI read endpoints.
- Added an API-backed Next.js operations console and verified Python tests and an optimized dashboard build.
- Built a deterministic scorecard: 100% across 100 generated cases (50 duplicate-posting faults and 50 idempotent-delivery controls) for detection, root-cause classification, evidence-ID validity, recovery simulation integrity, and unsafe-reversal rejection. This covers one fault family and is not an LLM score.

Do not present the narrow deterministic score above as general payment diagnosis accuracy or as FinOpsBench results. No LLM accuracy, throughput, or multi-fault recovery results have been measured.
