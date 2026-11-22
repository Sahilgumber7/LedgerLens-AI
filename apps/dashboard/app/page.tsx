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
type Overview = { data_origin: string; open_incidents: number; affected_payments: number; suspected_exposure_minor: number; verified_loss_minor: number | null; severity_counts: Record<string, number>; event_source_counts: Record<string, number>; event_count: number; journal_count: number; ledger_version: number };
type IconName = "alert" | "card" | "recovery" | "bench" | "sun" | "moon" | "check" | "key";

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const demoKeyword = "local-demo-approval";
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

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
  const [workspaceAccess, setWorkspaceAccess] = useState(false);
  const [accessKeyword, setAccessKeyword] = useState(demoKeyword);
  const [accessError, setAccessError] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [auditItems, setAuditItems] = useState<{ event: string; recovery_id?: string; journal_id?: string }[]>([]);
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
    if (!workspaceAccess) return;
    async function load() {
      try {
        const [response, overviewResponse, auditResponse] = await Promise.all([fetch(`${api}/api/v1/incidents`), fetch(`${api}/api/v1/overview`), fetch(`${api}/api/v1/audit`)]);
        if (!response.ok) throw new Error("Incident request failed");
        if (!overviewResponse.ok || !auditResponse.ok) throw new Error("Overview request failed");
        const data = await response.json();
        setOverview(await overviewResponse.json());
        setAuditItems((await auditResponse.json()).items);
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
  }, [workspaceAccess]);

  async function enterWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessError("");
    setAccessLoading(true);
    try {
      const response = await fetch(`${api}/api/v1/auth/keyword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: accessKeyword.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "Keyword was not accepted.");
      setWorkspaceAccess(true);
    } catch (cause) {
      setAccessError(cause instanceof Error ? cause.message : "Workspace access failed.");
    } finally {
      setAccessLoading(false);
    }
  }

  if (!workspaceAccess) return <LandingPage keyword={accessKeyword} setKeyword={setAccessKeyword} onSubmit={enterWorkspace} error={accessError} loading={accessLoading} theme={theme} toggleTheme={toggleTheme} />;

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
      const [overviewResponse, incidentsResponse, auditResponse] = await Promise.all([fetch(`${api}/api/v1/overview`), fetch(`${api}/api/v1/incidents`), fetch(`${api}/api/v1/audit`)]);
      if (overviewResponse.ok) setOverview(await overviewResponse.json());
      if (incidentsResponse.ok) setIncidents((await incidentsResponse.json()).items);
      if (auditResponse.ok) setAuditItems((await auditResponse.json()).items);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Approval failed.");
    }
  }

  return (
    <main>
      <aside className="sidebar">
        <Logo className="brand" />
        <div className="navlabel">WORKSPACE</div>
        <nav aria-label="Workspace">
          <a className="active" href="#incidents"><Icon name="alert"/> <span>Incidents</span><b>{loading ? "..." : incidents.length}</b></a>
          <a href="#payments"><Icon name="card"/> <span>Payments</span></a>
          <a href="#recovery"><Icon name="recovery"/> <span>Recovery studio</span></a>
          <a href="#audit"><Icon name="check"/> <span>Audit trail</span></a>
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
            <button className="theme logout" type="button" onClick={() => { setWorkspaceAccess(false); setRecoveryId(""); setRecoveryStatus(""); }}>Exit demo</button>
          </div>
        </header>

        <section className="intro" aria-label="Operational overview">
          <div className="intro-copy"><span className="eyebrow">FINANCIAL CONTROL PLANE</span><h2>Trace the discrepancy.<br/>Verify the next action.</h2><p>Evidence-backed incident review across payment and ledger systems.</p></div>
          <div className="overview"><span>OPEN INCIDENTS</span><strong>{overview?.open_incidents ?? "..."}</strong><small>Live API query</small></div>
          <div className="overview"><span>SUSPECTED EXPOSURE</span><strong>{overview ? usd.format(overview.suspected_exposure_minor / 100) : "..."}</strong><small>Integer cents | generated data</small></div>
        </section>

        {error && <div className="error" role="alert">{error}</div>}

        <section className="visual-grid" aria-label="Operational charts">
          <article className="viz-card"><div className="sectionhead"><div><span className="eyebrow">EVENT INGESTION</span><h2>Evidence by source</h2></div><span className="tag">{overview?.event_count ?? "..."} records</span></div>
            {overview ? <div className="bar-chart" role="img" aria-label="Event count by source">{Object.entries(overview.event_source_counts).map(([name, count], index, items) => <div className="bar-row" key={name}><span>{name}</span><div className="bar-track"><i style={{ width: `${Math.max(5, (count / Math.max(1, ...items.map(([, value]) => value))) * 100)}%`, animationDelay: `${index * 80}ms` }} /></div><b>{count}</b></div>)}</div> : <p className="caption">Loading metrics...</p>}
            <p className="viz-note">Event counts are not financial totals.</p>
          </article>
          <article className="viz-card"><div className="sectionhead"><div><span className="eyebrow">CURRENT STATE</span><h2>Incident severity</h2></div><span className="tag">live</span></div>
            {overview && <div className="severity-visual"><div className="donut" style={{ "--severity-share": `${overview.open_incidents ? ((overview.severity_counts.high ?? 0) / overview.open_incidents) * 100 : 0}%` } as React.CSSProperties} role="img" aria-label={`${overview.open_incidents} open incidents`}><span><b>{overview.open_incidents}</b><small>open</small></span></div><div className="legend">{Object.entries(overview.severity_counts).map(([name, count]) => <div key={name}><i className={`legend-dot ${name}`} /><span>{name}</span><b>{count}</b></div>)}{overview.open_incidents === 0 && <p className="caption">No active incidents.</p>}</div></div>}
            <div className="metric-strip"><span>Affected payments <b>{overview?.affected_payments ?? "..."}</b></span><span>Journals <b>{overview?.journal_count ?? "..."}</b></span><span>Verified loss <b>{overview?.verified_loss_minor === null ? "Not established" : overview ? usd.format(overview.verified_loss_minor / 100) : "..."}</b></span></div>
          </article>
        </section>

        <section id="incidents" aria-labelledby="incidents-title">
          <div className="sectionhead"><div><span className="eyebrow">DETECTED ANOMALIES</span><h2 id="incidents-title">Open incidents</h2></div><span className="muted">{loading ? "Loading..." : `${incidents.length} result${incidents.length === 1 ? "" : "s"}`}</span></div>
          <div className="tablewrap" role="region" aria-label="Open incidents table" tabIndex={0}>
            <table><caption className="sr-only">Detected financial incidents and suspected exposure</caption><thead><tr><th scope="col">INCIDENT</th><th scope="col">PAYMENT</th><th scope="col">SEVERITY</th><th scope="col">SUSPECTED EXPOSURE</th><th scope="col">STATUS</th></tr></thead>
              <tbody>
                {!loading && incidents.length === 0 && <tr><td colSpan={5} className="empty">No incidents detected in this simulation.</td></tr>}
                {incidents.map(item => <tr key={item.id}><td className="mono link">{item.id}</td><td className="mono">{item.payment_id}</td><td><span className="severity">{item.severity}</span></td><td className="mono">{usd.format(item.exposure_minor / 100)}</td><td><span className="open"><span className="status-dot"/> {item.status}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <div className="workspace-grid">
          <article id="payments" aria-labelledby="lineage-title">
            <div className="sectionhead"><div><span className="eyebrow">TEMPORAL EVIDENCE</span><h2 id="lineage-title">Event lineage</h2></div><span className="tag">{graph?.nodes.length ?? "?"} nodes</span></div>
            <p className="caption">Observed records are shown with provenance. Timestamp order does not imply causality.</p>
            {graph && <EvidenceGraph graph={graph} />}
            <div className="timeline" aria-live="polite">
              {graph?.nodes.filter(node => node.type === "event").map(node => <div className="event" key={node.id}><span className="event-marker"/><div><b>{node.event_type}</b><small>{node.source}<span aria-hidden="true"> | </span><code>{node.id}</code></small></div><span className="observed">OBSERVED</span></div>)}
              {!graph && !error && <p className="caption">Loading evidence...</p>}
            </div>
          </article>

          <article id="recovery" aria-labelledby="recovery-title">
            <div className="sectionhead"><div><span className="eyebrow">CONTROLLED RECOVERY</span><h2 id="recovery-title">Simulation report</h2></div><span className="tag neutral">SANDBOX ONLY</span></div>
            <div className="report"><span className="check"><Icon name="check"/></span><div><b>{diagnosis?.root_cause ?? "Loading deterministic diagnosis"}</b><p>{diagnosis?.summary ?? "Diagnosis is retrieved from the incident investigation API."}</p></div></div>
            <dl className="facts"><div><dt>Invariant check</dt><dd className="good">Balanced journal</dd></div><div><dt>Evidence references</dt><dd>{diagnosis?.observed_facts[0]?.evidence_ids.length ?? "..."} records</dd></div><div><dt>Uncertainty</dt><dd title={diagnosis?.uncertainty}>{diagnosis ? "Explicitly documented" : "..."}</dd></div></dl>

            {!recoveryId && <button className="primary" type="button" onClick={simulateRecovery} disabled={!selected || loading}>Simulate proposed reversal</button>}
            <div className="authorization">
              <div className="authorization-form">
                <label htmlFor="approval-keyword">Local demo approval keyword</label>
                <div className="keyword-input"><Icon name="key"/><input id="approval-keyword" type={keywordVisible ? "text" : "password"} autoComplete="off" value={approvalKeyword} onChange={event => setApprovalKeyword(event.target.value)} aria-describedby="keyword-help"/><button className="reveal" type="button" onClick={() => setKeywordVisible(value => !value)}>{keywordVisible ? "Hide" : "Show"}</button></div>
                <p id="keyword-help" className="field-help">For this local demo, the keyword is prefilled. It is checked by the API before a sandbox-only correction.</p>
                <button className="primary" type="button" onClick={authorizeAndExecute} disabled={!recoveryId || !recoveryStatus.startsWith("Simulation verified") || !approvalKeyword.trim()}>Verify keyword &amp; execute in sandbox</button>
                <p className="field-help">Run the isolated simulation above before the keyword check is enabled.</p>
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
            </div>
            {recoveryStatus && <p className="action-status" role="status">{recoveryStatus}</p>}
            {actionError && <p className="action-error" role="alert">{actionError}</p>}
            <p className="footnote">Simulation only | no payment rails | local state resets on restart</p>
          </article>
        </div>

        <section id="audit" className="audit-panel" aria-labelledby="audit-title"><div className="sectionhead"><div><span className="eyebrow">APPEND-ONLY ACTIVITY</span><h2 id="audit-title">Recovery audit trail</h2></div><span className="tag">{auditItems.length} events</span></div>{auditItems.length ? <div className="audit-list">{auditItems.slice().reverse().map((item, index) => <div key={`${item.event}-${index}`}><span className="audit-mark"><Icon name="check" size={13}/></span><b>{item.event.replaceAll("_", " ")}</b><code>{item.recovery_id ?? "system"}</code><small>{item.journal_id ?? "Recorded in process-local audit"}</small></div>)}</div> : <p className="caption">No recovery actions recorded in this process yet.</p>}</section>

        <footer><span>LEDGERLENS AI</span><span>DETERMINISTIC FINANCIAL CORE | v0.1.0</span></footer>
      </section>
    </main>
  );
}

function EvidenceGraph({ graph }: { graph: Graph }) {
  const nodes = [...graph.nodes.filter(node => node.type === "incident"), ...graph.nodes.filter(node => node.type === "event").slice(0, 5), ...graph.nodes.filter(node => node.type === "ledger_entry").slice(0, 2)];
  const points = nodes.map((node, index) => ({
    node,
    x: node.type === "incident" ? 58 : node.type === "ledger_entry" ? 478 : 255,
    y: node.type === "incident" ? 94 : node.type === "ledger_entry" ? 70 + nodes.filter((item, i) => i < index && item.type === "ledger_entry").length * 58 : 25 + nodes.filter((item, i) => i < index && item.type === "event").length * 34,
  }));
  const pointById = new Map(points.map(point => [point.node.id, point]));
  return <div className="graph-wrap"><svg viewBox="0 0 540 210" role="img" aria-label="Evidence graph with incident, event, and ledger records">
    {graph.edges.map((edge, index) => { const from = pointById.get(edge.source); const to = pointById.get(edge.target); return from && to ? <line key={`${edge.source}-${edge.target}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={edge.inferred ? "graph-edge inferred" : "graph-edge"} /> : null; })}
    {points.map(({ node, x, y }) => <g key={node.id}><circle cx={x} cy={y} r="7" className={`graph-point ${node.type}`} /><text x={x} y={y + 19} textAnchor="middle">{(node.event_type ?? node.type).replaceAll("_", " ").slice(0, 15)}</text></g>)}
  </svg><div className="graph-note"><span><i className="graph-dot" /> Observed record</span><span>Solid line: detector reference</span><span>Edges do not establish causality</span></div></div>;
}

