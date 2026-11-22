import pytest
from ledgerlens.core import (
    Account,
    AccountType,
    DomainError,
    Ledger,
    Line,
    Payment,
    PaymentStatus,
    Side,
    detect_incidents,
    evidence_graph,
    generate_duplicate_posting,
    investigate,
    simulate_recovery,
)


def setup_ledger():
    ledger = Ledger()
    ledger.add_account(Account("a", AccountType.CLEARING))
    ledger.add_account(Account("b", AccountType.LIABILITY))
    return ledger


def test_balanced_immutable_and_idempotent():
    ledger = setup_ledger()
    xs = [Line("a", Side.DEBIT, 400), Line("b", Side.CREDIT, 400)]
    j = ledger.post("k", xs)
    assert ledger.post("k", xs) == j
    assert len(ledger.journals) == 1
    assert ledger.reverse(j.id, "r").reverses == j.id


def test_conflicting_idempotency_and_unbalanced_rejected():
    ledger = setup_ledger()
    ledger.post("k", [Line("a", Side.DEBIT, 4), Line("b", Side.CREDIT, 4)])
    with pytest.raises(DomainError):
        ledger.post("k", [Line("a", Side.DEBIT, 5), Line("b", Side.CREDIT, 5)])
    with pytest.raises(DomainError):
        ledger.post("bad", [Line("a", Side.DEBIT, 4), Line("b", Side.CREDIT, 3)])


def test_payment_transition_guard():
    p = Payment("p", 100)
    p.transition(PaymentStatus.AUTH_PENDING)
    p.transition(PaymentStatus.AUTHORIZED)
    with pytest.raises(DomainError):
        p.transition(PaymentStatus.REFUNDED)


def test_reproducible_investigation_and_recovery():
    s = generate_duplicate_posting(9)
    assert s == generate_duplicate_posting(9)
    ledger = setup_ledger()
    xs = [Line("a", Side.DEBIT, 100), Line("b", Side.CREDIT, 100)]
    ledger.post("capture:pay_demo_001:1", xs)
    ledger.post("capture:pay_demo_001:2", xs)
    i = detect_incidents(s, ledger)[0]
    g = evidence_graph(s, i)
    d = investigate(i, g)
    assert d["root_cause"] == "duplicate_internal_posting"
    assert d["observed_facts"][0]["evidence_ids"]
    report = simulate_recovery(ledger, ledger.journals[-1].id)
    assert report["requires_human_approval"]
    assert report["status"] == "verified_simulation_only"
    assert report["before"]["balances_minor"]["a"] == 200
    assert report["after"]["balances_minor"]["a"] == 100
    assert len(ledger.journals) == 2


def test_invalid_money_currency_and_reversal():
    ledger = setup_ledger()
    with pytest.raises(DomainError):
        ledger.post("x", [Line("a", Side.DEBIT, -1), Line("b", Side.CREDIT, -1)])
    with pytest.raises(DomainError):
        ledger.post("x", [Line("a", Side.DEBIT, 1, "USD"), Line("b", Side.CREDIT, 1, "USD")])
