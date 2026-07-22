import React, { useEffect, useState } from "react";
import { api, CaseSummary } from "./api";
import CaseList from "./components/CaseList";
import CaseDetail from "./components/CaseDetail";
import NewAlertForm from "./components/NewAlertForm";

export default function App() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<{ valid: boolean; detail: string } | null>(null);

  const refresh = () => {
    api.listCases().then((r) => setCases(r.cases)).catch(() => {});
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const runVerify = async () => {
    setAuditStatus({ valid: true, detail: "Verifying hash chain…" });
    try {
      const res = await api.verifyAuditChain();
      setAuditStatus(
        res.valid
          ? { valid: true, detail: `Chain valid across ${res.entries_checked} entries.` }
          : { valid: false, detail: `Tamper detected at seq ${res.broken_at_seq}: ${res.reason}` }
      );
    } catch (e: any) {
      setAuditStatus({ valid: false, detail: e.message });
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">AI Fraud & Anomaly Investigator</h1>
          <p className="text-xs text-slate-500">Analyst Dashboard — BFSI Fraud Investigation Agent</p>
        </div>
        <div className="flex items-center gap-3">
          {auditStatus && (
            <span className={`text-xs ${auditStatus.valid ? "text-emerald-400" : "text-rose-400"}`}>
              {auditStatus.detail}
            </span>
          )}
          <button
            onClick={runVerify}
            className="text-xs border border-slate-700 hover:border-slate-500 rounded px-3 py-1.5 text-slate-300"
          >
            Verify Audit Log Integrity
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r border-slate-800 flex flex-col">
          <div className="p-4">
            <NewAlertForm onSubmitted={(caseId) => { refresh(); setSelectedCaseId(caseId); }} />
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            <CaseList cases={cases} onSelect={setSelectedCaseId} selectedCaseId={selectedCaseId} />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedCaseId ? (
            <CaseDetail caseId={selectedCaseId} onResolved={refresh} />
          ) : (
            <div className="p-6 text-slate-500 text-sm">
              Select a case, or submit a new flagged alert to start an investigation.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
