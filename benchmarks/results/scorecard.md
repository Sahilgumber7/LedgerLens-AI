# LedgerLens Deterministic Baseline Score

**Composite score: 100.00%**  
Cases: 100 (50 fault, 50 control).  
Seed start: 73. Currency: USD.

| Metric | Result | Weight |
| --- | ---: | ---: |
| `detector_balanced_accuracy` | 100.00% | 20% |
| `root_cause_accuracy` | 100.00% | 20% |
| `evidence_reference_validity` | 100.00% | 20% |
| `recovery_simulation_integrity` | 100.00% | 20% |
| `unsafe_reversal_rejection` | 100.00% | 20% |

The composite is the equal-weight arithmetic mean of these five metrics. This is a project-defined smoke score for the deterministic rules baseline, not a calibrated benchmark or an AI-agent result. Cases vary seeds and amount values but exercise only one fault family: duplicate internal capture posting. See `scorecard.json` for exact counts and limitations.

Reproduce with `make benchmark` or `uv run python benchmarks/scorecard.py --cases 50 --seed 73 --output-dir benchmarks/results`.