function Logo({ className = "" }: { className?: string }) {
  return <div className={`brand-lockup ${className}`} aria-label="LedgerLens AI">
    <svg className="brand-symbol" viewBox="0 0 48 48" role="img" aria-label="LedgerLens mark">
      <rect x="1" y="1" width="46" height="46" rx="12" fill="#ccebdc" />
      <path d="M12 14h11M12 19h8M12 24h7M12 29h8M12 34h10" stroke="#193d2d" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="29" cy="22" r="9" fill="#f5fbf7" stroke="#193d2d" strokeWidth="2.4" />
      <path d="m35.5 28.5 5 5" stroke="#193d2d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="29" cy="22" r="4" fill="#83c5a1" />
    </svg>
    <span><b>LEDGERLENS</b></span>
  </div>;
}

function LandingPage({ keyword, setKeyword, onSubmit, error, loading, theme, toggleTheme }: {
  keyword: string;
  setKeyword: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  error: string;
  loading: boolean;
  theme: "dark" | "light";
  toggleTheme: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return <main className="landing-shell">
    <header className="landing-nav"><Logo /><div className="landing-actions"><span className="landing-mode"><i className="live-dot" /> LOCAL SIMULATION</span><button className="theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"} />{theme === "dark" ? "Light" : "Dark"}</button></div></header>
    <section className="landing-layout">
      <div className="landing-copy">
        <span className="eyebrow">PAYMENT OPERATIONS DEMO</span>
        <h1>Payment records<br /><em>do not match.</em></h1>
        <p className="landing-lede">Review payment events against ledger entries. Test a correction in the sandbox.</p>
        <div className="process-diagram" aria-label="Incident review process: read events, compare the ledger, verify a recovery">
          <div className="process-step"><span className="process-index">01</span><span className="process-icon"><Icon name="alert" size={22} /></span><b>Review events</b><p>Order, capture, webhook</p></div>
          <span className="process-link" aria-hidden="true"><i /></span>
          <div className="process-step"><span className="process-index">02</span><span className="process-icon"><Icon name="card" size={22} /></span><b>Compare ledger</b><p>Captures and journal entries</p></div>
          <span className="process-link" aria-hidden="true"><i /></span>
          <div className="process-step"><span className="process-index">03</span><span className="process-icon"><Icon name="recovery" size={22} /></span><b>Test recovery</b><p>Simulate, check balances</p></div>
        </div>
      </div>
      <aside className="access-card" aria-labelledby="access-title">
        <div className="access-icon"><Icon name="key" size={20} /></div>
        <span className="eyebrow">DEMO WORKSPACE</span>
        <h2 id="access-title">Enter with a keyword</h2>
        <p className="access-intro">Enter the demo keyword to view the incident workspace.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="workspace-keyword">Workspace keyword</label>
          <div className="landing-key-input"><input id="workspace-keyword" value={keyword} onChange={event => setKeyword(event.target.value)} type={visible ? "text" : "password"} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="access-key-help" required /><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide keyword" : "Show keyword"}>{visible ? "Hide" : "Show"}</button></div>
          <p id="access-key-help" className="access-key-hint">Demo keyword: <code>local-demo-approval</code></p>
          <button className="landing-submit" type="submit" disabled={loading || !keyword.trim()}>{loading ? "Checking keyword..." : "Open demo workspace"}<span aria-hidden="true">-&gt;</span></button>
          {error && <p className="access-error" role="alert">{error}</p>}
        </form>
        <div className="access-explainer" aria-label="How keyword access works">
          <div className="access-step"><span>1</span><p><b>Keyword check</b><small>The API checks the configured demo keyword.</small></p></div>
          <div className="access-step"><span>2</span><p><b>Local workspace</b><small>Access opens this generated simulation.</small></p></div>
          <div className="access-security"><Icon name="check" size={14} /> The keyword opens this demo page only. API endpoints are not protected by it.</div>
        </div>
      </aside>
    </section>
    <footer className="landing-footer"><span>LEDGERLENS</span><span>SYNTHETIC DATA. NO PAYMENTS ARE SENT.</span></footer>
  </main>;
}
