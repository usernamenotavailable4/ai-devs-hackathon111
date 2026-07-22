#!/usr/bin/env python3
"""
End-to-end demo: submits a flagged transaction alert to the API Gateway,
polls until the Report Generator has produced a final report, and prints
the result -- the "does this actually work" proof a judge can run in
under a minute.

Usage:
    python scripts/run_demo_case.py
"""
import json
import os
import sys
import time

import requests

API_BASE = os.environ.get("API_BASE", "http://localhost:8000")
API_KEY = os.environ.get("API_GATEWAY_KEY", "demo-key-change-me")

HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

DEMO_ALERT = {
    "customer_id": "CUST-1000",
    "account_id": "ACC-5000",
    "flagged_transaction_id": "TXN-000451",
    "narrative": (
        "High-value wire to an offshore holding entity in a high-risk geography, "
        "first occurrence in this account's 12-month history."
    ),
    "metadata_filter": {"fraud_type": "MULE_ACCOUNT"},
}


def main():
    print(f"Submitting flagged alert to {API_BASE}/alerts ...")
    resp = requests.post(f"{API_BASE}/alerts", headers=HEADERS, json=DEMO_ALERT, timeout=15)
    resp.raise_for_status()
    case_id = resp.json()["case_id"]
    print(f"Case created: {case_id}. Polling for the Report Generator's output...")

    deadline = time.time() + 60
    while time.time() < deadline:
        case = requests.get(f"{API_BASE}/cases/{case_id}", headers=HEADERS, timeout=15).json()
        if case.get("report_json"):
            print("\n=== Investigation Report ===")
            print(json.dumps(case["report_json"], indent=2))
            print(f"\nFull audit trail: GET {API_BASE}/cases/{case_id}/audit")
            print(f"Audit chain integrity check: GET {API_BASE}/audit/verify")
            return 0
        time.sleep(2)

    print("Timed out waiting for report. Check `docker compose logs` for the agent containers.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
