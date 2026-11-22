# Progress

## Current checkpoint (2026-11-22)

Created the monorepo under `coding/projects/LedgerLens`; reviewed the reference `support-llm-3b` project; researched official payment, accounting, and RBI sources; documented findings and decisions.

### Implemented and verified

- Integer-cent USD double-entry journal with balancing, account/currency validation, immutable records, process-local idempotency conflict detection, and compensating entries.
- Payment transition guard and separate settlement status field.
- Append-only event dataclasses with occurrence/ingestion time and provenance fields.
- One seeded duplicate-posting scenario, deterministic detector, NetworkX evidence graph, and rule-based competing hypotheses with explicit uncertainty.
- Counterfactual reversal in a deep-copied ledger; test verifies corrected balances and unchanged source ledger.
- FastAPI health, incidents, evidence, deterministic investigation, recovery proposal/simulation/approval/execution, and audit endpoints. Sandbox approval token, stale-version rejection (covered by the API test), duplicate execution guard, and simulated-only financial effect. Evidence graph includes internal journal nodes; same-timestamp records are not ordered. State is process-local and resets on restart.
- Next.js operations page reads incident/evidence/diagnosis APIs, supports persisted light/dark themes, uses a custom SVG identity and locale-formatted USD, and explains the demo keyword gate.
- Added UTF-8/LF editor settings and replaced corrupted placeholder symbols.
- Added Playwright browser tests for overflow at 320/375/768/1280px, mobile table scrolling, rendered USD amounts, light theme colors, and the local keyword approval flow.
- Dockerfiles and compose configuration; compose config parses successfully.
- `uv.lock` and dashboard `package-lock.json`.

### Actual verification output

- `uv run pytest -q`: **7 passed** (one upstream Starlette deprecation warning).
- `uv run ruff check apps/api/src tests`: **All checks passed**.
- `python -m ledgerlens.demo`: completed and printed incident, evidence-linked diagnosis, and recovery simulation JSON.
- Dashboard `npm run build`: passed; `npm run lint`: passed; `npx tsc --noEmit`: passed; `npm audit`: **0 vulnerabilities**.
- Dashboard `npm run test:e2e`: **4 passed** in installed Microsoft Edge at 320px, 375px, 768px, and 1280px; assertions cover landing/dashboard overflow, internal table scrolling, USD formatting, theme colors, and keyword entry/approval flows.
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
- Refreshes overview, incidents, and audit data after recovery execution. Browser coverage checks chart presence, keyword display, themes, USD formatting, mobile table scroll, and no viewport overflow at 320/375/768/1280 pixels.
- Verification run: `python -m pytest -q` = 7 passed (one upstream Starlette deprecation warning); Ruff passed; dashboard ESLint passed; `npx tsc --noEmit` passed; Playwright = 3 passed. Existing local API and dashboard respond at `127.0.0.1:8000` and `127.0.0.1:3000`.
- Still unimplemented: durable persistence, real provider-backed agent, multiple simulator failure families, FinOpsBench execution, regulatory rules, and production authentication. Dashboard shows actual current demo state only and is not a complete product console yet.

### Follow-up: branded landing and USD demo (2026-11-22)

- Added a custom vector LedgerLens ledger-and-loupe mark, favicon, and a responsive public landing screen with workflow summary and workspace keyword panel.
- Added `POST /api/v1/auth/keyword`; the landing page checks the configured access keyword before loading the workspace and offers show/hide controls. Failed keyword submissions remain on the landing page with an accessible error. The API financial endpoints remain public, so this is an explanatory demo gate, not authentication or a security boundary.
- Changed the modeled and displayed demo currency from INR to USD integer cents after user direction. Updated core validation, display formatting, sample docs, and tests together. Indian regulatory sources are research-only and no India-specific obligations are enforced against this USD demo.
- Added workspace exit control and theme switching from the landing page.
- Verification for this follow-up: Python suite 8 passed, Ruff passed, dashboard lint and TypeScript passed, optimized Next build passed, and 4 Playwright tests passed, including invalid/correct/configurable keyword, landing responsiveness, USD formatting, and sandbox approval. Live demo at `http://127.0.0.1:3000`; API at `http://127.0.0.1:8000`.

### Follow-up: landing page visual and copy cleanup (2026-11-22)

- Replaced broad promotional copy with short descriptions of the actual sample workflow.
- Reworked the feature row into a three-stage diagram: read events, compare ledger, verify recovery. Raised landing headings, body text, form labels, and step labels; stacked the process for mobile.
- Browser tests assert the process diagram and minimum body text size as well as landing/dashboard overflow at 320/375/768/1280px.
- Verification: 8 Python tests, Ruff, dashboard lint/typecheck, and 4 Playwright tests passed. Inspected a local Edge screenshot at 1440x980.

### Follow-up: landing page research and visual revision (2026-11-22)

- Reviewed Nielsen Norman Group visual hierarchy guidance, Figma landing-page examples, and Stripe's numbered payment-flow explainer. Recorded the references and design decisions in `docs/LANDING_DESIGN.md`.
- Removed the secondary descriptor beneath the logo. Simplified the heading to "Payment records do not match," removed generic copy, and kept one visual three-step process beside the workspace keyword form.
- Enlarged process labels and simplified the steps to review events, compare the ledger, and test recovery. Browser coverage checks the visual, readable body text, and responsive widths.
