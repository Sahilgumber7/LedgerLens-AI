import type { Metadata } from "next";
import "./style.css";
export const metadata: Metadata = { title: "LedgerLens | Incident operations", description: "Simulation-only financial incident reconstruction" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
