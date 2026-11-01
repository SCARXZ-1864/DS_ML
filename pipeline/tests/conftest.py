import pytest


@pytest.fixture
def db():
    """A connection whose work is rolled back at the end of the test."""
    from review_intel.db.connect import connect

    conn = connect()
    try:
        with conn.transaction(force_rollback=True):
            yield conn
    finally:
        conn.close()
