# Demo

Install: `uv sync --extra dev` and `cd apps/dashboard && npm ci`.

- Deterministic CLI output: `uv run python -m ledgerlens.demo`.
- API: `uv run uvicorn ledgerlens.api:app --app-dir apps/api/src --reload`.
- Dashboard: in a second terminal, `cd apps/dashboard && npm run dev`; browse `http://localhost:3000`.
- Container config: `docker compose up --build` (Docker engine required), UI `:3000`, API `:8000`.

The landing page shows the LedgerLens vector mark and asks for a keyword before it reveals the USD operations console. The generated dashboard shows a duplicate-posting incident, graph evidence, and deterministic rule diagnosis. The recovery studio simulates a compensating reversal, then requires a local sandbox token before applying a compensating journal in the in-memory ledger. Workspace entry accepts `local-demo-approval` by default; override it with `LEDGERLENS_ACCESS_KEYWORD`. Recovery approval uses `LEDGERLENS_APPROVAL_TOKEN`. This client-side workspace gate does not secure API routes and is not production authentication. API state resets on process restart. No external payment integrations or real money movement exist.
