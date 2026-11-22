import type { Metadata } from "next";
import "./style.css";
export const metadata: Metadata = { title: "LedgerLens | Financial incident operations", description: "Trace payment evidence, investigate ledger discrepancies, and verify sandbox recovery." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
