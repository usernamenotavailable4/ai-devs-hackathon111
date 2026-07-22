#!/usr/bin/env bash
# Convenience wrapper: brings the stack up (if not already), seeds data, runs the demo case.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Starting infrastructure (docker compose up -d)..."
docker compose up -d --build

echo "==> Waiting for Postgres/Qdrant/Pub/Sub emulator to be ready..."
sleep 10

echo "==> Seeding Postgres transaction history..."
python3 scripts/seed_postgres.py

echo "==> Seeding Qdrant fraud case memory..."
python3 scripts/seed_qdrant.py

echo "==> Running end-to-end demo case..."
python3 scripts/run_demo_case.py

echo "==> Dashboard: http://localhost:5173"
