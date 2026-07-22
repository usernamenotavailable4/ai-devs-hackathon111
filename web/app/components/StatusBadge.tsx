"use client";
import React from "react";

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  IN_PROGRESS: { dot: "#f59e0b", bg: "#451a0320", text: "#fbbf24", label: "In Progress" },
  PENDING_REVIEW: { dot: "#38bdf8", bg: "#0c4a6e20", text: "#7dd3fc", label: "Pending Review" },
  CONFIRMED_FRAUD: { dot: "#ef4444", bg: "#450a0a30", text: "#fca5a5", label: "Confirmed Fraud" },
  FALSE_POSITIVE: { dot: "#10b981", bg: "#02272230", text: "#6ee7b7", label: "False Positive" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { dot: "#64748b", bg: "#1e293b40", text: "#94a3b8", label: status.replace(/_/g, " ") };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "20px",
      background: cfg.bg, color: cfg.text,
      fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap",
      border: `1px solid ${cfg.dot}30`,
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot, flexShrink: 0, boxShadow: `0 0 4px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  );
}
