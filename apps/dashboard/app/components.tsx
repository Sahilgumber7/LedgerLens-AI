"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type Incident = { id: string; payment_id: string; severity: string; exposure_minor: number; evidence_ids: string[]; journal_ids: string[]; status: string };
export type Graph = { nodes: { id: string; type: string; event_type?: string; source?: string }[]; edges: { source: string; target: string; relation: string; inferred: boolean }[] };
export type Overview = { data_origin: string; open_incidents: number; affected_payments: number; suspected_exposure_minor: number; verified_loss_minor: number | null; severity_counts: Record<string, number>; event_source_counts: Record<string, number>; event_count: number; journal_count: number; ledger_version: number };
export type Diagnosis = { engine: string; root_cause: string; summary: string; uncertainty: string; observed_facts: { claim: string; evidence_ids: string[] }[] };
export const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const demoKeyword = "local-demo-approval";
export const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export type IconName = "alert" | "card" | "recovery" | "bench" | "sun" | "moon" | "check" | "key";

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18m-14 5h4"/></>,
    recovery: <><path d="M4 7h12a4 4 0 0 1 0 8H8"/><path d="m8 11-4 4 4 4"/><path d="M17 5h3v3"/></>,
    bench: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20.8 14A8.5 8.5 0 0 1 10 3.2 8.8 8.8 0 1 0 20.8 14Z"/>,
    check: <path d="m5 12 4 4L19 6"/>, key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Logo({ className = "" }: { className?: string }) {
  return <div className={`brand-lockup ${className}`} aria-label="Tracewire"><svg className="brand-symbol" viewBox="0 0 48 48" role="img" aria-label="Tracewire mark"><rect x="1" y="1" width="46" height="46" rx="12" fill="#ccebdc"/><path d="M12 14h11M12 19h8M12 24h7M12 29h8M12 34h10" stroke="#193d2d" strokeWidth="2.2" strokeLinecap="round"/><circle cx="29" cy="22" r="9" fill="#f5fbf7" stroke="#193d2d" strokeWidth="2.4"/><path d="m35.5 28.5 5 5" stroke="#193d2d" strokeWidth="3" strokeLinecap="round"/><circle cx="29" cy="22" r="4" fill="#83c5a1"/></svg><span><b>TRACEWIRE</b></span></div>;
}

export function EvidenceGraph({ graph }: { graph: Graph }) {
  const nodes = [...graph.nodes.filter(node => node.type === "incident"), ...graph.nodes.filter(node => node.type === "event").slice(0, 5), ...graph.nodes.filter(node => node.type === "ledger_entry").slice(0, 2)];
  const points = nodes.map((node, index) => ({ node, x: node.type === "incident" ? 58 : node.type === "ledger_entry" ? 478 : 255, y: node.type === "incident" ? 94 : node.type === "ledger_entry" ? 70 + nodes.filter((item, i) => i < index && item.type === "ledger_entry").length * 58 : 25 + nodes.filter((item, i) => i < index && item.type === "event").length * 34 }));
  const byId = new Map(points.map(point => [point.node.id, point]));
  return <div className="graph-wrap"><svg viewBox="0 0 540 210" role="img" aria-label="Evidence graph with incident, event, and ledger records">{graph.edges.map((edge, index) => { const from = byId.get(edge.source); const to = byId.get(edge.target); return from && to ? <line key={`${edge.source}-${edge.target}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={edge.inferred ? "graph-edge inferred" : "graph-edge"}/> : null; })}{points.map(({ node, x, y }) => <g key={node.id}><circle cx={x} cy={y} r="7" className={`graph-point ${node.type}`}/><text x={x} y={y + 19} textAnchor="middle">{(node.event_type ?? node.type).replaceAll("_", " ").slice(0, 15)}</text></g>)}</svg><div className="graph-note"><span><i className="graph-dot"/> Observed record</span><span>Solid line: detector reference</span><span>Edges do not establish causality</span></div></div>;
}

const nav = [{ href: "/overview", label: "Overview", icon: "bench" as const }, { href: "/incidents", label: "Fraud alerts", icon: "alert" as const }, { href: "/payments", label: "Payments", icon: "card" as const }, { href: "/recovery", label: "Recovery studio", icon: "recovery" as const }, { href: "/audit", label: "Audit trail", icon: "check" as const }, { href: "/benchmarks", label: "FinOpsBench", icon: "bench" as const }];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [theme, setTheme] = useState<"dark" | "light">("dark"); const [ready, setReady] = useState(false);
  useEffect(() => { const saved = localStorage.getItem("ledgerlens-theme"); if (saved === "light" || saved === "dark") { setTheme(saved); document.documentElement.dataset.theme = saved; } if (sessionStorage.getItem("ledgerlens-demo-access") !== "ok") router.replace("/"); else setReady(true); }, [router]);
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("ledgerlens-theme", next); }
  if (!ready) return <main className="loading-shell" aria-label="Opening workspace">Opening local workspace…</main>;
  return <main className="workspace-shell"><aside className="sidebar"><a href="/overview" className="brand"><Logo/></a><div className="navlabel">WORKSPACE</div><nav aria-label="Workspace">{nav.map(item => <a key={item.href} href={item.href} className={pathname === item.href ? "active" : ""} aria-current={pathname === item.href ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span></a>)}</nav><div className="sidefoot"><span className="live-dot"/> SIMULATION ENVIRONMENT<strong>Local workspace</strong></div></aside><section className="content"><header><div><span className="crumb">OPERATIONS / {nav.find(item => item.href === pathname)?.label.toUpperCase()}</span><h1>{nav.find(item => item.href === pathname)?.label ?? "Workspace"}</h1></div><div className="headtools"><button className="theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"}/><span>{theme === "dark" ? "Light" : "Dark"}</span></button><div className="status"><span className="live-dot"/> Simulation data</div><button className="theme logout" type="button" onClick={() => { sessionStorage.removeItem("ledgerlens-demo-access"); router.replace("/"); }}>Exit demo</button></div></header>{children}<footer><span>TRACEWIRE</span><span>DETERMINISTIC FINANCIAL CORE | v0.1.0</span></footer></section></main>;
}
