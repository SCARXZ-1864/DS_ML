"""Writes one shop's rows (from rows.shop_rows) to the database, replacing what was there.

Idempotent: the shop row is upserted and its other rows are deleted and re-inserted, all inside
one transaction, so a reader never sees half a shop and re-running gives the same row counts.
"""

from __future__ import annotations

from psycopg.types.json import Jsonb

CHILD_TABLES = ("shop_months", "aspects", "reviews")
JSON_COLUMNS = {"headline", "top_complaints", "monthly", "reasons", "aspect_mentions"}


def _value(column: str, value):
    return Jsonb(value) if column in JSON_COLUMNS else value


def _insert(conn, table: str, rows: list[dict], upsert: bool = False) -> None:
    if not rows:
        return
    columns = list(rows[0])
    sql = f"insert into {table} ({', '.join(columns)}) values ({', '.join(['%s'] * len(columns))})"
    if upsert:
        updates = ", ".join(f"{c} = excluded.{c}" for c in columns if c != "id")
        sql += f" on conflict (id) do update set {updates}, updated_at = now()"
    with conn.cursor() as cur:
        cur.executemany(sql, [[_value(c, r[c]) for c in columns] for r in rows])


def load_shop(conn, rows: dict[str, list[dict]]) -> dict[str, int]:
    """Replaces the shop's rows; returns the row count now stored in each table."""
    shop_id = rows["shops"][0]["id"]
    with conn.transaction():
        _insert(conn, "shops", rows["shops"], upsert=True)
        for table in CHILD_TABLES:
            conn.execute(f"delete from {table} where shop_id = %s", (shop_id,))
            _insert(conn, table, rows[table])
    return table_counts(conn, shop_id)


def table_counts(conn, shop_id: str) -> dict[str, int]:
    counts = {"shops": conn.execute("select count(*) from shops where id = %s", (shop_id,))}
    for table in CHILD_TABLES:
        counts[table] = conn.execute(f"select count(*) from {table} where shop_id = %s", (shop_id,))
    return {table: cur.fetchone()[0] for table, cur in counts.items()}


def database_mb(conn) -> float:
    """The whole database's size in MB (the Supabase free plan allows 500)."""
    return conn.execute("select pg_database_size(current_database())").fetchone()[0] / 1e6
