import React, { useState } from "react";
import { api } from "../api";

const DEMO_CUSTOMERS = [
  { customer_id: "CUST-1000", account_id: "ACC-5000", flagged_transaction_id: "TXN-000451",
    narrative: "High-value wire to an offshore holding entity in a high-risk geography, first occurrence in this account's 12-month history." },
  { customer_id: "CUST-1004", account_id: "ACC-5004", flagged_transaction_id: "TXN-000452",
    narrative: "Three transfers just under the $10,000 reporting threshold within 48 hours, consistent with structuring." },
  { customer_id: "CUST-1009", account_id: "ACC-5009", flagged_transaction_id: "TXN-000453",
    narrative: "Sudden high-value P2P transfer to a brand-new, unknown payee, deviating sharply from established spending pattern." },
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
    <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Submit a flagged transaction alert</h3>
      <select
        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 mb-3"
        value={selected.customer_id}
        onChange={(e) =>
          setSelected(DEMO_CUSTOMERS.find((d) => d.customer_id === e.target.value) || DEMO_CUSTOMERS[0])
        }
      >
        {DEMO_CUSTOMERS.map((d) => (
          <option key={d.customer_id} value={d.customer_id}>
            {d.customer_id} / {d.account_id} — {d.flagged_transaction_id}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500 mb-3">{selected.narrative}</p>
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium rounded px-3 py-2"
      >
        {submitting ? "Dispatching to agent swarm…" : "Start Investigation"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
    </div>
  );
}
