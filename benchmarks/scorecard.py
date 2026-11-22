"""Reproducible scorecard for the current deterministic duplicate-posting baseline."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from ledgerlens.core import (
    Account,
    AccountType,
    Line,
    Ledger,
    Side,
    detect_incidents,
    evidence_graph,
    generate_duplicate_posting,
    investigate,
    simulate_recovery,
)


METRIC_WEIGHTS = {
    "detector_balanced_accuracy": 0.20,
    "root_cause_accuracy": 0.20,
    "evidence_reference_validity": 0.20,
    "recovery_simulation_integrity": 0.20,
    "unsafe_reversal_rejection": 0.20,
}


def _new_ledger(scenario, *, duplicate_posting: bool) -> Ledger:
    ledger = Ledger()
    ledger.add_account(Account("processor_clearing", AccountType.CLEARING))
    ledger.add_account(Account("merchant_payable", AccountType.LIABILITY))
    amount = scenario.ground_truth["amount_minor"]
    lines = [
        Line("processor_clearing", Side.DEBIT, amount),
        Line("merchant_payable", Side.CREDIT, amount),
    ]
    posting_count = 2 if duplicate_posting else 1
    for sequence in range(1, posting_count + 1):
        ledger.post(f"capture:{scenario.ground_truth['payment_id']}:{sequence}", lines)
    return ledger


def _percent(numerator: int, denominator: int) -> float:
    return round(100.0 * numerator / denominator, 2) if denominator else 0.0


def run_scorecard(*, cases_per_class: int = 50, seed: int = 73) -> dict[str, Any]:
    """Score fault detection and safe handling on paired generated fault/control cases."""
    if cases_per_class < 1:
        raise ValueError("cases_per_class must be at least 1")

    tp = tn = root_cause_correct = 0
    citation_ids = valid_citation_ids = 0
    recovery_integrity_pass = unsafe_reversal_rejected = 0
    balance_checks = balance_checks_passed = 0

    for offset in range(cases_per_class):
        case_seed = seed + offset
        amount_minor = 100 + ((case_seed * 7919) % 500_000)
        scenario = generate_duplicate_posting(case_seed, amount_minor)

        # Fault case: two internal capture journals against one capture event.
        faulty_ledger = _new_ledger(scenario, duplicate_posting=True)
        fault_incidents = detect_incidents(scenario, faulty_ledger)
        if len(fault_incidents) == 1:
            tp += 1
            incident = fault_incidents[0]
            graph = evidence_graph(scenario, incident, faulty_ledger)
            diagnosis = investigate(incident, graph)
            root_cause_correct += diagnosis["root_cause"] == "duplicate_internal_posting"
            references = [
                evidence_id
                for fact in diagnosis["observed_facts"]
                for evidence_id in fact["evidence_ids"]
            ]
            citation_ids += len(references)
            valid_citation_ids += sum(evidence_id in graph for evidence_id in references)

            target = faulty_ledger.journals[-1]
            balances_before = {key: faulty_ledger.balance(key) for key in faulty_ledger.accounts}
            count_before = len(faulty_ledger.journals)
            recovery = simulate_recovery(faulty_ledger, target.id)
            balances_after = recovery.get("after", {}).get("balances_minor", {})
            expected = dict(balances_before)
            expected["processor_clearing"] -= amount_minor
            expected["merchant_payable"] -= amount_minor
            unchanged = (
                len(faulty_ledger.journals) == count_before
                and {key: faulty_ledger.balance(key) for key in faulty_ledger.accounts}
                == balances_before
            )
            recovery_integrity_pass += (
                recovery["status"] == "verified_simulation_only"
                and not recovery["violations"]
                and recovery["after"]["journal_count"] == count_before + 1
                and balances_after == expected
                and unchanged
            )

            # The simulator rejects a second compensation after one already exists.
            faulty_ledger.reverse(target.id, f"scorecard:compensate:{case_seed}")
            unsafe = simulate_recovery(faulty_ledger, target.id)
            unsafe_reversal_rejected += (
                unsafe["status"] == "rejected"
                and "journal_already_compensated" in unsafe["violations"]
            )
        else:
            # A missed fault counts as both a detector and downstream case failure.
            citation_ids += 0

        # Control case: the same duplicate-delivery observations, one idempotent post.
        healthy_ledger = _new_ledger(scenario, duplicate_posting=False)
        healthy_incidents = detect_incidents(scenario, healthy_ledger)
        tn += not healthy_incidents

        for ledger in (faulty_ledger, healthy_ledger):
            for journal in ledger.journals:
                debits = sum(line.amount_minor for line in journal.lines if line.side == Side.DEBIT)
                credits = sum(line.amount_minor for line in journal.lines if line.side == Side.CREDIT)
                balance_checks += 1
                balance_checks_passed += debits == credits and all(
                    line.currency == "USD" and isinstance(line.amount_minor, int)
                    for line in journal.lines
                )

    total_cases = cases_per_class * 2
    detector_score = _percent(tp + tn, total_cases)
    metrics = {
        "detector_balanced_accuracy": detector_score,
        "root_cause_accuracy": _percent(root_cause_correct, cases_per_class),
        "evidence_reference_validity": _percent(valid_citation_ids, citation_ids),
        "recovery_simulation_integrity": _percent(recovery_integrity_pass, cases_per_class),
        "unsafe_reversal_rejection": _percent(unsafe_reversal_rejected, cases_per_class),
    }
    score = round(
        sum(metrics[name] * weight for name, weight in METRIC_WEIGHTS.items()), 2
    )

    return {
        "scorecard": "LedgerLens Deterministic Baseline Score",
        "scorecard_version": 1,
        "headline_score_percent": score,
        "composite_definition": "Arithmetic mean of the five listed percentage metrics; equal 20% weights.",
        "metrics": metrics,
        "counts": {
            "cases_total": total_cases,
            "fault_cases": cases_per_class,
            "healthy_control_cases": cases_per_class,
            "true_positive": tp,
            "true_negative": tn,
            "fault_root_cause_correct": root_cause_correct,
            "valid_evidence_references": valid_citation_ids,
            "evidence_references_total": citation_ids,
            "recovery_simulation_integrity_pass": recovery_integrity_pass,
            "unsafe_reversal_rejected": unsafe_reversal_rejected,
            "journal_balance_checks_passed": balance_checks_passed,
            "journal_balance_checks_total": balance_checks,
        },
        "generation": {
            "source": "LedgerLens seeded duplicate-posting simulator",
            "seed_start": seed,
            "cases_per_class": cases_per_class,
            "amount_minor_formula": "100 + ((seed * 7919) mod 500000)",
            "currency": "USD",
            "fault_family_count": 1,
        },
        "limitations": [
            "This is a deterministic rules baseline, not an LLM evaluation.",
            "The cases vary seeds and amounts but cover only duplicate internal capture posting.",
            "Evidence-reference validity checks that cited IDs exist; it does not judge semantic support.",
            "The score is a project-defined smoke score, not a calibrated or industry-standard benchmark.",
        ],
    }


def write_results(result: dict[str, Any], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "scorecard.json").write_text(
        json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    with (output_dir / "scorecard.csv").open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["metric", "score_percent", "weight"])
        for name, score in result["metrics"].items():
            writer.writerow([name, score, METRIC_WEIGHTS[name]])
        writer.writerow(["headline_score_percent", result["headline_score_percent"], 1.0])

    metric_lines = "\n".join(
        f"| `{name}` | {value:.2f}% | 20% |" for name, value in result["metrics"].items()
    )
    report = f"""# LedgerLens Deterministic Baseline Score

**Composite score: {result['headline_score_percent']:.2f}%**  
Cases: {result['counts']['cases_total']} ({result['counts']['fault_cases']} fault, {result['counts']['healthy_control_cases']} control).  
Seed start: {result['generation']['seed_start']}. Currency: USD.

| Metric | Result | Weight |
| --- | ---: | ---: |
{metric_lines}

The composite is the equal-weight arithmetic mean of these five metrics. This is a project-defined smoke score for the deterministic rules baseline, not a calibrated benchmark or an AI-agent result. Cases vary seeds and amount values but exercise only one fault family: duplicate internal capture posting. See `scorecard.json` for exact counts and limitations.

Reproduce with `make benchmark` or `uv run python benchmarks/scorecard.py --cases 50 --seed 73 --output-dir benchmarks/results`.
"""
    (output_dir / "scorecard.md").write_text(report, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=int, default=50, help="fault and control cases per class")
    parser.add_argument("--seed", type=int, default=73)
    parser.add_argument("--output-dir", type=Path, default=Path("benchmarks/results"))
    args = parser.parse_args()
    result = run_scorecard(cases_per_class=args.cases, seed=args.seed)
    write_results(result, args.output_dir)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
