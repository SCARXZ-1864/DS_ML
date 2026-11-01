"""Load the best available sentiment model as a function: texts → [{label, score, confidence}].

DistilBERT (notebook 03) is used when a trained copy is on disk; otherwise the TF-IDF baseline
(notebook 02). Whatever is loaded, its name comes back too, so a report always says which model
produced it.
"""

from __future__ import annotations

from collections.abc import Callable

from review_intel import config
from review_intel.models.distilbert import scores_from_probs

Sentiment = Callable[[list[str]], list[dict]]


def _baseline() -> Sentiment:
    import joblib

    model = joblib.load(config.MODELS_DIR / "baseline.joblib")
    order = [list(model.classes_).index(label) for label in config.LABELS]

    def score(texts: list[str]) -> list[dict]:
        probs = model.predict_proba(texts)[:, order]
        return scores_from_probs(probs.tolist())

    return score


def _distilbert(path) -> Sentiment:
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tok = AutoTokenizer.from_pretrained(path)
    model = AutoModelForSequenceClassification.from_pretrained(path).eval()

    def score(texts: list[str]) -> list[dict]:
        probs: list[list[float]] = []
        with torch.inference_mode():
            for s in range(0, len(texts), 32):
                enc = tok(
                    texts[s : s + 32],
                    truncation=True,
                    max_length=256,
                    padding=True,
                    return_tensors="pt",
                )
                probs += torch.softmax(model(**enc).logits, dim=-1).tolist()
        return scores_from_probs(probs)

    return score


def load_sentiment() -> tuple[str, Sentiment]:
    latest = config.MODELS_DIR / "distilbert" / "LATEST"
    if latest.exists():
        path = config.MODELS_DIR / "distilbert" / latest.read_text().strip()
        return f"DistilBERT (run {path.name})", _distilbert(path)
    if (config.MODELS_DIR / "baseline.joblib").exists():
        return "baseline (TF-IDF + logistic regression)", _baseline()
    raise FileNotFoundError(
        "No sentiment model found: run notebook 02 (baseline) or 03 (DistilBERT) first."
    )
