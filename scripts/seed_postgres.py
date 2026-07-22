#!/usr/bin/env python3
"""
Seeds the local Postgres (Cloud Spanner substitute) with synthetic
transaction history so the Transaction Analyzer Agent has real data to
reason over.

Run from the repo root, against the docker-compose-exposed Postgres port:
    pip install -r scripts/requirements.txt
    python scripts/seed_postgres.py
"""
import json
import os

import psycopg2

DB_CONF = dict(
    host=os.environ.get("POSTGRES_HOST", "localhost"),
    port=int(os.environ.get("POSTGRES_PORT", 5432)),
    dbname=os.environ.get("POSTGRES_DB", "fraud_investigator"),
    user=os.environ.get("POSTGRES_USER", "fraud_admin"),
    password=os.environ.get("POSTGRES_PASSWORD", "changeme_local_dev"),
)

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    with open(os.path.join(HERE, "fixtures", "transactions.json")) as f:
        transactions = json.load(f)

    conn = psycopg2.connect(**DB_CONF)
    try:
        with conn.cursor() as cur:
            for t in transactions:
                cur.execute(
                    """
                    INSERT INTO transactions
                        (transaction_id, account_id, customer_id, amount, currency, channel,
                         counterparty, geography, transaction_ts, flagged, flag_reason)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (transaction_id) DO NOTHING
                    """,
                    (t["transaction_id"], t["account_id"], t["customer_id"], t["amount"], t["currency"],
                     t["channel"], t["counterparty"], t["geography"], t["transaction_ts"],
                     t["flagged"], t.get("flag_reason")),
                )
        conn.commit()
        print(f"Seeded {len(transactions)} transactions.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
