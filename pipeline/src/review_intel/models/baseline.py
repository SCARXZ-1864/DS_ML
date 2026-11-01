"""The baseline: TF-IDF word features + logistic regression.

A simple, fast, explainable yardstick. Every fancier model has to beat it on the same test set,
otherwise it isn't worth its cost.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from review_intel.models.metrics import evaluate

# The first full run picked 4, the top of (0.5, 1, 2, 4), so the range now goes one step higher.
C_GRID = (0.5, 1, 2, 4, 8)


def _pipeline(C: float, seed: int) -> Pipeline:
    return Pipeline(
        [
            # Words and phrases of up to 3 words, so "not good" and "would not recommend" are
            # learned as units. Character n-grams were left out: on 120k reviews they need ~1 GB.
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 3),
                    min_df=2,
                    max_features=300_000,
                    sublinear_tf=True,
                    dtype=np.float32,
                ),
            ),
            # Balanced class weights: neutral is rare, so its mistakes count for more.
            (
                "clf",
                LogisticRegression(C=C, class_weight="balanced", max_iter=2000, random_state=seed),
            ),
        ]
    )


def train_baseline(train_df: pd.DataFrame, val_df: pd.DataFrame, seed: int) -> Pipeline:
    """Tries each C (how strongly the model is held back from memorising) and keeps the one with
    the best validation macro F1. The test set is never looked at here."""
    best, best_f1 = None, -1.0
    for C in C_GRID:
        model = _pipeline(C, seed).fit(train_df["text"], train_df["label"])
        f1 = evaluate(val_df["label"], model.predict(val_df["text"]))["macro_f1"]
        if f1 > best_f1:
            best, best_f1 = model, f1
            best.chosen_C = C
            best.val_macro_f1 = f1
    return best


def top_terms(model: Pipeline, n: int = 15) -> dict[str, list[str]]:
    """The words and phrases that push hardest towards each label."""
    vocab = np.array(model.named_steps["tfidf"].get_feature_names_out())
    clf = model.named_steps["clf"]
    return {
        label: vocab[np.argsort(clf.coef_[i])[::-1][:n]].tolist()
        for i, label in enumerate(clf.classes_)
    }
