"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, demoKeyword } from "./components";
import { LandingPage } from "./landing";

export default function Home() {
  const [keyword, setKeyword] = useState(demoKeyword); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [theme, setTheme] = useState<"dark" | "light">("dark"); const router = useRouter();
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("ledgerlens-theme", next); }
  async function enter(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setLoading(true); try { const response = await fetch(`${api}/api/v1/auth/keyword`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: keyword.trim() }) }); const result = await response.json(); if (!response.ok) throw new Error(result.detail ?? "Keyword was not accepted."); sessionStorage.setItem("ledgerlens-demo-access", "ok"); router.push("/overview"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Workspace access failed."); } finally { setLoading(false); } }
  return <LandingPage keyword={keyword} setKeyword={setKeyword} onSubmit={enter} error={error} loading={loading} theme={theme} toggleTheme={toggleTheme}/>;
}
