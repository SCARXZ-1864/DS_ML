import json
import zipfile
from pathlib import Path

import pandas as pd

from review_intel.kaggle_job import job, stage_dataset, stage_kernel
from review_intel.models.distilbert import TrainConfig


def reviews():
    return pd.DataFrame(
        {
            "review_id": ["a", "b", "c", "d"],
            "text": ["good", "bad", "ok", "fine"],
            "label": ["positive", "negative", "neutral", "positive"],
            "domain": ["restaurant", "grocery", "appliances", "restaurant"],
            "shop_name": ["Secret Diner"] * 4,
            "split": ["train", "val", "test", "test"],
        }
    )


def test_dataset_holds_only_what_training_needs(tmp_path):
    folder = stage_dataset(reviews(), tmp_path / "ds", user="someone")
    test = pd.read_parquet(folder / "test.parquet")
    assert list(test.columns) == ["text", "label", "domain"]
    assert test["text"].tolist() == ["ok", "fine"]  # same order as the local test split
    meta = json.loads((folder / "dataset-metadata.json").read_text())
    assert meta["id"] == "someone/review-intel-train"
    names = zipfile.ZipFile(folder / "review_intel.zip").namelist()
    assert "review_intel/models/train.py" in names
    assert not any("__pycache__" in n for n in names)


def test_kernel_is_private_with_a_gpu_and_our_dataset(tmp_path):
    jobs = [job("full", TrainConfig()), job("holdout", TrainConfig(), holdout="appliances")]
    folder = stage_kernel(jobs, tmp_path / "k", user="someone")
    meta = json.loads((folder / "kernel-metadata.json").read_text())
    assert meta["is_private"] is True
    assert meta["enable_gpu"] is True
    assert meta["enable_internet"] is True  # downloads the base model from Hugging Face
    assert meta["dataset_sources"] == ["someone/review-intel-train"]
    assert meta["id"] == "someone/review-intel-gpu"  # titles are shared with datasets
    assert meta["title"] != "review-intel-train"
    script = (folder / meta["code_file"]).read_text(encoding="utf-8")
    compile(script, "run.py", "exec")  # a syntax error would only show after the GPU queue
    assert '"holdout": "appliances"' in script


def test_a_smoke_job_samples_per_domain():
    j = job("smoke", TrainConfig(epochs=1), sample_per_domain=667)
    assert j["sample_per_domain"] == 667
    assert j["cfg"]["epochs"] == 1
    assert j["holdout"] is None


class FakeClient:
    """Stands in for the Kaggle API: kernels_output writes what a finished notebook would."""

    def __init__(self, files):
        self.files = files

    def get_config_value(self, name):
        return "someone"

    def kernels_output(self, ref, path, force=True, quiet=True):
        for name, text in self.files.items():
            (Path(path) / name).parent.mkdir(parents=True, exist_ok=True)
            (Path(path) / name).write_text(text)


def test_a_finished_run_is_not_retrained_unless_forced(tmp_path):
    from review_intel.kaggle_job import already_trained

    assert not already_trained(tmp_path / "full")
    (tmp_path / "full" / "full").mkdir(parents=True)
    (tmp_path / "full" / "full" / "result.json").write_text("{}")
    assert already_trained(tmp_path / "full")


def test_a_failed_run_never_replaces_the_previous_results(tmp_path):
    from review_intel.kaggle_job import fetch_output

    dest = tmp_path / "full"
    (dest / "full").mkdir(parents=True)
    (dest / "full" / "result.json").write_text("good")
    fetch_output(FakeClient({"log.log": "Traceback"}), dest, status="error")
    assert (dest / "full" / "result.json").read_text() == "good"
    assert (tmp_path / "full-failed" / "log.log").exists()  # kept for reading the error

    fetch_output(FakeClient({"full/result.json": "new"}), dest, status="complete")
    assert (dest / "full" / "result.json").read_text() == "new"
