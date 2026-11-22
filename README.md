# LedgerLens AI + FinOpsBench

**Find where money got stuck. Understand why. Verify the recovery.**

LedgerLens is a simulation-only financial incident reconstruction project. It separates financial authority from AI: deterministic accounting, state transitions and invariant checks own truth; an eventual investigator may only propose evidence-backed explanations and actions. No real funds can be moved.

## Current runnable slice

- INR integer-minor-unit balanced journals, immutable records, idempotency conflict detection, compensating reversal.
- Guarded payment state machine with settlement status independent.
- Seeded duplicate-posting incident, detector, NetworkX evidence graph, evidence-citing deterministic diagnosis, and isolated recovery simulation.
- FastAPI health/incident/evidence endpoints.

The investigator is deterministic rules (not an LLM). The dashboard and in-memory approval-gated sandbox workflow are implemented; durable database storage, actual provider tool-calling, broad scenario coverage, and FinOpsBench remain unimplemented. See [progress](PROGRESS.md) and [limitations](docs/LIMITATIONS.md).

## Run

Python 3.12+ and uv: `uv sync --extra dev`

For the dashboard dependencies: `cd apps/dashboard && npm ci`

- Demo: `uv run python -m ledgerlens.demo`
- Full local UI: `docker compose up --build` (API on `:8000`, dashboard on `:3000`)
- API: `uv run uvicorn ledgerlens.api:app --app-dir apps/api/src --reload`
- Tests: `uv run pytest` and `cd apps/dashboard && npm run test:e2e` (uses installed Microsoft Edge)
- API docs: `http://127.0.0.1:8000/docs`

All displayed amounts are generated simulation data. Sandbox approvals use a local demo keyword (`local-demo-approval` by default, overridable with `LEDGERLENS_APPROVAL_TOKEN`). This keyword is a demonstration gate, not account login or production authentication.

## Architecture

See [architecture](docs/ARCHITECTURE.md), [financial model](docs/FINANCIAL_MODEL.md), [research](docs/RESEARCH.md), [threat model](docs/THREAT_MODEL.md), and [decisions](docs/DECISIONS.md). The visual and engineering bar takes inspiration from the user's `support-llm-3b` project: explicit proposer/authority boundaries, candid measurement, evidence-first product narrative, and a concise runnable demo path.
