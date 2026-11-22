"use client";
import { useState } from "react";
import { Icon, Logo } from "./components";

export function LandingPage({ keyword, setKeyword, onSubmit, error, loading, theme, toggleTheme }: {
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
        <span className="eyebrow">PAYMENT INVESTIGATION</span>
        <h1>Catch payment anomalies.<br /><em>Trace every alert.</em></h1>
        <p className="landing-lede">Task-specific monitors track payment and ledger signals, then link alerts to evidence you can review.</p>
        <p className="caption">This demo uses deterministic rules for monitoring and diagnosis. No AI model is connected.</p>
        <div className="process-diagram" aria-label="Investigation process: track payment signals, trace alerts, verify a recovery">
          <div className="process-step"><span className="process-index">01</span><span className="process-icon"><Icon name="alert" size={22} /></span><b>Track signals</b><p>Payment and webhook events</p></div>
          <span className="process-link" aria-hidden="true"><i /></span>
          <div className="process-step"><span className="process-index">02</span><span className="process-icon"><Icon name="card" size={22} /></span><b>Trace alert</b><p>Compare events and journals</p></div>
          <span className="process-link" aria-hidden="true"><i /></span>
          <div className="process-step"><span className="process-index">03</span><span className="process-icon"><Icon name="recovery" size={22} /></span><b>Verify recovery</b><p>Simulate before approval</p></div>
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
    <footer className="landing-footer"><span>TRACEWIRE</span><span>SYNTHETIC DATA. NO PAYMENTS ARE SENT.</span></footer>
  </main>;
}
