# Engineering guide

LedgerLens models payment-processing events and internal accounting; no real payment integrations. Deterministic code is authoritative for money, state transitions, and verification. AI providers may only propose diagnoses/actions, with bounded typed tools; never expose ground truth. All posted journal entries are immutable and balanced per currency. Corrections use compensating entries. Keep payment and settlement lifecycles independent. Every incident claim must cite evidence IDs.

Read `PLAN.md`, `PROGRESS.md`, `docs/DECISIONS.md`, and `docs/LIMITATIONS.md` at session start; inspect `git status` before edits. Do not claim unrun features or metrics. Run `pytest` for behavior changes and record actual results.
