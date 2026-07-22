"use client";
import React, { useEffect, useRef, useState } from "react";
import { CaseDetail as CaseDetailType, api } from "../api-client";
import StatusBadge from "./StatusBadge";

function riskLabel(p: number) {
  if (p >= 75) return { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" };
  if (p >= 50) return { label: "HIGH", color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" };
  if (p >= 25) return { label: "MEDIUM", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" };
  return { label: "LOW", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" };
}

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  ESCALATE_SAR: { color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  CONFIRM_FRAUD: { color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  MANUAL_REVIEW: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  CLEAR_FALSE_POSITIVE: { color: "#10b981", bg: "rgba(16,185,129,0.08)" },
};

export default function CaseDetail({ caseId, onResolved }: { caseId: string; onResolved: () => void }) {
  const [detail, setDetail] = useState<CaseDetailType | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [demasked, setDemasked] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);

  const load = () => {
    api.getCase(caseId).then(setDetail).catch(() => setDetail(null));
  };

  useEffect(() => {
    setScrolledToBottom(false);
    setDemasked(false);
    setNotes("");
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const onEvidenceScroll = () => {
    const el = evidenceRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setScrolledToBottom(true);
  };

  const submitVerdict = async (verdict: string) => {
    setSubmitting(true);
    try {
      await api.submitVerdict(caseId, {
        verdict, notes,
        fraud_type: detail?.report_json?.recommended_action === "ESCALATE_SAR" ? "MULE_ACCOUNT" : undefined,
      });
      onResolved();
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", color: "var(--muted)", fontSize: "13px",
        }}>
          <span style={{
            display: "inline-block", width: "16px", height: "16px",
            border: "2px solid var(--border)", borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
          }} />
          Loading investigation…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const report = detail.report_json;
  const canDecide = scrolledToBottom && detail.status === "PENDING_REVIEW";
  const risk = report ? riskLabel(report.fraud_probability) : null;
  const actionStyle = report ? (ACTION_COLORS[report.recommended_action] || { color: "var(--muted-2)", bg: "transparent" }) : null;

  return (
    <div style={{ height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Case header */}
      <div style={{
        padding: "20px 24px 16px",
        borderBottom: "1px solid var(--border-dim)",
        background: "var(--surface)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: "13px",
              color: "var(--accent)", fontWeight: 500,
            }}>{detail.case_id}</span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>·</span>
            <span style={{ fontSize: "12px", color: "var(--muted-2)" }}>{detail.customer_id}</span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>·</span>
            <span style={{ fontSize: "12px", color: "var(--muted-2)" }}>{detail.account_id}</span>
          </div>
          <StatusBadge status={detail.status} />
        </div>

        {/* Agent pipeline indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
          {["KYC Retriever", "Txn Analyzer", "Case Search", "Report Generator"].map((agent, i) => (
            <React.Fragment key={agent}>
              <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "4px 10px", borderRadius: "4px",
                background: report ? "rgba(16,185,129,0.1)" : (i === 0 && !report) ? "rgba(245,158,11,0.15)" : "var(--surface-2)",
                border: `1px solid ${report ? "rgba(16,185,129,0.2)" : (i === 0 && !report) ? "rgba(245,158,11,0.3)" : "var(--border-dim)"}`,
              }}>
                <span style={{ fontSize: "9px", color: report ? "var(--success)" : i === 0 ? "var(--accent)" : "var(--muted)" }}>
                  {report ? "✓" : i === 0 ? "◉" : "○"}
                </span>
                <span style={{ fontSize: "10px", color: report ? "var(--success)" : "var(--muted)", whiteSpace: "nowrap" }}>
                  {agent}
                </span>
              </div>
              {i < 3 && (
                <div style={{ width: "16px", height: "1px", background: report ? "var(--success)" : "var(--border)", flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {!report && (
          <div style={{
            padding: "16px", borderRadius: "10px",
            border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{
                display: "inline-block", width: "14px", height: "14px",
                border: "2px solid var(--accent)", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
              }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
                Investigation in progress
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--muted-2)", lineHeight: "1.6", margin: 0 }}>
              4 AI agents are running concurrently — KYC Retrieval, Transaction Analysis, Fraud Case Search, and
              Report Generation. This panel refreshes every 3 seconds.
            </p>
          </div>
        )}

        {report && (
          <>
            {/* Top metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              {/* Fraud probability — the hero metric */}
              <div style={{
                padding: "16px", borderRadius: "10px",
                border: `1px solid ${risk!.border}`,
                background: risk!.bg,
                gridColumn: "1",
              }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Fraud Probability
                </div>
                <div style={{
                  fontSize: "40px", fontWeight: 700, lineHeight: 1,
                  color: risk!.color, fontFamily: "JetBrains Mono, monospace",
                  marginBottom: "4px",
                }}>
                  {report.fraud_probability}<span style={{ fontSize: "18px" }}>%</span>
                </div>
                {/* Bar */}
                <div style={{ height: "4px", background: "var(--surface-3)", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${report.fraud_probability}%`,
                    background: risk!.color, borderRadius: "2px",
                  }} />
                </div>
                <div style={{
                  marginTop: "6px", fontSize: "10px", fontWeight: 700,
                  letterSpacing: "0.1em", color: risk!.color,
                }}>{risk!.label} RISK</div>
              </div>

              {/* Recommended action */}
              <div style={{
                padding: "16px", borderRadius: "10px",
                border: "1px solid var(--border-dim)",
                background: actionStyle!.bg,
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Recommended Action
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 600, color: actionStyle!.color,
                    lineHeight: "1.3",
                  }}>
                    {report.recommended_action.replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div style={{
                padding: "16px", borderRadius: "10px",
                border: "1px solid var(--border-dim)", background: "var(--surface-2)",
              }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  AI Confidence
                </div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", fontFamily: "JetBrains Mono, monospace" }}>
                  {report.confidence}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                  {detail.account_id}
                </div>
              </div>
            </div>

            {/* Narrative */}
            <div style={{
              padding: "16px", borderRadius: "10px",
              border: "1px solid var(--border-dim)", background: "var(--surface-2)",
            }}>
              <div style={{
                fontSize: "11px", color: "var(--muted)", marginBottom: "10px",
                textTransform: "uppercase", letterSpacing: "0.06em",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <span style={{
                  display: "inline-block", width: "6px", height: "6px",
                  borderRadius: "50%", background: "var(--accent)",
                }} />
                AI Investigation Narrative
              </div>
              <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: "1.7", margin: 0 }}>
                {report.narrative}
              </p>
            </div>

            {/* Evidence */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  fontSize: "11px", color: "var(--muted)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span style={{
                    display: "inline-block", width: "6px", height: "6px",
                    borderRadius: "50%", background: "var(--info)",
                  }} />
                  Evidence Citations ({report.evidence_citations.length})
                </div>
                {!scrolledToBottom && (
                  <span style={{
                    fontSize: "11px", color: "var(--accent)",
                    display: "flex", alignItems: "center", gap: "3px",
                  }}>
                    scroll to unlock verdict ↓
                  </span>
                )}
                {scrolledToBottom && (
                  <span style={{ fontSize: "11px", color: "var(--success)" }}>
                    ✓ All evidence reviewed
                  </span>
                )}
              </div>

              <div
                ref={evidenceRef}
                onScroll={onEvidenceScroll}
                style={{
                  maxHeight: "200px", overflowY: "auto",
                  borderRadius: "10px", border: "1px solid var(--border-dim)",
                  background: "var(--surface-2)",
                }}
              >
                {report.evidence_citations.map((e: any, i: number) => (
                  <div key={i} style={{
                    padding: "10px 14px",
                    borderBottom: i < report.evidence_citations.length - 1 ? "1px solid var(--border-dim)" : "none",
                    display: "flex", alignItems: "flex-start", gap: "10px",
                  }}>
                    <span style={{
                      fontFamily: "JetBrains Mono, monospace", fontSize: "11px",
                      color: "var(--info)", flexShrink: 0, paddingTop: "1px",
                      minWidth: "120px",
                    }}>{e.evidence_id}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>{e.source}</div>
                      <div style={{ fontSize: "12px", color: "var(--text)" }}>{e.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PII demask */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => { setDemasked(true); api.demask(caseId); }}
                style={{
                  fontSize: "12px", color: demasked ? "var(--success)" : "var(--muted-2)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  display: "flex", alignItems: "center", gap: "5px",
                }}
              >
                <span>{demasked ? "🔓" : "🔒"}</span>
                {demasked ? "PII de-masked — access logged to audit trail" : "De-mask customer PII (IAM-gated, logged)"}
              </button>
            </div>

            {/* Verdict section */}
            <div style={{
              padding: "16px", borderRadius: "10px",
              border: `1px solid ${canDecide ? "var(--border)" : "var(--border-dim)"}`,
              background: "var(--surface-2)",
              display: "flex", flexDirection: "column", gap: "12px",
            }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Analyst Decision
              </div>

              <textarea
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--surface)", border: "1px solid var(--border-dim)",
                  borderRadius: "8px", padding: "10px 12px",
                  fontSize: "13px", color: "var(--text)", resize: "none",
                  fontFamily: "Inter, sans-serif", lineHeight: "1.5",
                }}
                rows={2}
                placeholder="Analyst notes (optional)…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={detail.status !== "PENDING_REVIEW"}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  disabled={!canDecide || submitting}
                  onClick={() => submitVerdict("CONFIRMED_FRAUD")}
                  style={{
                    flex: 1, padding: "11px",
                    borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)",
                    background: canDecide ? "rgba(239,68,68,0.15)" : "var(--surface)",
                    color: canDecide ? "#fca5a5" : "var(--muted)",
                    fontWeight: 600, fontSize: "13px",
                    cursor: canDecide ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canDecide) (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.25)"; }}
                  onMouseLeave={e => { if (canDecide) (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"; }}
                >
                  ✕ Confirm Fraud
                </button>
                <button
                  disabled={!canDecide || submitting}
                  onClick={() => submitVerdict("FALSE_POSITIVE")}
                  style={{
                    flex: 1, padding: "11px",
                    borderRadius: "8px", border: "1px solid rgba(16,185,129,0.4)",
                    background: canDecide ? "rgba(16,185,129,0.15)" : "var(--surface)",
                    color: canDecide ? "#6ee7b7" : "var(--muted)",
                    fontWeight: 600, fontSize: "13px",
                    cursor: canDecide ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canDecide) (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.25)"; }}
                  onMouseLeave={e => { if (canDecide) (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.15)"; }}
                >
                  ✓ False Positive
                </button>
              </div>

              {detail.status === "PENDING_REVIEW" && !scrolledToBottom && (
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0, lineHeight: "1.5" }}>
                  Decision buttons unlock after reviewing all cited evidence — a deliberate guardrail against over-reliance on the probability score.
                </p>
              )}

              {detail.analyst_verdict && (
                <div style={{
                  padding: "10px 12px", borderRadius: "8px",
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: "12px", color: "#6ee7b7",
                }}>
                  ✓ Resolved as <strong>{detail.analyst_verdict}</strong> — written to fraud case memory for future retrieval.
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
