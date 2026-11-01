"""Publishing the sentiment model to the Hugging Face Hub, with a model card built from the
measured metrics (never typed by hand, so the card can't drift from the numbers)."""

from __future__ import annotations

from pathlib import Path

from review_intel import config

REPO_NAME = "review-intel-sentiment"
# training_args.bin is left out: it is a pickle (unsafe to load) and holds nothing a user needs.
UPLOAD_FILES = ("config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json")


def files_to_upload(model_dir: Path) -> list[Path]:
    """The model's own files, all of which must exist."""
    missing = [f for f in UPLOAD_FILES if not (Path(model_dir) / f).exists()]
    if missing:
        raise FileNotFoundError(f"{model_dir} is missing {', '.join(missing)}")
    return [Path(model_dir) / f for f in UPLOAD_FILES]


def _row(name: str, m: dict) -> str:
    f1 = [m["per_class"][label]["f1"] for label in config.LABELS]
    return f"| {name} | {m['macro_f1']:.3f} | " + " | ".join(f"{x:.3f}" for x in f1) + " |"


def model_card(test: dict, baseline: dict, holdout: dict, run: dict, repo_id: str) -> str:
    """README.md for the Hub repo: metadata the Hub reads, then results, data and limits.

    `run` is the training run's result.json, so the settings shown are the ones actually used.
    """
    cfg = run["config"]
    best = max(run["history"], key=lambda h: h["val_macro_f1"])
    kept = (
        f"epoch {best['epoch']:.0f} of {len(run['history'])} kept"
        f" (validation macro F1 {best['val_macro_f1']:.3f})"
    )
    domains = "\n".join(
        f"| {d} | {m['macro_f1']:.3f} |" for d, m in sorted(test["by_domain"].items())
    )
    return f"""---
license: other
license_name: research-only
language: en
base_model: {cfg["model"]}
pipeline_tag: text-classification
tags:
- sentiment-analysis
- customer-reviews
model-index:
- name: {REPO_NAME}
  results:
  - task:
      type: text-classification
    dataset:
      name: Yelp restaurants + Amazon grocery and appliances (held-out shops)
      type: custom
    metrics:
    - type: f1
      name: macro F1
      value: {test["macro_f1"]:.3f}
    - type: accuracy
      value: {test["accuracy"]:.3f}
---

# Customer review sentiment (negative / neutral / positive)

DistilBERT fine-tuned to read a customer review and say whether it is **negative, neutral or
positive**. It powers the sentiment part of the Customer Review Intelligence Tool, a student
project that summarises what a shop's customers like and dislike.

```python
from transformers import pipeline

classify = pipeline("text-classification", model="{repo_id}")
classify("The food was great but we waited an hour for a table.")
```

## Results

Tested on {test["test_size"]:,} reviews from shops the model never saw in training.
Macro F1 weighs the three labels equally, so the rare neutral label counts as much as the
common positive one.

| Model | Macro F1 | Negative F1 | Neutral F1 | Positive F1 |
|---|---|---|---|---|
{_row("DistilBERT (this model)", test)}
{_row("TF-IDF + logistic regression", baseline)}

Accuracy {test["accuracy"]:.1%}. By shop type:

| Shop type | Macro F1 |
|---|---|
{domains}

**A shop type it never saw.** Retrained without any appliance reviews, it still scores
{holdout["macro_f1"]:.3f} on appliances, above the baseline trained *with* them
({baseline["by_domain"]["appliances"]["macro_f1"]:.3f}).

## Training

- Fine-tuned from `{cfg["model"]}`: learning rate {cfg["lr"]}, batch size {cfg["batch_size"]},
  up to {cfg["max_len"]} word-pieces per review, at most {cfg["epochs"]} epochs.
- The best epoch was kept: {kept}.
- Training run `{run["run_id"]}`: {run["seconds"] / 60:.0f} minutes on a {run["device"]}
  (Kaggle's free GPU).
- The loss counts rare labels (neutral) for more, so the model doesn't just learn "positive".
- Labels come from star ratings: 1-2 stars negative, 3 neutral, 4-5 positive. Whole shops go to
  one split, so test shops were never seen in training.

## Data

About 150,000 English reviews, 50,000 from each of:
- **Yelp Open Dataset**, restaurants (academic, non-commercial licence);
- **Amazon Reviews 2023** (McAuley Lab), *Grocery and Gourmet Food* and *Appliances* (research use).

No review text is published with this model: only the weights and their scores.

## Limits

- **Neutral is hard** (F1 {test["per_class"]["neutral"]["f1"]:.2f}): 3-star reviews are often
  mixed, and many are really positive or negative.
- Star labels are noisy: a 5-star review can describe a fault.
- English only. Trained on restaurants, groceries and appliances; other shop types may score lower.
- **Research and learning only.** The weights come from Apache-2.0 `distilbert-base-uncased`,
  but the training data's licences don't allow commercial use, so neither does this model.
"""
