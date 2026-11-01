import pandas as pd

from review_intel.models.baseline import C_GRID, top_terms, train_baseline

POS = ["great lovely tasty", "lovely staff great value", "great fresh lovely", "tasty and great"]
NEG = ["terrible awful broken", "awful slow terrible", "broken terrible waste", "awful rude cold"]
NEU = ["okay average fine", "fine nothing special", "average okay", "it was fine okay"]


def frame(repeat):
    rows = [(t, "positive") for t in POS] + [(t, "negative") for t in NEG]
    rows += [(t, "neutral") for t in NEU]
    return pd.DataFrame(rows * repeat, columns=["text", "label"])


def test_baseline_learns_obvious_words():
    model = train_baseline(frame(5), frame(1), seed=1)
    pred = model.predict(["terrible awful", "great lovely", "okay fine average"])
    assert list(pred) == ["negative", "positive", "neutral"]
    assert model.chosen_C in C_GRID


def test_top_terms_lists_words_that_push_towards_each_label():
    model = train_baseline(frame(5), frame(1), seed=1)
    terms = top_terms(model, n=3)
    assert "terrible" in terms["negative"] or "awful" in terms["negative"]
    assert "great" in terms["positive"] or "lovely" in terms["positive"]
