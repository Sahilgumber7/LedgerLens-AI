# Demo

Install: `uv sync --extra dev` and `cd apps/dashboard && npm ci`.

- Deterministic CLI output: `uv run python -m ledgerlens.demo`.
- API: `uv run uvicorn ledgerlens.api:app --app-dir apps/api/src --reload`.
- Dashboard: in a second terminal, `cd apps/dashboard && npm run dev`; browse `http://localhost:3000`.
- Container config: `docker compose up --build` (Docker engine required), UI `:3000`, API `:8000`.

The UI shows the generated duplicate-posting incident, graph evidence, and deterministic rule diagnosis. The recovery studio simulates a compensating reversal, then requires a local sandbox token before applying a compensating journal in the in-memory ledger. Compose uses `local-demo-approval` by default; override `LEDGERLENS_APPROVAL_TOKEN` for local use. The token is demonstration-only, not production authorization. API state resets on process restart. No external payment integrations or real money movement exist.
