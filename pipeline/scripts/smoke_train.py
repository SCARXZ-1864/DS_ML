"""A cheap end-to-end check of GPU training on Modal: 2,000 reviews, 1 epoch (a few cents).

Run from pipeline/:  uv run python scripts/smoke_train.py
"""

import io
import sys
import time

import modal
import pandas as pd

from review_intel import config
from review_intel.gpu import app, predict_probs, train_sentiment
from review_intel.models.distilbert import TrainConfig, estimate_cost, scores_from_probs
from review_intel.models.metrics import evaluate

# Modal prints "✓"; redirected to a file on Windows, Python would use cp1252 and crash on it.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def parquet(df: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    df[["text", "label", "domain"]].to_parquet(buf, index=False)
    return buf.getvalue()


df = pd.read_parquet(config.INTERIM_DIR / "reviews.parquet")
train = df[df["split"] == "train"].groupby("domain").sample(667, random_state=config.SEED)
val = df[df["split"] == "val"].groupby("domain").sample(134, random_state=config.SEED)
cfg = TrainConfig(epochs=1)
print(f"Estimated cost: ${estimate_cost(len(train), cfg):.2f}")

start = time.time()
with modal.enable_output(), app.run():
    result = train_sentiment.remote(parquet(train), parquet(val), cfg.to_dict())
    probs = predict_probs.remote(val["text"].tolist(), result["run_id"])
pred = [s["label"] for s in scores_from_probs(probs)]
print(result)
print("val macro F1 from predict_probs:", round(evaluate(val["label"], pred)["macro_f1"], 3))
print(f"Wall time {time.time() - start:,.0f} s")
