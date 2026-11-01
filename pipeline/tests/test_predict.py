import joblib
import pandas as pd
import pytest

from review_intel import config
from review_intel.models import predict
from review_intel.models.baseline import train_baseline

POS = ["great lovely tasty", "lovely staff great value", "great fresh lovely"]
NEG = ["terrible awful broken", "awful slow terrible", "broken terrible waste"]
NEU = ["okay average fine", "fine nothing special", "average okay"]


@pytest.fixture
def models_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MODELS_DIR", tmp_path)
    return tmp_path


def save_tiny_baseline(path):
    rows = [(t, "positive") for t in POS] + [(t, "negative") for t in NEG]
    rows += [(t, "neutral") for t in NEU]
    df = pd.DataFrame(rows * 5, columns=["text", "label"])
    joblib.dump(train_baseline(df, df, seed=1), path / "baseline.joblib")


def test_falls_back_to_the_baseline_when_no_distilbert_exists(models_dir):
    save_tiny_baseline(models_dir)
    name, score = predict.load_sentiment()
    assert name == "baseline (TF-IDF + logistic regression)"
    out = score(["terrible awful", "great lovely"])
    assert [o["label"] for o in out] == ["negative", "positive"]
    assert -1 <= out[0]["score"] < 0 < out[1]["score"] <= 1
    assert all(0 < o["confidence"] <= 1 for o in out)


def test_says_clearly_when_no_model_is_available(models_dir):
    with pytest.raises(FileNotFoundError, match="notebook 02"):
        predict.load_sentiment()
