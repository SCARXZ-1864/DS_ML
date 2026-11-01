"""Bring the database schema up to date (db/migrations/*.sql). Safe to re-run.

Run from pipeline/:
    uv run python scripts/migrate.py
"""

import sys

from review_intel.db import migrate
from review_intel.db.connect import connect

sys.stdout.reconfigure(encoding="utf-8")
with connect() as conn:
    done = migrate.run(conn)
    conn.commit()
print("Applied: " + ", ".join(done) if done else "Up to date: nothing to apply.")
