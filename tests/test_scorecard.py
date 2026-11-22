from benchmarks.scorecard import run_scorecard
import pytest


def test_scorecard_is_reproducible_and_reports_scope():
    first = run_scorecard(cases_per_class=3, seed=17)
    second = run_scorecard(cases_per_class=3, seed=17)

    assert first == second
    assert first["counts"]["cases_total"] == 6
    assert first["headline_score_percent"] == 100.0
    assert first["generation"]["fault_family_count"] == 1
    assert any("not an LLM evaluation" in item for item in first["limitations"])


def test_scorecard_rejects_empty_class():
    with pytest.raises(ValueError, match="cases_per_class must be at least 1"):
        run_scorecard(cases_per_class=0)
