import json

import pandas as pd
import pytest

from review_intel import config
from review_intel.models.metrics import evaluate, evaluate_by_domain, save_metrics

TRUE = ["negative", "negative", "neutral", "neutral", "positive", "positive"]
PRED = ["negative", "neutral", "neutral", "positive", "positive", "positive"]


def test_evaluate_matches_a_hand_calculation():
    m = evaluate(TRUE, PRED)
    # negative: P 1, R .5, F1 .667 · neutral: P .5, R .5, F1 .5 · positive: P .667, R 1, F1 .8
    assert m["macro_f1"] == pytest.approx((2 / 3 + 0.5 + 0.8) / 3, abs=1e-3)
    assert m["accuracy"] == pytest.approx(4 / 6)
    assert m["per_class"]["negative"] == pytest.approx(
        {"precision": 1.0, "recall": 0.5, "f1": 2 / 3, "support": 2}, abs=1e-3
    )
    # rows = true label, columns = predicted, both in LABELS order
    assert m["confusion"] == [[1, 1, 0], [0, 1, 1], [0, 0, 2]]


def test_evaluate_by_domain_scores_each_domain_separately():
    df = pd.DataFrame({"domain": ["a"] * 6 + ["b"] * 2, "label": TRUE + ["positive"] * 2,
                       "pred": PRED + ["positive"] * 2})
    by = evaluate_by_domain(df, "pred")
    assert set(by) == {"a", "b"}
    assert by["a"]["accuracy"] == pytest.approx(4 / 6)
    assert by["b"]["accuracy"] == 1.0


def test_save_metrics_writes_json(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "REPORTS_DIR", tmp_path)
    path = save_metrics("demo", {"macro_f1": 0.5}, test_size=6)
    saved = json.loads(path.read_text(encoding="utf-8"))
    assert saved["macro_f1"] == 0.5
    assert saved["test_size"] == 6
    assert "created" in saved
    assert path == tmp_path / "metrics" / "demo.json"
    assert path.read_text(encoding="utf-8").endswith("}\n")  # the pre-commit hook wants it
