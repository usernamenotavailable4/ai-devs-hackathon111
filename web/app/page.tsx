"use client";
import React, { useEffect, useState } from "react";
import { api, CaseSummary } from "./api-client";
import CaseList from "./components/CaseList";
import CaseDetail from "./components/CaseDetail";
import NewAlertForm from "./components/NewAlertForm";

export default function Page() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<{ valid: boolean; detail: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const refresh = () => {
    api.listCases().then((r) => setCases(r.cases)).catch(() => {});
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const runVerify = async () => {
    setVerifying(true);
    setAuditStatus({ valid: true, detail: "Verifying…" });
    try {
      const res = await api.verifyAuditChain();
      setAuditStatus(
        res.valid
          ? { valid: true, detail: `${res.entries_checked} entries verified` }
          : { valid: false, detail: `Tamper at seq ${res.broken_at_seq}` }
      );
    } catch (e: any) {
      setAuditStatus({ valid: false, detail: e.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Top Nav */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "0 24px",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Logo mark */}
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: "14px", color: "#000", fontFamily: "JetBrains Mono, monospace",
            flexShrink: 0,
          }}>HM</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "15px", letterSpacing: "-0.01em", color: "#f1f5f9" }}>
              Harshad Mehta <span style={{ color: "var(--accent)" }}>AI</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Fraud Investigation Platform
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)",
              boxShadow: "0 0 6px var(--success)",
            }} />
            <span style={{ fontSize: "11px", color: "var(--muted-2)" }}>LIVE</span>
          </div>

          <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />

          {auditStatus && (
            <span style={{
              fontSize: "12px",
              color: auditStatus.valid ? "var(--success)" : "var(--danger)",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              {auditStatus.valid ? "✓" : "✗"} {auditStatus.detail}
            </span>
          )}

          <button
            onClick={runVerify}
            disabled={verifying}
            style={{
              fontSize: "12px", padding: "6px 14px",
              border: "1px solid var(--border)", borderRadius: "6px",
              background: "transparent", color: "var(--muted-2)", cursor: "pointer",
              transition: "all 0.15s",
              opacity: verifying ? 0.5 : 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            {verifying ? "Verifying…" : "Verify Audit Chain"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{
          width: "360px", flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* New Alert section */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-dim)", flexShrink: 0 }}>
            <NewAlertForm onSubmitted={(caseId) => { refresh(); setSelectedCaseId(caseId); }} />
          </div>

          {/* Case list header */}
          <div style={{
            padding: "10px 16px 8px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
              Active Cases
            </span>
            <span style={{
              fontSize: "11px", fontWeight: 600,
              background: "var(--surface-3)", color: "var(--accent)",
              padding: "2px 8px", borderRadius: "10px",
            }}>
              {cases.length}
            </span>
          </div>

          {/* Cases */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CaseList cases={cases} onSelect={setSelectedCaseId} selectedCaseId={selectedCaseId} />
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {selectedCaseId ? (
            <CaseDetail caseId={selectedCaseId} onResolved={refresh} />
          ) : (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "16px", padding: "40px",
            }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "16px",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "28px",
              }}>🔍</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  No case selected
                </div>
                <div style={{ fontSize: "13px", color: "var(--muted)", maxWidth: "320px" }}>
                  Pick a case from the list or submit a new flagged transaction alert to start an AI investigation.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
