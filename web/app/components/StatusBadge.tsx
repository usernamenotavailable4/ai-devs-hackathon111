"use client";
import React from "react";

const STATUS_CONFIG: Record<string, { dot: string; bg: string; border: string; text: string; label: string }> = {
  IN_PROGRESS:     { dot: "#d97706", bg: "rgba(217,119,6,0.12)",  border: "rgba(217,119,6,0.3)",  text: "#d97706", label: "In Progress" },
  PENDING_REVIEW:  { dot: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)", text: "#3b82f6", label: "Pending Review" },
  CONFIRMED_FRAUD: { dot: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",  text: "#ef4444", label: "Confirmed Fraud" },
  FALSE_POSITIVE:  { dot: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)", text: "#10b981", label: "False Positive" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { dot: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.3)", text: "#9ca3af", label: status.replace(/_/g, " ") };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "20px",
      background: cfg.bg, color: cfg.text,
      fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap",
      border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}
