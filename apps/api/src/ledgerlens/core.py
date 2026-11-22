"""Deterministic financial and incident reconstruction primitives."""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
import json
from typing import Any
import networkx as nx


def now() -> datetime:
    return datetime.now(timezone.utc)


class DomainError(ValueError):
    pass


class AccountType(str, Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    REVENUE = "revenue"
    EXPENSE = "expense"
    CLEARING = "clearing"


class Side(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class PaymentStatus(str, Enum):
    INITIATED = "initiated"
    AUTH_PENDING = "authorization_pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    EXPIRED = "expired"
    REVERSED = "reversed"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUNDED = "refunded"


TRANSITIONS = {
    PaymentStatus.INITIATED: {PaymentStatus.AUTH_PENDING, PaymentStatus.FAILED},
    PaymentStatus.AUTH_PENDING: {
        PaymentStatus.AUTHORIZED,
        PaymentStatus.FAILED,
        PaymentStatus.EXPIRED,
    },
    PaymentStatus.AUTHORIZED: {
        PaymentStatus.CAPTURED,
        PaymentStatus.REVERSED,
        PaymentStatus.EXPIRED,
    },
    PaymentStatus.CAPTURED: {
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.REFUNDED,
        PaymentStatus.REVERSED,
    },
    PaymentStatus.PARTIALLY_REFUNDED: {
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.REFUNDED,
        PaymentStatus.REVERSED,
    },
}


@dataclass(frozen=True)
class Account:
    id: str
    kind: AccountType
    currency: str = "INR"


@dataclass(frozen=True)
class Line:
    account_id: str
    side: Side
    amount_minor: int
    currency: str = "INR"


@dataclass(frozen=True)
class Journal:
    id: str
    idempotency_key: str
    lines: tuple[Line, ...]
    created_at: datetime = field(default_factory=now)
    reverses: str | None = None


@dataclass(frozen=True)
class Event:
    id: str
    payment_id: str
    event_type: str
    source: str
    occurred_at: datetime
    ingested_at: datetime
    sequence: int | None
    payload: dict[str, Any]
    provenance: str = "simulator"
    schema_version: int = 1


@dataclass
class Payment:
    id: str
    amount_minor: int
    status: PaymentStatus = PaymentStatus.INITIATED
    settlement_status: str = "unsettled"
    refunded_minor: int = 0
    version: int = 0

    def transition(self, target: PaymentStatus) -> None:
        if target not in TRANSITIONS.get(self.status, set()):
            raise DomainError(f"invalid transition {self.status.value} -> {target.value}")
        self.status = target
        self.version += 1


class Ledger:
    def __init__(self):
        self.accounts: dict[str, Account] = {}
        self.journals: list[Journal] = []
        self.keys: dict[str, str] = {}

    def add_account(self, a: Account):
        if a.currency != "INR":
            raise DomainError("only INR is enabled")
        if a.id in self.accounts:
            raise DomainError("account already exists")
        self.accounts[a.id] = a

    def post(self, key: str, lines: list[Line], *, reverses: str | None = None) -> Journal:
        fingerprint = sha256(
            json.dumps(
                [(x.account_id, x.side.value, x.amount_minor, x.currency) for x in lines],
                sort_keys=True,
            ).encode()
        ).hexdigest()
        if key in self.keys:
            if self.keys[key] != fingerprint:
                raise DomainError("idempotency key reused with different request")
            return next(j for j in self.journals if j.id == self.keys[key + ":journal"])
        if len(lines) < 2:
            raise DomainError("journal needs at least two lines")
        for x in lines:
            if x.amount_minor <= 0 or not isinstance(x.amount_minor, int):
                raise DomainError("amount must be a positive integer minor-unit value")
            if (
                x.currency != "INR"
                or x.account_id not in self.accounts
                or self.accounts[x.account_id].currency != x.currency
            ):
                raise DomainError("unknown account or currency mismatch")
        if sum(x.amount_minor for x in lines if x.side == Side.DEBIT) != sum(
            x.amount_minor for x in lines if x.side == Side.CREDIT
        ):
            raise DomainError("journal is unbalanced")
        jid = f"jrnl_{len(self.journals) + 1:06d}"
        j = Journal(jid, key, tuple(lines), reverses=reverses)
        self.journals.append(j)
        self.keys[key] = fingerprint
        self.keys[key + ":journal"] = jid
        return j

    def reverse(self, original_id: str, key: str) -> Journal:
        original = next((j for j in self.journals if j.id == original_id), None)
        if original is None:
            raise DomainError("original journal not found")
        lines = [
            Line(
                x.account_id,
                Side.CREDIT if x.side == Side.DEBIT else Side.DEBIT,
                x.amount_minor,
                x.currency,
            )
            for x in original.lines
        ]
        return self.post(key, lines, reverses=original_id)

    def balance(self, account_id: str) -> int:
        a = self.accounts[account_id]
        total = 0
        for j in self.journals:
            for line in j.lines:
                if line.account_id == account_id:
                    total += (
                        (1 if line.side == Side.DEBIT else -1)
                        * line.amount_minor
                        * (
                            1
                            if a.kind
                            in (AccountType.ASSET, AccountType.EXPENSE, AccountType.CLEARING)
                            else -1
                        )
                    )
        return total


@dataclass
class Scenario:
    seed: int
    events: list[Event]
    ground_truth: dict[str, Any]


def generate_duplicate_posting(seed: int = 73, amount_minor: int = 12500) -> Scenario:
    t = datetime(2026, 1, 1, 12, tzinfo=timezone.utc)
    p = "pay_demo_001"
    ev = [
        Event(
            "evt_order_1", p, "order.created", "merchant", t, t, 1, {"amount_minor": amount_minor}
        ),
        Event(
            "evt_auth_1",
            p,
            "payment.authorized",
            "gateway",
            t,
            t,
            2,
            {"amount_minor": amount_minor},
        ),
        Event(
            "evt_capture_1",
            p,
            "payment.captured",
            "gateway",
            t,
            t,
            3,
            {"amount_minor": amount_minor},
        ),
        Event(
            "evt_webhook_1",
            p,
            "webhook.delivery",
            "webhook",
            t,
            t,
            1,
            {"provider_event_id": "prov_abc", "duplicate": True},
        ),
    ]
    return Scenario(
        seed,
        ev,
        {"fault": "duplicate_ledger_posting", "payment_id": p, "amount_minor": amount_minor},
    )


@dataclass
class Incident:
    id: str
    payment_id: str
    severity: str
    exposure_minor: int
    evidence_ids: list[str]
    status: str = "open"
    journal_ids: list[str] = field(default_factory=list)


def detect_incidents(s: Scenario, ledger: Ledger) -> list[Incident]:
    out = []
    reversed_ids = {journal.reverses for journal in ledger.journals if journal.reverses}
    for p in {e.payment_id for e in s.events}:
        cap = sum(e.event_type == "payment.captured" for e in s.events if e.payment_id == p)
        related = [
            j
            for j in ledger.journals
            if j.idempotency_key.startswith("capture:" + p) and j.id not in reversed_ids
        ]
        posted = len(related)
        if posted > cap:
            out.append(
                Incident(
                    "inc_" + p,
                    p,
                    "high",
                    related[-1].lines[0].amount_minor,
                    [e.id for e in s.events if e.payment_id == p],
                    journal_ids=[j.id for j in related],
                )
            )
    return out


def evidence_graph(
    s: Scenario, incident: Incident, ledger: Ledger | None = None
) -> nx.MultiDiGraph:
    g = nx.MultiDiGraph()
    g.add_node(incident.id, type="incident", observed=True)
    for e in s.events:
        g.add_node(
            e.id,
            type="event",
            event_type=e.event_type,
            source=e.source,
            occurred_at=e.occurred_at.isoformat(),
            ingested_at=e.ingested_at.isoformat(),
            payload=e.payload,
            provenance=e.provenance,
        )
        g.add_edge(
            incident.id,
            e.id,
            relation="references",
            provenance="detector evidence set",
            inferred=False,
        )
    if ledger is not None:
        for journal in ledger.journals:
            if journal.id not in incident.journal_ids:
                continue
            g.add_node(
                journal.id,
                type="ledger_entry",
                idempotency_key=journal.idempotency_key,
                created_at=journal.created_at.isoformat(),
                lines=[
                    {
                        "account_id": line.account_id,
                        "side": line.side.value,
                        "amount_minor": line.amount_minor,
                        "currency": line.currency,
                    }
                    for line in journal.lines
                ],
                provenance="internal immutable journal",
            )
            g.add_edge(
                incident.id,
                journal.id,
                relation="references",
                provenance="detector posting-count comparison",
                inferred=False,
            )
    for a in s.events:
        for b in s.events:
            if a.occurred_at < b.occurred_at:
                g.add_edge(
                    a.id,
                    b.id,
                    relation="observed_before",
                    provenance="reported occurrence timestamps; not causality",
                    inferred=False,
                )
    return g


def investigate(incident: Incident, graph: nx.MultiDiGraph) -> dict[str, Any]:
    refs = sorted(
        n for n, d in graph.nodes(data=True) if d.get("type") in {"event", "ledger_entry"}
    )
    return {
        "incident_id": incident.id,
        "summary": "Internal capture postings exceed observed capture count.",
        "observed_facts": [
            {
                "claim": "The detector found more internal capture postings than capture observations.",
                "evidence_ids": refs,
            }
        ],
        "hypotheses": [
            {
                "classification": "duplicate_internal_posting",
                "supports": refs,
                "contradicts": [],
                "status": "leading",
            },
            {
                "classification": "missing_provider_capture_observation",
                "supports": [],
                "contradicts": [],
                "status": "unresolved",
            },
        ],
        "root_cause": "duplicate_internal_posting",
        "uncertainty": "Moderate: event evidence identifies a posting count mismatch but does not prove the upstream delivery mechanism.",
        "proposed_action": "simulate_compensating_reversal",
        "abstain": False,
    }


def simulate_recovery(ledger: Ledger, journal_id: str) -> dict[str, Any]:
    import copy

    j = next((x for x in ledger.journals if x.id == journal_id), None)
    if not j:
        return {"status": "rejected", "violations": ["journal_not_found"]}
    if any(x.reverses == journal_id for x in ledger.journals):
        return {"status": "rejected", "violations": ["journal_already_compensated"]}
    before = {a: ledger.balance(a) for a in ledger.accounts}
    snapshot = copy.deepcopy(ledger)
    try:
        reversal = snapshot.reverse(journal_id, "simulation:reverse:" + journal_id)
    except DomainError as exc:
        return {"status": "rejected", "violations": [str(exc)]}
    after = {a: snapshot.balance(a) for a in snapshot.accounts}
    # A reversal is itself balanced and changes each affected account by the exact opposite amount.
    expected = {a: before[a] for a in before}
    for line in j.lines:
        sign = 1 if line.side == Side.DEBIT else -1
        normal = (
            1
            if ledger.accounts[line.account_id].kind
            in (AccountType.ASSET, AccountType.EXPENSE, AccountType.CLEARING)
            else -1
        )
        expected[line.account_id] -= sign * line.amount_minor * normal
    violations = []
    if any(
        sum(x.amount_minor for x in reversal.lines if x.side == side)
        != sum(x.amount_minor for x in reversal.lines if x.side != side)
        for side in (Side.DEBIT, Side.CREDIT)
    ):
        violations.append("unbalanced_compensating_entry")
    if any(after[a] != expected[a] for a in expected):
        violations.append("counterfactual_balance_mismatch")
    return {
        "status": "rejected" if violations else "verified_simulation_only",
        "violations": violations,
        "state_version": len(ledger.journals),
        "before": {"journal_count": len(ledger.journals), "balances_minor": before},
        "after": {"journal_count": len(snapshot.journals), "balances_minor": after},
        "action": {
            "type": "compensating_reversal",
            "reverses": journal_id,
            "simulated_journal_id": reversal.id,
        },
        "requires_human_approval": True,
    }
