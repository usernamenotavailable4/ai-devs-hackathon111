import React, { useEffect, useRef, useState } from "react";
import { CaseDetail as CaseDetailType, api } from "../api";
import StatusBadge from "./StatusBadge";

export default function CaseDetail({
  caseId,
  onResolved,
}: {
  caseId: string;
  onResolved: () => void;
}) {
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
    const interval = setInterval(load, 3000); // poll until report_json appears
    return () => clearInterval(interval);
  }, [caseId]);

  const onEvidenceScroll = () => {
    const el = evidenceRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) {
      setScrolledToBottom(true);
    }
  };

  const submitVerdict = async (verdict: string) => {
    setSubmitting(true);
    try {
      await api.submitVerdict(caseId, {
        verdict,
        notes,
        fraud_type: detail?.report_json?.recommended_action === "ESCALATE_SAR" ? "MULE_ACCOUNT" : undefined,
      });
      onResolved();
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return <div className="p-6 text-slate-500 text-sm">Loading case…</div>;
  }

  const report = detail.report_json;
  const canDecide = scrolledToBottom && detail.status === "PENDING_REVIEW";

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm text-slate-300">{detail.case_id}</h2>
        <StatusBadge status={detail.status} />
      </div>

      {!report && (
        <div className="text-sm text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded p-3">
          Agent swarm is investigating (KYC Retriever, Transaction Analyzer, Fraud Case Search running in
          parallel via Pub/Sub → Report Generator synthesizing)... this view polls every 3s.
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-slate-800 rounded p-3">
              <div className="text-xs text-slate-500">Fraud Probability</div>
              <div className="text-2xl font-semibold text-slate-100">{report.fraud_probability}%</div>
            </div>
            <div className="border border-slate-800 rounded p-3">
              <div className="text-xs text-slate-500">Recommended Action</div>
              <div className="text-sm font-medium text-sky-300">{report.recommended_action.replace(/_/g, " ")}</div>
            </div>
            <div className="border border-slate-800 rounded p-3">
              <div className="text-xs text-slate-500">AI Confidence</div>
              <div className="text-sm font-medium text-slate-200">{report.confidence}</div>
            </div>
          </div>

          <div className="border border-slate-800 rounded p-3">
            <div className="text-xs text-slate-500 mb-1">Narrative</div>
            <p className="text-sm text-slate-200 leading-relaxed">{report.narrative}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-slate-500">
                Evidence Citations ({report.evidence_citations.length}) — scroll to the bottom to enable a decision
              </div>
              {!scrolledToBottom && <span className="text-xs text-amber-400">scroll ↓</span>}
            </div>
            <div
              ref={evidenceRef}
              onScroll={onEvidenceScroll}
              className="border border-slate-800 rounded max-h-48 overflow-y-auto divide-y divide-slate-900"
            >
              {report.evidence_citations.map((e, i) => (
                <div key={i} className="p-2 text-xs">
                  <span className="font-mono text-sky-400">{e.evidence_id}</span>{" "}
                  <span className="text-slate-500">({e.source})</span>
                  <div className="text-slate-300">{e.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setDemasked(true);
              api.demask(caseId);
            }}
            className="text-xs text-slate-400 underline"
          >
            {demasked ? "PII de-masked (view logged to audit trail)" : "De-mask customer PII (IAM-gated, logged)"}
          </button>

          <div className="space-y-2">
            <textarea
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200"
              rows={2}
              placeholder="Analyst notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={detail.status !== "PENDING_REVIEW"}
            />
            <div className="flex gap-2">
              <button
                disabled={!canDecide || submitting}
                onClick={() => submitVerdict("CONFIRMED_FRAUD")}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-medium rounded px-3 py-2"
              >
                Confirm Fraud
              </button>
              <button
                disabled={!canDecide || submitting}
                onClick={() => submitVerdict("FALSE_POSITIVE")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium rounded px-3 py-2"
              >
                False Positive
              </button>
            </div>
            {detail.status === "PENDING_REVIEW" && !scrolledToBottom && (
              <p className="text-xs text-slate-500">
                Decision buttons unlock once you've scrolled through all cited evidence — a deliberate guardrail
                against analyst over-reliance on the probability score alone.
              </p>
            )}
            {detail.analyst_verdict && (
              <p className="text-xs text-slate-500">
                Resolved as <span className="text-slate-300">{detail.analyst_verdict}</span> — written back to
                Qdrant fraud case memory for future retrieval.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
