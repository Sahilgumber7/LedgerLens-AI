# Architecture

Current implementation is a modular monolith slice: deterministic core in `apps/api/src/ledgerlens/core.py`; API in `api.py`; deterministic demo in `demo.py`; test-only generated scenarios. Money/state/evidence are ordinary Python and Pydantic schemas. No LLM call exists yet. An eventual provider adapter must propose tool calls only, bounded by strict typed schemas; verification remains deterministic.

```text
seeded simulator -> append-only observations -> detector -> incident
                                         |                 |
                                   journal core      evidence graph
                                                            |
                                              investigator (currently rules)
                                                            |
                                            recovery simulation + invariants
```

External bank reports are evidence, not internal cash assets. Settlement has its own status. The current process-local implementation is a development slice, not distributed production infrastructure.
