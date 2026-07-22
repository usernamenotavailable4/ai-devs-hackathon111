import React from "react";
import { CaseSummary } from "../api";
import StatusBadge from "./StatusBadge";

export default function CaseList({
  cases,
  onSelect,
  selectedCaseId,
}: {
  cases: CaseSummary[];
  onSelect: (caseId: string) => void;
  selectedCaseId: string | null;
}) {
  return (
    <div className="overflow-y-auto">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 sticky top-0 bg-slate-950">
          <tr>
            <th className="py-2 px-3">Case</th>
            <th className="py-2 px-3">Customer</th>
            <th className="py-2 px-3">Status</th>
            <th className="py-2 px-3">Fraud %</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr
              key={c.case_id}
              onClick={() => onSelect(c.case_id)}
              className={`cursor-pointer border-b border-slate-900 hover:bg-slate-900 ${
                selectedCaseId === c.case_id ? "bg-slate-900" : ""
              }`}
            >
              <td className="py-2 px-3 font-mono text-xs">{c.case_id}</td>
              <td className="py-2 px-3">{c.customer_id}</td>
              <td className="py-2 px-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-2 px-3">
                {c.fraud_probability !== null ? `${c.fraud_probability}%` : "—"}
              </td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 px-3 text-center text-slate-500">
                No cases yet. Submit a flagged alert to start an investigation.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
