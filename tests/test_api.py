from fastapi.testclient import TestClient
from ledgerlens.api import app, ledger
from ledgerlens.core import Line, Side


def test_health_and_incident_evidence_api():
    c = TestClient(app)
    assert c.get("/api/v1/health").json()["mode"] == "simulation"
    assert c.post("/api/v1/auth/keyword", json={"keyword": "wrong"}).status_code == 403
    assert c.post("/api/v1/auth/keyword", json={"keyword": "local-demo-approval"}).json()["status"] == "accepted"
    overview = c.get("/api/v1/overview").json()
    assert overview["data_origin"] == "generated simulation"
    assert overview["open_incidents"] == 1
    assert overview["suspected_exposure_minor"] == 12500
    assert overview["verified_loss_minor"] is None
    assert overview["event_source_counts"]["gateway"] == 2
    items = c.get("/api/v1/incidents").json()["items"]
    assert len(items) == 1 and items[0]["exposure_minor"] == 12500
    graph = c.get("/api/v1/incidents/inc_pay_demo_001/evidence")
    assert graph.status_code == 200 and len(graph.json()["nodes"]) >= 4
    diagnosis = c.post("/api/v1/incidents/inc_pay_demo_001/investigate")
    assert (
        diagnosis.json()["engine"] == "deterministic_rules_v1"
        and diagnosis.json()["observed_facts"]
    )
    assert c.get("/api/v1/incidents/unknown/evidence").status_code == 404


def test_workspace_keyword_can_be_configured(monkeypatch):
    c = TestClient(app)
    monkeypatch.setenv("LEDGERLENS_ACCESS_KEYWORD", "test-workspace-key")
    assert c.post("/api/v1/auth/keyword", json={"keyword": "test-workspace-key"}).status_code == 200
    assert c.post("/api/v1/auth/keyword", json={"keyword": "local-demo-approval"}).status_code == 403


def test_approval_gated_sandbox_recovery(monkeypatch):
    c = TestClient(app)
    monkeypatch.delenv("LEDGERLENS_APPROVAL_TOKEN", raising=False)
    original_count = len(ledger.journals)
    target = ledger.journals[-1].id
    created = c.post(
        "/api/v1/recoveries", json={"incident_id": "inc_pay_demo_001", "journal_id": target}
    )
    assert created.status_code == 201
    rid = created.json()["id"]
    assert c.post(f"/api/v1/recoveries/{rid}/execute").status_code == 409
    sim = c.post(f"/api/v1/recoveries/{rid}/simulate")
    assert sim.status_code == 200 and sim.json()["status"] == "verified_simulation_only"
    assert len(ledger.journals) == original_count
    assert (
        c.post(
            f"/api/v1/recoveries/{rid}/approve", headers={"X-Approval-Token": "wrong"}
        ).status_code
        == 403
    )
    assert (
        c.post(
            f"/api/v1/recoveries/{rid}/approve", headers={"X-Approval-Token": "local-demo-approval"}
        ).status_code
        == 200
    )
    # A concurrent posting invalidates the prior approval; both simulation and approval must repeat.
    ledger.post(
        "concurrent:test",
        [Line("processor_clearing", Side.DEBIT, 100), Line("merchant_payable", Side.CREDIT, 100)],
    )
    assert c.post(f"/api/v1/recoveries/{rid}/execute").status_code == 409
    assert c.post(f"/api/v1/recoveries/{rid}/simulate").status_code == 200
    assert (
        c.post(
            f"/api/v1/recoveries/{rid}/approve", headers={"X-Approval-Token": "local-demo-approval"}
        ).status_code
        == 200
    )
    result = c.post(f"/api/v1/recoveries/{rid}/execute")
    assert result.status_code == 200 and result.json()["status"] == "executed_in_sandbox"
    assert len(ledger.journals) == original_count + 2
    assert c.get("/api/v1/incidents").json()["items"] == []
    assert c.get("/api/v1/overview").json()["open_incidents"] == 0
    assert c.post(f"/api/v1/recoveries/{rid}/execute").json()["status"] == "already_executed"
    assert [x["event"] for x in c.get("/api/v1/audit").json()["items"]][-3:] == [
        "recovery_simulated",
        "recovery_approved",
        "recovery_executed",
    ]
