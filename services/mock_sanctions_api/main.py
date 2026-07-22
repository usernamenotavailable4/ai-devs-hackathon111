"""
Mock Sanctions & PEP Screening API.

Contract-compatible stand-in for a real World-Check / Refinitiv style
screening API. Swap SANCTIONS_API_URL to point at the real vendor in
production -- callers (KYC Retriever Agent) only depend on this HTTP
contract, not on any mock-specific behaviour.
"""
import json
import os
from difflib import SequenceMatcher

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Mock Sanctions & PEP API", version="1.0.0")

WATCHLIST_PATH = os.path.join(os.path.dirname(__file__), "watchlist.json")
with open(WATCHLIST_PATH) as f:
    WATCHLIST = json.load(f)


class ScreenRequest(BaseModel):
    name: str
    dob: str | None = None


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


@app.post("/screen")
def screen(req: ScreenRequest):
    matches = []
    for entry in WATCHLIST:
        candidates = [entry["name"]] + entry["aliases"]
        best = max(_similarity(req.name, c) for c in candidates)
        if best >= 0.85:
            matches.append({**entry, "match_score": round(best, 2), "match_strength": "HIGH"})
        elif best >= 0.65:
            matches.append({**entry, "match_score": round(best, 2), "match_strength": "PARTIAL"})

    matches.sort(key=lambda m: m["match_score"], reverse=True)

    if not matches:
        status = "NO_HIT"
    elif matches[0]["match_strength"] == "HIGH":
        status = "HIT"
    else:
        status = "PARTIAL_HIT"

    return {"status": status, "matches": matches[:5]}


@app.get("/healthz")
def health():
    return {"status": "ok"}
