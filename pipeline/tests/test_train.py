"""Runs the real training loop on the CPU with a tiny random model, so a GPU run on Kaggle or
Modal never fails on a code bug after waiting in a queue."""

import json

import pandas as pd
import pytest

from review_intel import config
from review_intel.data.sources import use_system_certificates
from review_intel.models.distilbert import TrainConfig

TINY = "hf-internal-testing/tiny-random-DistilBertForSequenceClassification"


@pytest.fixture(scope="module")
def frames():
    rows = [
        ("great food, lovely staff", "positive", "restaurant"),
        ("awful, cold and rude", "negative", "restaurant"),
        ("it was fine, nothing special", "neutral", "grocery"),
        ("broke after a week", "negative", "appliances"),
    ]
    df = pd.DataFrame(rows * 4, columns=["text", "label", "domain"])
    return df, df.head(6)


@pytest.fixture(scope="module")
def trained(frames, tmp_path_factory):
    from review_intel.models.train import fit_sentiment

    use_system_certificates()
    cfg = TrainConfig(model=TINY, epochs=1, batch_size=4, fp16=False, max_len=32).to_dict()
    out = tmp_path_factory.mktemp("run")
    return out, fit_sentiment(*frames, cfg, out)


def test_training_saves_a_model_and_its_history(trained):
    out, result = trained
    assert (out / "model" / "config.json").exists()
    assert not (out / "checkpoints").exists()  # only the best model is kept
    assert json.loads((out / "result.json").read_text())["run_id"] == result["run_id"]
    assert len(result["history"]) == 1
    assert 0 <= result["best_val_macro_f1"] <= 1
    assert result["n_train"] == 16


def test_a_trained_model_gives_probabilities_in_label_order(trained):
    from review_intel.models.train import predict_probs

    out, _ = trained
    probs = predict_probs(out / "model", ["lovely", "terrible service", "ok"], batch_size=2)
    assert len(probs) == 3
    for p in probs:
        assert len(p) == len(config.LABELS)
        assert sum(p) == pytest.approx(1.0, abs=1e-4)


def test_run_id_depends_on_data_and_settings(frames):
    from review_intel.models.train import run_id

    train, val = frames
    cfg = TrainConfig().to_dict()
    assert run_id(train, val, cfg) == run_id(train, val, cfg)
    assert run_id(train, val, cfg) != run_id(train, val, {**cfg, "epochs": 1})


def test_training_stops_at_its_time_limit_and_keeps_what_it_has(frames, tmp_path):
    """Final review: the 1-hour limit only applied on Modal; a hung Kaggle run could use up to
    12 hours of the 30-hour weekly GPU allowance."""
    from review_intel.models.train import fit_sentiment

    use_system_certificates()
    cfg = TrainConfig(model=TINY, epochs=3, batch_size=4, fp16=False, max_len=32, timeout_s=0)
    result = fit_sentiment(*frames, cfg.to_dict(), tmp_path)
    assert result["timed_out"] is True
    assert len(result["history"]) == 1  # evaluated once when it stopped, not three epochs
    assert (tmp_path / "model" / "config.json").exists()
