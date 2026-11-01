"""How every sentiment model is scored, so all of them are compared the same way."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)

from review_intel import config


def evaluate(
    y_true: Sequence[str], y_pred: Sequence[str], labels: Sequence[str] = config.LABELS
) -> dict:
    """Macro F1 (the headline number: every label counts equally, so a model can't hide a weak
    neutral class behind the many positive reviews), accuracy, per-label scores and the
    confusion matrix (rows = true label, columns = predicted, in `labels` order)."""
    labels = list(labels)
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    return {
        "macro_f1": float(
            f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)
        ),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "per_class": {
            lab: {
                "precision": float(p[i]),
                "recall": float(r[i]),
                "f1": float(f[i]),
                "support": int(s[i]),
            }
            for i, lab in enumerate(labels)
        },
        "confusion": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
    }


def evaluate_by_domain(
    df: pd.DataFrame, pred_col: str, label_col: str = "label"
) -> dict[str, dict]:
    """The same scores for each domain on its own, so a strong domain can't hide a weak one."""
    return {d: evaluate(part[label_col], part[pred_col]) for d, part in df.groupby("domain")}


def save_metrics(name: str, metrics: dict, *, test_size: int) -> Path:
    """Writes pipeline/reports/metrics/<name>.json with when it was made and the test-set size."""
    out = config.REPORTS_DIR / "metrics" / f"{name}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "created": datetime.now(UTC).isoformat(timespec="seconds"),
        "test_size": test_size,
        **metrics,
    }
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")  # newline: pre-commit
    return out
