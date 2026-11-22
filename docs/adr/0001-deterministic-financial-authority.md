# ADR 0001: Deterministic financial authority

- Status: accepted
- Date: 2026-11-22

## Context
An LLM can help retrieve and compare evidence but cannot be trusted to calculate money, assert provider state, or authorize a correction.

## Decision
Accounting, transitions, discrepancy detection, and recovery invariants remain deterministic code. Any future model receives typed, bounded, read-only investigation tools and may only propose a diagnosis/action. Human approval plus state-version revalidation will be required for execution.

## Consequences
The initial investigator is rules-based and is explicitly not represented as AI. It is easier to test and replay. A future model can be swapped without changing the source of financial truth.
