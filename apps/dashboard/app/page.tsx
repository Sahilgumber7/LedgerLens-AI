"use client";

import { useEffect, useState } from "react";

type Incident = {
  id: string;
  payment_id: string;
  severity: string;
  exposure_minor: number;
  evidence_ids: string[];
  journal_ids: string[];
  status: string;
};
type Diagnosis = {
  engine: string;
  root_cause: string;
  summary: string;
  uncertainty: string;
  observed_facts: { claim: string; evidence_ids: string[] }[];
};
type Graph = {
  nodes: { id: string; type: string; event_type?: string; source?: string }[];
  edges: { source: string; target: string; relation: string; inferred: boolean }[];
};
type IconName = "alert" | "card" | "recovery" | "bench" | "sun" | "moon" | "check" | "key";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const demoKeyword = "local-demo-approval";
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h4"/></>,
    recovery: <><path d="M4 7h12a4 4 0 0 1 0 8H8"/><path d="m8 11-4 4 4 4"/><path d="M17 5h3v3"/></>,
    bench: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20.8 14A8.5 8.5 0 0 1 10 3.2 8.8 8.8 0 1 0 20.8 14Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [recoveryId, setRecoveryId] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [approvalKeyword, setApprovalKeyword] = useState(demoKeyword);
  const [keywordVisible, setKeywordVisible] = useState(false);
  const [actionError, setActionError] = useState("");
  const selected = incidents[0];

  useEffect(() => {
    const saved = window.localStorage.getItem("ledgerlens-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
    async function load() {
      try {
        const response = await fetch(`${api}/api/v1/incidents`);
        if (!response.ok) throw new Error("Incident request failed");
        const data = await response.json();
        setIncidents(data.items);
        const first: Incident | undefined = data.items[0];
        if (!first) return;
        const [evidenceResponse, diagnosisResponse] = await Promise.all([
          fetch(`${api}/api/v1/incidents/${first.id}/evidence`),
          fetch(`${api}/api/v1/incidents/${first.id}/investigate`, { method: "POST" }),
        ]);
        if (!evidenceResponse.ok || !diagnosisResponse.ok) throw new Error("Incident evidence request failed");
        setGraph(await evidenceResponse.json());
        setDiagnosis(await diagnosisResponse.json());
      } catch {
        setError("LedgerLens API is unavailable. Start the API service and reload.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("ledgerlens-theme", next);
  }

  async function simulateRecovery() {
    if (!selected?.journal_ids[0]) return;
    setActionError("");
    setRecoveryStatus("Preparing isolated simulation...");
    try {
      const created = await fetch(`${api}/api/v1/recoveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: selected.id, journal_id: selected.journal_ids[0] }),
      });
      if (!created.ok) throw new Error("Could not create the recovery proposal.");
      const proposal = await created.json();
      setRecoveryId(proposal.id);
      const response = await fetch(`${api}/api/v1/recoveries/${proposal.id}/simulate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Simulation did not pass verification.");
      setRecoveryStatus("Simulation verified. A human keyword is required to continue.");
    } catch (cause) {
      setRecoveryStatus("");
      setActionError(cause instanceof Error ? cause.message : "Recovery simulation failed.");
    }
  }

  async function authorizeAndExecute() {
    if (!recoveryId || !approvalKeyword.trim()) return;
    setActionError("");
    try {
      const approval = await fetch(`${api}/api/v1/recoveries/${recoveryId}/approve`, {
        method: "POST",
        headers: { "X-Approval-Token": approvalKeyword.trim() },
      });
      const approvalResult = await approval.json();
      if (!approval.ok) throw new Error(approvalResult.detail ?? "Keyword was not accepted.");
      setRecoveryStatus("Keyword accepted. Applying the correction to the sandbox ledger...");
      const response = await fetch(`${api}/api/v1/recoveries/${recoveryId}/execute`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "Sandbox execution failed.");
      setRecoveryStatus(`Sandbox journal ${result.journal_id} recorded. No payment rail was contacted.`);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Approval failed.");
    }
  }

  return (
    <main>
      <aside className="sidebar">
        <div className="brand"><span className="mark">L</span><span>LEDGERLENS</span></div>
        <div className="navlabel">WORKSPACE</div>
        <nav aria-label="Workspace">
          <a className="active" href="#incidents"><Icon name="alert"/> <span>Incidents</span><b>{loading ? "..." : incidents.length}</b></a>
          <a href="#payments"><Icon name="card"/> <span>Payments</span></a>
          <a href="#recovery"><Icon name="recovery"/> <span>Recovery studio</span></a>
          <div className="planned-nav" title="FinOpsBench view is planned"><Icon name="bench"/> <span>FinOpsBench</span><small>SOON</small></div>
        </nav>
        <div className="sidefoot"><span className="live-dot"/> SIMULATION ENVIRONMENT<strong>Local workspace</strong></div>
      </aside>

      <section className="content">
        <header>
          <div><span className="crumb">OPERATIONS / INCIDENTS</span><h1>Incident investigation</h1></div>
          <div className="headtools">
            <button className="theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} aria-pressed={theme === "light"}>
              <Icon name={theme === "dark" ? "sun" : "moon"}/><span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="status"><span className="live-dot"/> Simulation data</div>
          </div>
        </header>

        <section className="intro" aria-label="Operational overview">
          <div className="intro-copy"><span className="eyebrow">FINANCIAL CONTROL PLANE</span><h2>Trace the discrepancy.<br/>Verify the next action.</h2><p>Evidence-backed incident review across payment and ledger systems.</p></div>
          <div className="overview"><span>OPEN INCIDENTS</span><strong>{loading ? "..." : incidents.length}</strong><small>Live API query</small></div>
          <div className="overview"><span>SUSPECTED EXPOSURE</span><strong>{selected ? inr.format(selected.exposure_minor / 100) : "?"}</strong><small>Integer minor units ? generated data</small></div>
        </section>

        {error && <div className="error" role="alert">{error}</div>}

        <section id="incidents" aria-labelledby="incidents-title">
          <div className="sectionhead"><div><span className="eyebrow">DETECTED ANOMALIES</span><h2 id="incidents-title">Open incidents</h2></div><span className="muted">{loading ? "Loading..." : `${incidents.length} result${incidents.length === 1 ? "" : "s"}`}</span></div>
          <div className="tablewrap" role="region" aria-label="Open incidents table" tabIndex={0}>
            <table><caption className="sr-only">Detected financial incidents and suspected exposure</caption><thead><tr><th scope="col">INCIDENT</th><th scope="col">PAYMENT</th><th scope="col">SEVERITY</th><th scope="col">SUSPECTED EXPOSURE</th><th scope="col">STATUS</th></tr></thead>
              <tbody>
                {!loading && incidents.length === 0 && <tr><td colSpan={5} className="empty">No incidents detected in this simulation.</td></tr>}
                {incidents.map(item => <tr key={item.id}><td className="mono link">{item.id}</td><td className="mono">{item.payment_id}</td><td><span className="severity">{item.severity}</span></td><td className="mono">{inr.format(item.exposure_minor / 100)}</td><td><span className="open"><span className="status-dot"/> {item.status}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <div className="workspace-grid">
          <article id="payments" aria-labelledby="lineage-title">
            <div className="sectionhead"><div><span className="eyebrow">TEMPORAL EVIDENCE</span><h2 id="lineage-title">Event lineage</h2></div><span className="tag">{graph?.nodes.length ?? "?"} nodes</span></div>
            <p className="caption">Observed records are shown with provenance. Timestamp order does not imply causality.</p>
            <div className="timeline" aria-live="polite">
              {graph?.nodes.filter(node => node.type === "event").map(node => <div className="event" key={node.id}><span className="event-marker"/><div><b>{node.event_type}</b><small>{node.source}<span aria-hidden="true"> ? </span><code>{node.id}</code></small></div><span className="observed">OBSERVED</span></div>)}
              {!graph && !error && <p className="caption">Loading evidence...</p>}
            </div>
          </article>

          <article id="recovery" aria-labelledby="recovery-title">
            <div className="sectionhead"><div><span className="eyebrow">CONTROLLED RECOVERY</span><h2 id="recovery-title">Simulation report</h2></div><span className="tag neutral">SANDBOX ONLY</span></div>
            <div className="report"><span className="check"><Icon name="check"/></span><div><b>{diagnosis?.root_cause ?? "Loading deterministic diagnosis"}</b><p>{diagnosis?.summary ?? "Diagnosis is retrieved from the incident investigation API."}</p></div></div>
            <dl className="facts"><div><dt>Invariant check</dt><dd className="good">Balanced journal</dd></div><div><dt>Evidence references</dt><dd>{diagnosis?.observed_facts[0]?.evidence_ids.length ?? "?"} records</dd></div><div><dt>Uncertainty</dt><dd title={diagnosis?.uncertainty}>{diagnosis ? "Explicit ? review evidence" : "?"}</dd></div></dl>

            {!recoveryId && <button className="primary" type="button" onClick={simulateRecovery} disabled={!selected || loading}>Simulate proposed reversal</button>}
            {recoveryId && <div className="authorization">
              <div className="authorization-form">
                <label htmlFor="approval-keyword">Local demo approval keyword</label>
                <div className="keyword-input"><Icon name="key"/><input id="approval-keyword" type={keywordVisible ? "text" : "password"} autoComplete="off" value={approvalKeyword} onChange={event => setApprovalKeyword(event.target.value)} aria-describedby="keyword-help"/><button className="reveal" type="button" onClick={() => setKeywordVisible(value => !value)}>{keywordVisible ? "Hide" : "Show"}</button></div>
                <p id="keyword-help" className="field-help">For this local demo, the keyword is prefilled. It is checked by the API before a sandbox-only correction.</p>
                <button className="primary" type="button" onClick={authorizeAndExecute} disabled={!approvalKeyword.trim()}>Verify keyword &amp; execute in sandbox</button>
              </div>
              <aside className="auth-explainer" aria-label="How demo keyword approval works">
                <span className="eyebrow">WHAT THIS KEY DOES</span>
                <div className="auth-step"><span>1</span><p><b>Human review</b><small>You inspect the simulation first.</small></p></div>
                <div className="auth-connector"/>
                <div className="auth-step"><span>2</span><p><b>API checks keyword</b><small>It must match the local demo setting.</small></p></div>
                <div className="auth-connector"/>
                <div className="auth-step"><span>3</span><p><b>Sandbox records</b><small>Only the in-memory ledger changes.</small></p></div>
                <p className="auth-note">This is a demo approval gate, not account login, identity verification, or production-grade authorization.</p>
              </aside>
            </div>}
            {recoveryStatus && <p className="action-status" role="status">{recoveryStatus}</p>}
            {actionError && <p className="action-error" role="alert">{actionError}</p>}
            <p className="footnote">Simulation only ? no payment rails ? local state resets on restart</p>
          </article>
        </div>

        <footer><span>LEDGERLENS AI</span><span>DETERMINISTIC FINANCIAL CORE ? v0.1.0</span></footer>
      </section>
    </main>
  );
}
