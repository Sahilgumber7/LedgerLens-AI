import json
from .core import (
    Account,
    AccountType,
    Ledger,
    Line,
    Side,
    detect_incidents,
    evidence_graph,
    generate_duplicate_posting,
    investigate,
    simulate_recovery,
)


def run():
    scenario = generate_duplicate_posting()
    ledger = Ledger()
    ledger.add_account(Account("processor_clearing", AccountType.CLEARING))
    ledger.add_account(Account("merchant_payable", AccountType.LIABILITY))
    lines = [
        Line("processor_clearing", Side.DEBIT, 12500),
        Line("merchant_payable", Side.CREDIT, 12500),
    ]
    ledger.post("capture:pay_demo_001:1", lines)
    ledger.post("capture:pay_demo_001:2", lines)
    incidents = detect_incidents(scenario, ledger)
    i = incidents[0]
    graph = evidence_graph(scenario, i)
    result = investigate(i, graph)
    recovery = simulate_recovery(ledger, ledger.journals[-1].id)
    print(
        json.dumps(
            {
                "data": "generated simulation",
                "incident": i.__dict__,
                "diagnosis": result,
                "recovery_simulation": recovery,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    run()
