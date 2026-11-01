"""Connecting to the database. The address comes from the DATABASE_URL environment variable, or
from the repo's gitignored .env file, so it never appears in code or notebooks."""

from __future__ import annotations

import os
from pathlib import Path

from review_intel import config

ENV_FILE = config.REPO_ROOT / ".env"


def read_env(path: Path) -> dict[str, str]:
    """KEY=value lines of a .env file (comments and blank lines skipped, quotes removed)."""
    if not path.exists():
        return {}
    out = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            out[key.strip()] = value.strip().strip("\"'")
    return out


def database_url() -> str | None:
    return os.environ.get("DATABASE_URL") or read_env(ENV_FILE).get("DATABASE_URL") or None


def connect():
    """A new connection. Work runs in a transaction until conn.commit()."""
    import psycopg

    url = database_url()
    if not url:
        raise RuntimeError("DATABASE_URL is not set (see .env)")
    # Supabase requires TLS; libpq checks it is used ("require") rather than pinning a CA, which
    # Kaspersky's re-signing would break.
    return psycopg.connect(url, sslmode="require", connect_timeout=20)
