# Architecture decisions

1. **Deterministic core before LLM.** Money and authorization cannot be delegated to a model. Tool caller is planned; current investigator is deterministic and clearly labeled.
2. **Integer paise, INR v1.** Avoid floating point; currencies are explicit even though only INR is enabled.
3. **Immutable postings and compensation.** A correction adds a reversal/compensating transaction, never edits history.
4. **Independent payment and settlement state.** A payment capture observation does not assert settlement.
5. **Evidence distinguishes observed and inferred.** Correlation is not causal proof; graph edges carry provenance.
6. **SQLite-first local slice, PostgreSQL target.** Keep local demo runnable; transactional persistence and migrations remain a next milestone.
7. **Bounded modular monolith.** Avoid framework-driven agent loops and microservices until measured need.
8. **Simulation only.** No integration capable of moving real funds.
