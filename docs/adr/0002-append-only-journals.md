# ADR 0002: Append-only journal postings

- Status: accepted
- Date: 2026-11-22

## Context
Financial incident review requires reproducible past state and a trail of corrections.

## Decision
Represent posted journals as immutable records in integer INR paise. Require debit/credit equality and idempotency keys. Correct posted records through compensating entries rather than edit/delete.

## Consequences
Audit history remains explainable, while posting idempotency and atomic storage still need durable database constraints in the next phase.
