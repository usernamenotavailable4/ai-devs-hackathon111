import React from "react";

const COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  PENDING_REVIEW: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  CONFIRMED_FRAUD: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  FALSE_POSITIVE: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = COLORS[status] || "bg-slate-500/20 text-slate-300 border-slate-500/40";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
