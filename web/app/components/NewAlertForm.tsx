"use client";
import React, { useState } from "react";
import { api } from "../api-client";

const DEMO_CUSTOMERS = [
  {
    customer_id: "CUST-1000", account_id: "ACC-5000", flagged_transaction_id: "TXN-000451",
    narrative: "High-value wire to an offshore holding entity in a high-risk geography, first occurrence in this account's 12-month history.",
    tag: "Offshore Wire",
  },
  {
    customer_id: "CUST-1004", account_id: "ACC-5004", flagged_transaction_id: "TXN-000452",
    narrative: "Three transfers just under the $10,000 reporting threshold within 48 hours, consistent with structuring.",
    tag: "Structuring",
  },
  {
    customer_id: "CUST-1009", account_id: "ACC-5009", flagged_transaction_id: "TXN-000453",
    narrative: "Sudden high-value P2P transfer to a brand-new, unknown payee, deviating sharply from established spending pattern.",
    tag: "Unknown Payee",
  },
];

export default function NewAlertForm({ onSubmitted }: { onSubmitted: (caseId: string) => void }) {
  const [selected, setSelected] = useState(DEMO_CUSTOMERS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitAlert(selected);
      onSubmitted(res.case_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent)", flexShrink: 0,
        }} />
        <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-2)" }}>
          New Alert
        </span>
      </div>

      {/* Scenario selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {DEMO_CUSTOMERS.map((d) => (
          <button
            key={d.customer_id}
            onClick={() => setSelected(d)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: `1px solid ${selected.customer_id === d.customer_id ? "var(--accent)" : "var(--border-dim)"}`,
              background: selected.customer_id === d.customer_id ? "rgba(245,158,11,0.08)" : "var(--surface-2)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontFamily: "JetBrains Mono, monospace", color: "var(--muted-2)" }}>
                {d.customer_id}
              </span>
              <span style={{
                fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 500,
              }}>{d.tag}</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.4" }}>
              {d.narrative.slice(0, 72)}…
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: "12px", color: "var(--danger)", padding: "8px 12px", background: "var(--danger-dim)", borderRadius: "6px" }}>
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        style={{
          width: "100%", padding: "10px",
          borderRadius: "8px", border: "none",
          background: submitting ? "var(--surface-3)" : "var(--accent)",
          color: submitting ? "var(--muted)" : "#000",
          fontWeight: 600, fontSize: "13px", cursor: submitting ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}
      >
        {submitting ? (
          <>
            <span style={{
              display: "inline-block", width: "12px", height: "12px",
              border: "2px solid var(--muted)", borderTopColor: "transparent",
              borderRadius: "50%", animation: "spin 0.7s linear infinite",
            }} />
            Running 4 AI agents…
          </>
        ) : (
          "▶ Start Investigation"
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
