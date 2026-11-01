"""Applies db/migrations/*.sql in name order, once each, recording them in schema_migrations."""

from __future__ import annotations

from pathlib import Path

from review_intel import config

MIGRATIONS_DIR = config.REPO_ROOT / "db" / "migrations"


def pending(folder: Path, applied: set[str]) -> list[Path]:
    return [p for p in sorted(folder.glob("*.sql")) if p.name not in applied]


def run(conn, folder: Path = MIGRATIONS_DIR) -> list[str]:
    """Applies what hasn't run yet, each file in its own transaction; returns their names."""
    conn.execute(
        "create table if not exists schema_migrations"
        " (name text primary key, applied_at timestamptz not null default now())"
    )
    conn.execute("alter table schema_migrations enable row level security")
    applied = {r[0] for r in conn.execute("select name from schema_migrations")}
    done = []
    for path in pending(folder, applied):
        with conn.transaction():
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("insert into schema_migrations (name) values (%s)", (path.name,))
        done.append(path.name)
    return done
