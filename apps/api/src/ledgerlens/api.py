"""Simulation-only API. State is process-local and is reset when this process restarts."""

from __future__ import annotations
import os
import threading
from uuid import uuid4
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .core import (
    Account,
    AccountType,
    DomainError,
    Ledger,
    Line,
    Side,
    detect_incidents,
    evidence_graph,
    generate_duplicate_posting,
    investigate,
    simulate_recovery,
)

app = FastAPI(
    title="LedgerLens AI API",
    version="0.1.0",
    description="Simulation-only financial incident reconstruction",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
lock = threading.RLock()


def _new_state():
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
    incident = detect_incidents(scenario, ledger)[0]
    return scenario, ledger, incident


scenario, ledger, incident = _new_state()
recoveries: dict[str, dict] = {}
audit: list[dict] = []


class RecoveryRequest(BaseModel):
    incident_id: str
    journal_id: str


@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "mode": "simulation",
        "llm": "not_configured",
        "persistence": "process-local",
    }


@app.get("/api/v1/incidents")
def incidents():
    with lock:
        current = detect_incidents(scenario, ledger)
        return {
            "data": "generated simulation",
            "items": [{**item.__dict__, "journal_ids": item.journal_ids} for item in current],
        }


@app.get("/api/v1/overview")
def overview():
    """Aggregate operational metrics from the current in-memory simulation state."""
    with lock:
        current = detect_incidents(scenario, ledger)
        sources: dict[str, int] = {}
        event_types: dict[str, int] = {}
        for event in scenario.events:
            sources[event.source] = sources.get(event.source, 0) + 1
            event_types[event.event_type] = event_types.get(event.event_type, 0) + 1
        severities: dict[str, int] = {}
        for item in current:
            severities[item.severity] = severities.get(item.severity, 0) + 1
        return {
            "data_origin": "generated simulation",
            "open_incidents": len(current),
            "affected_payments": len({item.payment_id for item in current}),
            "suspected_exposure_minor": sum(item.exposure_minor for item in current),
            "verified_loss_minor": None,
            "severity_counts": severities,
            "event_source_counts": sources,
            "event_type_counts": event_types,
            "event_count": len(scenario.events),
            "journal_count": len(ledger.journals),
            "ledger_version": len(ledger.journals),
            "account_balances_minor": {
                account_id: ledger.balance(account_id) for account_id in ledger.accounts
            },
        }


@app.get("/api/v1/incidents/{incident_id}/evidence")
def evidence(incident_id: str):
    if incident_id != incident.id:
        raise HTTPException(404, "incident not found")
    graph = evidence_graph(scenario, incident, ledger)
    return {
        "nodes": [{"id": n, **d} for n, d in graph.nodes(data=True)],
        "edges": [{"source": a, "target": b, **d} for a, b, d in graph.edges(data=True)],
    }


@app.post("/api/v1/incidents/{incident_id}/investigate")
def investigate_incident(incident_id: str):
    if incident_id != incident.id:
        raise HTTPException(404, "incident not found")
    graph = evidence_graph(scenario, incident, ledger)
    return {"engine": "deterministic_rules_v1", **investigate(incident, graph)}


@app.post("/api/v1/recoveries", status_code=201)
def create_recovery(request: RecoveryRequest):
    with lock:
        if request.incident_id != incident.id:
            raise HTTPException(404, "incident not found")
        if request.journal_id not in {j.id for j in ledger.journals}:
            raise HTTPException(404, "journal not found")
        rid = "rec_" + uuid4().hex[:12]
        recoveries[rid] = {
            "id": rid,
            "incident_id": request.incident_id,
            "journal_id": request.journal_id,
            "status": "proposed",
            "version": None,
            "simulation": None,
            "approval": None,
            "executed_journal_id": None,
        }
        audit.append(
            {"event": "recovery_proposed", "recovery_id": rid, "journal_id": request.journal_id}
        )
        return recoveries[rid]


@app.post("/api/v1/recoveries/{recovery_id}/simulate")
def simulate(recovery_id: str):
    with lock:
        r = recoveries.get(recovery_id)
        if not r:
            raise HTTPException(404, "recovery not found")
        result = simulate_recovery(ledger, r["journal_id"])
        r["simulation"] = result
        if result["status"] != "verified_simulation_only":
            raise HTTPException(422, detail=result)
        r["version"] = result["state_version"]
        r["status"] = "simulated"
        audit.append(
            {
                "event": "recovery_simulated",
                "recovery_id": recovery_id,
                "state_version": r["version"],
            }
        )
        return result


@app.post("/api/v1/recoveries/{recovery_id}/approve")
def approve(recovery_id: str, x_approval_token: str | None = Header(default=None)):
    with lock:
        r = recoveries.get(recovery_id)
        if not r:
            raise HTTPException(404, "recovery not found")
        expected = os.getenv("LEDGERLENS_APPROVAL_TOKEN") or (
            "local-demo-approval"
            if os.getenv("LEDGERLENS_MODE", "simulation") == "simulation"
            else None
        )
        if not expected:
            raise HTTPException(
                503, "sandbox approval is disabled; configure LEDGERLENS_APPROVAL_TOKEN"
            )
        if x_approval_token != expected:
            raise HTTPException(403, "approval authorization failed")
        if r["status"] != "simulated" or r["simulation"] is None:
            raise HTTPException(409, "a verified simulation is required before approval")
        if r["version"] != len(ledger.journals):
            raise HTTPException(409, "ledger state changed; rerun simulation")
        r["status"] = "approved"
        r["approval"] = {"actor": "local_human_approver", "state_version": r["version"]}
        audit.append(
            {
                "event": "recovery_approved",
                "recovery_id": recovery_id,
                "state_version": r["version"],
            }
        )
        return r


@app.post("/api/v1/recoveries/{recovery_id}/execute")
def execute(recovery_id: str):
    with lock:
        r = recoveries.get(recovery_id)
        if not r:
            raise HTTPException(404, "recovery not found")
        if r["status"] == "executed":
            return {"status": "already_executed", "journal_id": r["executed_journal_id"]}
        if r["status"] != "approved":
            raise HTTPException(409, "human approval is required")
        if r["version"] != len(ledger.journals):
            r["status"] = "stale"
            raise HTTPException(
                409, "ledger state changed after approval; new simulation and approval required"
            )
        try:
            posted = ledger.reverse(r["journal_id"], "execute:" + recovery_id)
        except DomainError as exc:
            raise HTTPException(409, str(exc)) from exc
        r["status"] = "executed"
        r["executed_journal_id"] = posted.id
        audit.append(
            {
                "event": "recovery_executed",
                "recovery_id": recovery_id,
                "journal_id": posted.id,
                "state_version": len(ledger.journals),
            }
        )
        return {
            "status": "executed_in_sandbox",
            "journal_id": posted.id,
            "ledger_version": len(ledger.journals),
        }


@app.get("/api/v1/audit")
def get_audit():
    with lock:
        return {"items": list(audit)}
