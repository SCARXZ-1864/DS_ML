import pytest

from review_intel import config
from review_intel.models.distilbert import (
    TrainConfig,
    class_weights,
    estimate_cost,
    scores_from_probs,
)


def test_class_weights_favour_the_rare_label_and_average_one():
    weights = class_weights(["positive"] * 8 + ["negative"] * 2)
    by_label = dict(zip(config.LABELS, weights, strict=True))
    assert by_label["negative"] > by_label["positive"]
    present = [by_label["negative"], by_label["positive"]]
    assert sum(present) / len(present) == pytest.approx(1.0)


def test_class_weights_handle_a_label_missing_from_the_data():
    weights = class_weights(["positive", "negative"])
    assert dict(zip(config.LABELS, weights, strict=True))["neutral"] == 0.0


def test_training_config_has_timeout_and_budget():
    cfg = TrainConfig()
    assert cfg.timeout_s <= 3600
    assert estimate_cost(120_000, cfg) < config.MODAL_BUDGET_USD
    assert estimate_cost(120_000, cfg) > estimate_cost(2_000, cfg)


def test_scores_turn_probabilities_into_label_score_and_confidence():
    # probabilities in LABELS order: negative, neutral, positive
    out = scores_from_probs([[0.1, 0.2, 0.7], [0.6, 0.3, 0.1]])
    assert out[0] == {
        "label": "positive",
        "score": pytest.approx(0.6),
        "confidence": pytest.approx(0.7),
    }
    assert out[1]["label"] == "negative"
    assert out[1]["score"] == pytest.approx(-0.5)
