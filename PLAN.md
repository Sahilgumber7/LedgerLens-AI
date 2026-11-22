# Plan and acceptance criteria

- [x] Phase 0: inspect environment/reference project, research primary sources, document assumptions and design.
- [x] Phase 1 slice: integer-minor-unit USD journal, balanced immutable postings, idempotency conflict detection, payment state machine, append-only events.
- [x] Phase 2 slice: seeded reproducible fault scenario and deterministic incident detection.
- [x] Phase 3 deterministic slice: evidence graph, rule investigator with evidence citations, isolated recovery simulation and invariant checks.
- [x] Approval-gated in-memory sandbox execution with stale-version recheck and process audit.
- [ ] Persist all core entities transactionally with SQLAlchemy/Alembic and PostgreSQL; concurrency/replay tests.
- [ ] Provider-independent structured LLM tool caller and bounded traces.
- [ ] Durable audit persistence and stronger approval identity beyond the local demo token.
- [ ] FinOpsBench split/generation/evaluators and measured baselines.
- [x] Narrow deterministic baseline scorecard with reproducible JSON/CSV/Markdown output (not FinOpsBench).
- [x] API-backed Next.js first-view dashboard with evidence and sandbox recovery flow.
- [x] API-backed operational overview charts, visible demo keyword explainer, audit activity, and responsive browser checks.
- [x] Third-party dataset and related-project review with licensing/scope cautions.
- [x] Branded landing page, API-checked demo keyword entry, USD display/model, and workspace exit control.
- [x] Separate API-backed routes for overview, fraud/payment alerts, payment observations, sandbox recovery, audit, and the measured deterministic scorecard.
- [x] Shared workspace navigation, route gating with the demo keyword, responsive mobile navigation, and page-level empty/error states.
- [x] Docker Compose/Dockerfiles and initial project docs (container runtime not verified).
- [ ] CI and independently reproducible benchmark.

Acceptance for current slice: `pytest` passes; `python -m ledgerlens.demo` produces reproducible evidence-linked diagnosis, recovery simulation, and rejects unsafe recovery; FastAPI health and incident APIs run without credentials.
