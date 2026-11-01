"""Database tests run against the real Supabase project, each inside a transaction that is rolled
back, so they leave nothing behind. They are skipped when DATABASE_URL isn't set (as in CI)."""

import pytest

from review_intel.db.connect import database_url

needs_db = pytest.mark.skipif(database_url() is None, reason="DATABASE_URL is not set")
