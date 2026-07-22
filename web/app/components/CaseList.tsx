"use client";
import React from "react";
import { CaseSummary } from "../api-client";
import StatusBadge from "./StatusBadge";

function riskColor(p: number | null) {
  if (p === null) return "var(--muted)";
  if (p >= 75) return "#ef4444";
  if (p >= 50) return "#f97316";
  if (p >= 25) return "#f59e0b";
  return "#10b981";
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

export default function CaseList({
  cases, onSelect, selectedCaseId,
}: {
  cases: CaseSummary[];
  onSelect: (caseId: string) => void;
  selectedCaseId: string | null;
}) {
  if (cases.length === 0) {
    return (
      <div style={{ padding: "24px 16px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📋</div>
        <div style={{ fontSize: "13px", color: "var(--muted)" }}>No investigations yet</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px", padding: "0 8px 8px" }}>
      {cases.map((c) => {
        const active = selectedCaseId === c.case_id;
        const color = riskColor(c.fraud_probability);
        return (
          <div
            key={c.case_id}
            onClick={() => onSelect(c.case_id)}
            style={{
              padding: "12px", borderRadius: "10px", cursor: "pointer",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "#fffbeb" : "var(--surface)",
              transition: "all 0.12s",
              position: "relative", overflow: "hidden",
              boxShadow: active ? "0 0 0 2px rgba(245,158,11,0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
            }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--muted-2)"; } }}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; } }}
          >
            {/* Left accent bar */}
            {active && (
              <div style={{
                position: "absolute", left: 0, top: "20%", bottom: "20%",
                width: "3px", borderRadius: "0 2px 2px 0", background: "var(--accent)",
              }} />
            )}

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "var(--muted-2)", marginBottom: "2px" }}>
                  {c.case_id}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
                  {c.customer_id}
                </div>
              </div>
              {/* Risk score */}
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "8px" }}>
                <div style={{
                  fontSize: "20px", fontWeight: 700, lineHeight: 1,
                  color, fontFamily: "JetBrains Mono, monospace",
                }}>
                  {c.fraud_probability !== null ? `${c.fraud_probability}` : "—"}
                  {c.fraud_probability !== null && <span style={{ fontSize: "11px", fontWeight: 400 }}>%</span>}
                </div>
                <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>risk</div>
              </div>
            </div>

            {/* Risk bar */}
            {c.fraud_probability !== null && (
              <div style={{
                height: "2px", background: "var(--surface-3)", borderRadius: "1px", marginBottom: "8px", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${c.fraud_probability}%`,
                  background: color, borderRadius: "1px", transition: "width 0.5s ease",
                }} />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <StatusBadge status={c.status} />
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                {c.created_at ? timeAgo(c.created_at) : ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
