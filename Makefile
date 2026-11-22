setup:
	uv sync --extra dev
	cd apps/dashboard && npm ci
dev:
	uv run uvicorn ledgerlens.api:app --app-dir apps/api/src --reload
migrate:
	@echo "Persistence is not implemented in this phase"
seed:
	uv run python -m ledgerlens.demo
simulate:
	uv run python -m ledgerlens.demo
test:
	uv run pytest
	cd apps/dashboard && npm run test:e2e
lint:
	uv run ruff check apps/api/src tests
	cd apps/dashboard && npm run lint
typecheck:
	uv run python -m compileall -q apps/api/src
	cd apps/dashboard && npx tsc --noEmit
benchmark:
	uv run python benchmarks/scorecard.py --cases 50 --seed 73 --output-dir benchmarks/results
demo: simulate
