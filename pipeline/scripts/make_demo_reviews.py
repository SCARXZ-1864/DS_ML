"""Write the demo shops' invented reviews with Gemini (see review_intel/demo.py for why).

Needs GEMINI_API_KEY (in .env). Run from pipeline/:
    uv run python scripts/make_demo_reviews.py                 # all three shops
    uv run python scripts/make_demo_reviews.py saffron-table   # one shop

Writes pipeline/demo/<shop>.jsonl (committed: the text is ours). Finished batches are cached in
data/processed/demo_batches/, so a run that stops halfway resumes where it stopped.
"""

import json
import os
import sys
import time

from google import genai
from google.genai import types
from pydantic import BaseModel

from review_intel import config, demo
from review_intel.data.sources import use_system_certificates
from review_intel.db.connect import ENV_FILE, read_env

sys.stdout.reconfigure(encoding="utf-8")
use_system_certificates()

# The alias follows Google's current Flash model: pinned versions get retired for new accounts.
MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
BATCH = 25
CACHE = config.PROCESSED_DIR / "demo_batches"
OUT = config.REPO_ROOT / "pipeline" / "demo"


class Written(BaseModel):
    text: str


key = os.environ.get("GEMINI_API_KEY") or read_env(ENV_FILE).get("GEMINI_API_KEY")
if not key:
    sys.exit("GEMINI_API_KEY is not set: add it to .env (see README, Part 3).")
client = genai.Client(api_key=key)


def write_batch(shop: dict, specs: list[dict]) -> list[dict]:
    for attempt in range(4):
        try:
            res = client.models.generate_content(
                model=MODEL,
                contents=demo.prompt(shop, specs),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=list[Written],
                    temperature=1.0,
                ),
            )
            return demo.accept(specs, json.loads(res.text))
        except genai.errors.ClientError as e:
            if e.code != 429:  # a wrong model or key won't fix itself; only rate limits are retried
                raise
            print(f"  rate limited; retrying in {15 * 2**attempt} s")
            time.sleep(15 * 2**attempt)
        except (genai.errors.ServerError, ValueError) as e:  # an overloaded server or a bad batch
            wait = 15 * 2**attempt
            print(f"  batch failed ({type(e).__name__}: {str(e)[:120]}); retrying in {wait} s")
            time.sleep(wait)
    raise RuntimeError(f"{shop['id']}: a batch failed 4 times")


CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
for shop_id in sys.argv[1:] or list(demo.SHOPS):
    shop = demo.SHOPS[shop_id]
    specs = demo.plan_reviews(shop)
    rows = []
    for start in range(0, len(specs), BATCH):
        cached = CACHE / f"{shop_id}-{start:04d}.json"
        if cached.exists():
            batch = json.loads(cached.read_text(encoding="utf-8"))
        else:
            batch = write_batch(shop, specs[start : start + BATCH])
            cached.write_text(json.dumps(batch, ensure_ascii=False), encoding="utf-8")
            print(f"{shop_id}: {start + len(batch)}/{len(specs)} written")
        rows += batch
    path = OUT / f"{shop_id}.jsonl"
    text = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"{shop_id}: {len(rows)} reviews → {path.relative_to(config.REPO_ROOT)}")
