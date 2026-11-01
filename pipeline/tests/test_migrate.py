from review_intel.db import migrate
from review_intel.db.connect import read_env

from db_helpers import needs_db


def test_pending_lists_unapplied_migrations_in_order(tmp_path):
    for name in ("0002_b.sql", "0001_a.sql", "notes.txt", "0003_c.sql"):
        (tmp_path / name).write_text("select 1;", encoding="utf-8")
    assert [p.name for p in migrate.pending(tmp_path, applied={"0001_a.sql"})] == [
        "0002_b.sql",
        "0003_c.sql",
    ]


def test_read_env_parses_lines_and_ignores_comments(tmp_path):
    env = tmp_path / ".env"
    env.write_text('# a comment\nA=1\nB = "two"\n\nC=x=y\nEMPTY=\n', encoding="utf-8")
    assert read_env(env) == {"A": "1", "B": "two", "C": "x=y", "EMPTY": ""}


def test_read_env_of_a_missing_file_is_empty(tmp_path):
    assert read_env(tmp_path / "nope") == {}


@needs_db
def test_migrations_are_all_applied_and_rerunning_applies_nothing(db):
    assert migrate.run(db) == []  # the real project is migrated: nothing left to apply
    names = {r[0] for r in db.execute("select name from schema_migrations")}
    assert {p.name for p in migrate.MIGRATIONS_DIR.glob("*.sql")} <= names


@needs_db
def test_every_table_has_row_level_security(db):
    rows = db.execute(
        "select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace"
        " where n.nspname = 'public' and c.relkind = 'r'"
    ).fetchall()
    assert rows and all(rls for _, rls in rows), rows
