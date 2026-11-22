# Threat model (initial)

Trust boundaries: external provider payloads are untrusted; model output (when added) is untrusted; ground truth is simulator-only and must never enter evidence APIs/prompts. Key threats: prompt injection via metadata, forged evidence IDs, cross-incident access, duplicate recovery, stale approval, over-refund, concurrent mutation, model outage, secret leakage, and resource exhaustion.

Current mitigations: no network/SQL/shell tools or model integration; evidence IDs are sourced from incident data; simulated actions only; integer arithmetic and refund bounds; immutable journal records; deterministic simulation seed. Not yet addressed: auth/tenant enforcement, persistent uniqueness, request size/rate limits, transaction locks, approval roles, operational secret management.
