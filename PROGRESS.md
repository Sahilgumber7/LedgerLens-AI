# Progress

## Current checkpoint (2026-11-22)

Created the monorepo under `coding/projects/LedgerLens`; reviewed the reference `support-llm-3b` project; researched official payment, accounting, and RBI sources; documented findings and decisions.

### Implemented and verified

- Integer paise INR double-entry journal with balancing, account/currency validation, immutable records, process-local idempotency conflict detection, and compensating entries.
- Payment transition guard and separate settlement status field.
- Append-only event dataclasses with occurrence/ingestion time and provenance fields.
- One seeded duplicate-posting scenario, deterministic detector, NetworkX evidence graph, and rule-based competing hypotheses with explicit uncertainty.
- Counterfactual reversal in a deep-copied ledger; test verifies corrected balances and unchanged source ledger.
- FastAPI health, incidents, evidence, deterministic investigation, recovery proposal/simulation/approval/execution, and audit endpoints. Sandbox approval token, stale-version rejection (covered by the API test), duplicate execution guard, and simulated-only financial effect. Evidence graph includes internal journal nodes; same-timestamp records are not ordered. State is process-local and resets on restart.
- Next.js operations page reads incident/evidence/diagnosis APIs, supports persisted light/dark themes, uses inline SVG icons and locale-formatted INR, and shows the keyword approval explanation beside the sandbox action.
- Added UTF-8/LF editor settings and replaced corrupted placeholder symbols.
- Added Playwright browser tests for overflow at 320/375/768/1280px, mobile table scrolling, rendered rupee symbol, light theme colors, and the local keyword approval flow.
- Dockerfiles and compose configuration; compose config parses successfully.
- `uv.lock` and dashboard `package-lock.json`.

### Actual verification output

- `uv run pytest -q`: **7 passed** (one upstream Starlette deprecation warning).
- `uv run ruff check apps/api/src tests`: **All checks passed**.
- `python -m ledgerlens.demo`: completed and printed incident, evidence-linked diagnosis, and recovery simulation JSON.
- Dashboard `npm run build`: passed; `npm run lint`: passed; `npx tsc --noEmit`: passed; `npm audit`: **0 vulnerabilities**.
- Dashboard `npm run test:e2e`: **3 passed** in installed Microsoft Edge at 320px, 375px, 768px, and 1280px; assertions cover viewport overflow, internal table scrolling, INR glyph, theme colors, and approval flow.
- `docker compose config --quiet`: passed. `docker compose build` could not run because Docker Desktop Linux engine was not running (missing Docker API named pipe); container images are unverified.

### Not implemented / not claimed

No SQLAlchemy persistence/Alembic migrations or cross-process concurrency; no actual LLM provider or AI tool-calling agent; no Hypothesis properties despite the dev dependency; no Z3/SimPy integration; only one fault family; no FinOpsBench dataset/evaluation; no RBI executable rules; no full payment explorer/metrics/audit UI; no CI. Hosted model integration and production auth are absent. Docker build/runtime is unverified. No benchmark results or model accuracy claims.

### Next actions

1. Implement database models, migrations, unique idempotency constraints, and transactional storage; test concurrent duplicate posts and restart replay.
2. Add typed provider-independent structured tool calling with budgets, prompt-injection-safe tool outputs, and deterministic mock provider tests.
3. Add multiple scenario families and FinOpsBench split/evaluators, then connect all displayed UI data and recovery history to durable API queries.

### Follow-up: dataset review and dashboard visualization (2026-11-22)

- Added `docs/DATASETS_AND_RELATED_WORK.md` with sourced candidates (MoMTSim, PaySim, BankSim, IBM AMLSim/AML-Data, ULB/Worldline fraud, AIOps Challenge 2020, RCAEval, AIOpsArena), suitability boundaries, license cautions, related project references, and a recommendation to keep FinOpsBench ground truth in the LedgerLens simulator. No external dataset downloaded or result claimed.
- Added `/api/v1/overview` with live counts from the process-local scenario, event records, journals, and deterministic detector. Verified loss remains explicitly unestablished. Incident detection now treats a compensated journal as inactive; the incident list and overview clear after reversal.
- Expanded the dashboard with API-backed event-source bars, severity visualization, operating metrics, recovery audit activity, and a keyword field with a visible side explainer. The keyword gate is explicitly identified as a demo sandbox check, not authentication.
- Refreshes overview, incidents, and audit data after recovery execution. Browser coverage now checks chart presence, keyword display, themes, rupee formatting, mobile table scroll, and no viewport overflow at 320/375/768/1280 pixels.
- Verification run: `python -m pytest -q` = 7 passed (one upstream Starlette deprecation warning); Ruff passed; dashboard ESLint passed; `npx tsc --noEmit` passed; Playwright = 3 passed. Existing local API and dashboard respond at `127.0.0.1:8000` and `127.0.0.1:3000`.
- Still unimplemented: durable persistence, real provider-backed agent, multiple simulator failure families, FinOpsBench execution, regulatory rules, and production authentication. Dashboard shows actual current demo state only and is not a complete product console yet.
