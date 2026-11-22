# Limitations

This is an early vertical slice, not a production financial platform. The API ledger, recovery proposals, and audit trail are process-local and reset on restart; idempotency is not durable, and cross-process concurrency is unsafe. SQLAlchemy/Alembic persistence, tenant authentication, production-grade approval identity, SSE, complete operations pages, FinOpsBench, and CI are absent. The landing-page keyword gates only the frontend; API routes are not authenticated. Sandbox approval uses one configured shared token and is unsuitable for shared or production environments. The investigator is deterministic rules, not an LLM. USD is the sole modeled currency in this demo.

Simulation covers one duplicate-ledger-posting incident only. Z3 is not used; current invariant checks are direct Python. Hypothesis is in the development environment but property-based tests have not been added. SimPy and executable RBI rules are not implemented. Docker Compose syntax is verified but image builds/runtime were not verified because Docker Desktop was unavailable. No production compliance, AI accuracy, or benchmark claims are made.


The local keyword is a shared demo secret with a known default. It only gates a simulated correction and must not be used as real authentication. Browser layout tests use Microsoft Edge already installed on the development machine; Playwright browser download could not complete because the system drive ran out of free space.
