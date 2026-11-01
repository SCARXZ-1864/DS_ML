"""Score the demo shops' invented reviews with the real Part 2 models and load them into the
database. Re-running replaces each shop's rows (the loader is idempotent).

Run from pipeline/, after make_demo_reviews.py and migrate.py:
    uv run python scripts/load_demo_shops.py
"""

import json
import sys
import time

import spacy

from review_intel import config, demo
from review_intel.aspects.absa import local_absa, local_embedder
from review_intel.aspects.categories import CATEGORIES, roll_up
from review_intel.db.connect import connect
from review_intel.db.load import database_mb, load_shop
from review_intel.db.rows import shop_rows
from review_intel.models.predict import load_sentiment
from review_intel.report import analyze_reviews, min_mentions

sys.stdout.reconfigure(encoding="utf-8")
DEMO_DIR = config.REPO_ROOT / "pipeline" / "demo"

model_name, sentiment = load_sentiment()
absa, embed = local_absa(), local_embedder()
nlp = spacy.load("en_core_web_sm", disable=["ner"])
print("Sentiment model:", model_name)

with connect() as conn:
    for shop_id in sys.argv[1:] or list(demo.SHOPS):
        shop = demo.SHOPS[shop_id]
        lines = (DEMO_DIR / f"{shop_id}.jsonl").read_text(encoding="utf-8").splitlines()
        reviews = [json.loads(line) for line in lines if line.strip()]
        start = time.time()
        report = analyze_reviews(
            reviews, shop["type"], sentiment=sentiment, absa=absa, embed=embed, nlp=nlp
        ).to_dict()
        # Dozens of narrow terms ("biryani", "minute") → the shop type's few categories.
        floor = min_mentions(report["kpis"]["reviews"])
        report = roll_up(report, CATEGORIES[shop["type"]], embed, min_mentions=floor)
        meta = {"id": shop_id, "name": shop["name"], "type": shop["type"], "is_demo": True}
        counts = load_shop(conn, shop_rows(meta, report, model=model_name))
        conn.commit()
        aspects = ", ".join(a["name"] for a in report["aspects"][:6])
        print(f"{shop['name']}: {counts} in {time.time() - start:,.0f} s; aspects: {aspects}")
    print(f"Database size: {database_mb(conn):,.0f} MB of the free plan's 500 MB")
