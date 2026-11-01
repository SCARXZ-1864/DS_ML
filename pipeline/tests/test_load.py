import json
import uuid

from db_helpers import needs_db
from test_rows import META, REPORT

from review_intel.db.load import load_shop, table_counts
from review_intel.db.rows import shop_rows

DEMO = {**META, "id": "test-demo-shop"}


def count_rows(db, shop_id):
    return table_counts(db, shop_id)


@needs_db
def test_loading_twice_gives_the_same_rows(db):
    first = load_shop(db, shop_rows(DEMO, REPORT))
    again = load_shop(db, shop_rows(DEMO, REPORT))
    assert first == again == {"shops": 1, "shop_months": 2, "aspects": 2, "reviews": 3}
    assert count_rows(db, DEMO["id"]) == first


@needs_db
def test_reloading_replaces_rows_that_are_gone(db):
    load_shop(db, shop_rows(DEMO, REPORT))
    smaller = {**REPORT, "reviews": REPORT["reviews"][:1]}
    load_shop(db, shop_rows(DEMO, smaller))
    assert count_rows(db, DEMO["id"])["reviews"] == 1


@needs_db
def test_stored_review_round_trips(db):
    load_shop(db, shop_rows(DEMO, REPORT))
    date, mentions, ids = db.execute(
        "select date, aspect_mentions, aspect_ids from reviews where shop_id = %s and id = 'r3'",
        (DEMO["id"],),
    ).fetchone()
    assert date is None and ids == ["wait", "food"]
    assert mentions[0] == {"aspectId": "wait", "start": 4, "end": 10, "sentiment": "negative"}
    found = db.execute(
        "select count(*) from reviews where shop_id = %s"
        " and search @@ websearch_to_tsquery('english', 'cold coffee')",
        (DEMO["id"],),
    ).fetchone()[0]
    assert found == 3


def visible_shops(db, role, user_id=None):
    """The shop ids a browser client would see with the given role (RLS applies)."""
    with db.transaction(force_rollback=True):
        claims = json.dumps({"sub": str(user_id), "role": role} if user_id else {"role": role})
        db.execute("select set_config('request.jwt.claims', %s, true)", (claims,))
        db.execute(f"set local role {role}")
        shops = {r[0] for r in db.execute("select id from shops where id like 'test-%'")}
        reviews = {r[0] for r in db.execute("select distinct shop_id from reviews")}
    return shops, reviews


@needs_db
def test_row_level_security_shows_demo_shops_and_only_your_own(db):
    owner, stranger = uuid.uuid4(), uuid.uuid4()
    db.execute("insert into auth.users (id) values (%s), (%s)", (owner, stranger))
    load_shop(db, shop_rows(DEMO, REPORT))
    mine = {**META, "id": "test-owner-shop", "is_demo": False, "owner_id": owner}
    load_shop(db, shop_rows(mine, REPORT))

    for role, user in (("anon", None), ("authenticated", stranger)):
        shops, reviews = visible_shops(db, role, user)
        assert "test-owner-shop" not in shops | reviews, (role, shops, reviews)
        assert "test-demo-shop" in shops & reviews
    shops, reviews = visible_shops(db, "authenticated", owner)
    assert {"test-demo-shop", "test-owner-shop"} <= shops & reviews


@needs_db
def test_browser_roles_cannot_write(db):
    load_shop(db, shop_rows(DEMO, REPORT))
    with db.transaction(force_rollback=True):
        db.execute("set local role anon")
        cur = db.execute("update shops set name = 'Hacked' where id = %s", (DEMO["id"],))
        assert cur.rowcount == 0
