"""The Hugging Face model card and upload: the card must state the real scores and the licence
limits, and only the model's own files may leave the laptop."""

import pytest

from review_intel.models import hub


def metrics(macro_f1, neg=0.8, neu=0.4, pos=0.9, by_domain=None):
    return {
        "test_size": 14996,
        "macro_f1": macro_f1,
        "accuracy": 0.887,
        "per_class": {
            "negative": {"f1": neg},
            "neutral": {"f1": neu},
            "positive": {"f1": pos},
        },
        "by_domain": {d: {"macro_f1": f} for d, f in (by_domain or {}).items()},
    }


RUN = {
    "run_id": "9501c6c56b68",
    "config": {
        "model": "distilbert-base-uncased",
        "lr": 5e-05,
        "epochs": 3,
        "batch_size": 32,
        "max_len": 256,
    },
    "history": [
        {"epoch": 1.0, "val_macro_f1": 0.689},
        {"epoch": 2.0, "val_macro_f1": 0.766},
        {"epoch": 3.0, "val_macro_f1": 0.759},
    ],
    "seconds": 1621,
    "device": "Tesla T4",
}


@pytest.fixture
def card():
    return hub.model_card(
        test=metrics(
            0.7613, 0.83745, 0.49230, 0.95417, {"appliances": 0.7383, "restaurant": 0.776}
        ),
        baseline=metrics(0.7321, by_domain={"appliances": 0.688}),
        holdout=metrics(0.6993),
        run=RUN,
        repo_id="someone/review-intel-sentiment",
    )


def test_card_has_hub_metadata_first(card):
    assert card.startswith("---\n")
    meta = card.split("---\n")[1]
    # Not apache-2.0: the training data's licences rule out commercial use.
    assert "license: other" in meta
    assert "license_name: research-only" in meta
    assert "base_model: distilbert-base-uncased" in meta
    assert "pipeline_tag: text-classification" in meta
    assert "value: 0.761" in meta  # the macro F1, so the Hub shows it


def test_card_states_the_measured_scores(card):
    assert "| DistilBERT (this model) | 0.761 | 0.837 | 0.492 | 0.954 |" in card
    assert "| TF-IDF + logistic regression | 0.732 |" in card
    assert "appliances | 0.738" in card
    assert "0.699" in card and "0.688" in card  # never-saw-appliances vs baseline
    assert "9501c6c56b68" in card


def test_card_training_settings_come_from_the_run(card):
    """The first draft typed the learning rate by hand and got it wrong (2e-5 for 5e-5)."""
    assert "learning rate 5e-05" in card
    assert "batch size 32" in card
    assert "epoch 2 of 3 kept (validation macro F1 0.766)" in card
    assert "27 minutes on a Tesla T4" in card


def test_card_usage_example_loads_this_repo(card):
    assert 'model="someone/review-intel-sentiment"' in card


def test_card_names_the_data_licences_and_says_no_text_is_shared(card):
    assert "Yelp Open Dataset" in card and "Amazon Reviews 2023" in card
    assert "non-commercial" in card
    assert "No review text is published with this model" in card


def test_only_the_model_files_are_uploaded(tmp_path):
    for name in [*hub.UPLOAD_FILES, "training_args.bin", "notes.txt"]:
        (tmp_path / name).write_text("x")
    assert sorted(p.name for p in hub.files_to_upload(tmp_path)) == sorted(hub.UPLOAD_FILES)


def test_a_missing_model_file_stops_the_upload(tmp_path):
    (tmp_path / "config.json").write_text("{}")
    with pytest.raises(FileNotFoundError, match="model.safetensors"):
        hub.files_to_upload(tmp_path)
