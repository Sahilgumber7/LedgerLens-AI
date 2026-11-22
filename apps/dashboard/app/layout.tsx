import type { Metadata } from "next";
import localFont from "next/font/local";
import "./style.css";

const sora = localFont({
  src: "./fonts/Sora-latin-variable.woff2",
  variable: "--font-sora",
  display: "swap",
  weight: "400 700",
});

export const metadata: Metadata = { title: "LedgerLens | Financial incident operations", description: "Trace payment evidence, investigate ledger discrepancies, and verify sandbox recovery." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={sora.variable}>{children}</body></html>; }
