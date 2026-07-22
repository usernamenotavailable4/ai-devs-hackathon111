import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harshad Mehta AI — Fraud Investigation Platform",
  description: "Bank-grade multi-agent fraud investigation system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "var(--bg)", color: "var(--text)" }}>{children}</body>
    </html>
  );
}
