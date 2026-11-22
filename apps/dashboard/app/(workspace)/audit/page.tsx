"use client";
import { useEffect, useState } from "react";
import { api, Icon } from "../../components";
type AuditItem = { event: string; recovery_id?: string; journal_id?: string; state_version?: number };
export default function AuditPage() {
 const [items, setItems] = useState<AuditItem[]>([]); const [error, setError] = useState("");
 useEffect(() => { fetch(`${api}/api/v1/audit`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setItems(d.items)).catch(() => setError("Audit records could not be loaded.")); }, []);
 return <><section className="page-intro"><span className="eyebrow">APPEND-ONLY ACTIVITY</span><h2>Recovery and approval history</h2><p>Review actions recorded by this API process. Records reset when the local simulator restarts.</p></section>{error && <p className="error" role="alert">{error}</p>}<section className="audit-panel"><div className="sectionhead"><div><span className="eyebrow">AUDIT EVENTS</span><h2>Recorded activity</h2></div><span className="tag">{items.length} events</span></div>{items.length ? <div className="audit-list">{items.slice().reverse().map((item, i) => <div key={`${item.event}-${i}`}><span className="audit-mark"><Icon name="check" size={13}/></span><b>{item.event.replaceAll("_", " ")}</b><code>{item.recovery_id ?? "system"}</code><small>{item.journal_id ?? (item.state_version === undefined ? "Process-local event" : `Ledger version ${item.state_version}`)}</small></div>)}</div> : <p className="caption">{error ? "" : "No recovery actions recorded in this process yet."}</p>}</section></>;
}
