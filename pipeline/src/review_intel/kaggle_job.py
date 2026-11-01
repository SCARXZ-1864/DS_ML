"""GPU training on Kaggle's free notebooks, as an alternative to Modal.

Kaggle gives each account about 30 free GPU hours a week. Its API can upload a *private* dataset
and run a script notebook on a GPU, which is all the training needs:

1. `stage_dataset` writes the three splits (text, label and shop type only) and a zip of this
   package, so the notebook runs exactly the code tested here (review_intel.models.train).
2. `stage_kernel` writes the notebook script and its settings: private, GPU on, internet on (to
   download the base model from Hugging Face).
3. `push`, `wait` and `download` send them, wait for the run and fetch its output folder.

Both stay private: the review text is licensed for research and is never published.
"""

from __future__ import annotations

import json
import shutil
import time
import zipfile
from pathlib import Path

import pandas as pd

from review_intel import config
from review_intel.models.distilbert import TrainConfig

DATASET_SLUG = "review-intel-train"
KERNEL_SLUG = "review-intel-gpu"  # Kaggle titles must differ between datasets and notebooks
STAGE_DIR = config.DATA_DIR / "kaggle"  # under data/, which git ignores
PACKAGE_DIR = Path(__file__).resolve().parent
TRANSFORMERS = "transformers==5.22.1"  # the version the tests ran against

_SCRIPT = '''"""Written by review_intel.kaggle_job: trains and scores DistilBERT on a Kaggle GPU."""
import glob
import json
import shutil
import subprocess
import sys
from pathlib import Path

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "{transformers}", "accelerate>=1.1"],
               check=True)
# Kaggle unpacks uploaded zips into folders; a zip that stayed packed is importable as it is.
unpacked = glob.glob("/kaggle/input/**/review_intel/models/train.py", recursive=True)
packed = glob.glob("/kaggle/input/**/review_intel.zip", recursive=True)
sys.path.insert(0, str(Path(unpacked[0]).parents[2]) if unpacked else packed[0])
data = Path(glob.glob("/kaggle/input/**/train.parquet", recursive=True)[0]).parent

import pandas as pd
import torch
import transformers

from review_intel.models.train import fit_sentiment, predict_probs

print("torch", torch.__version__, "· transformers", transformers.__version__,
      "· GPU", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "none", flush=True)
JOBS = json.loads(r"""{jobs}""")
splits = {{s: pd.read_parquet(data / f"{{s}}.parquet") for s in ("train", "val", "test")}}
for job in JOBS:
    train, val, test = splits["train"], splits["val"], splits["test"]
    if job["holdout"]:
        train, val = train[train["domain"] != job["holdout"]], val[val["domain"] != job["holdout"]]
        test = test[test["domain"] == job["holdout"]]
    if job["sample_per_domain"]:
        n, seed = job["sample_per_domain"], job["cfg"]["seed"]
        train = train.groupby("domain").sample(n, random_state=seed)
        val = val.groupby("domain").sample(max(n // 5, 1), random_state=seed)
    out = Path("/kaggle/working") / job["name"]
    print(f"== {{job['name']}} ==", flush=True)
    result = fit_sentiment(train, val, job["cfg"], out, log=lambda line: print(line, flush=True))
    probs = predict_probs(out / "model", test["text"].tolist())
    scored = {{"rows": test.index.tolist(), "probs": probs}}
    (out / "test_probs.json").write_text(json.dumps(scored))
    if not job["keep_model"]:
        shutil.rmtree(out / "model")
    print(f"{{job['name']}}: scored {{len(test):,}} test reviews", flush=True)
'''


def job(
    name: str,
    cfg: TrainConfig,
    *,
    holdout: str | None = None,
    sample_per_domain: int | None = None,
    keep_model: bool = True,
) -> dict:
    """One training run inside the notebook. `holdout` trains without that shop type and tests on
    it alone; `sample_per_domain` trains on a small sample (a smoke test)."""
    return {
        "name": name,
        "cfg": cfg.to_dict(),
        "holdout": holdout,
        "sample_per_domain": sample_per_domain,
        "keep_model": keep_model,
    }


def _ref(user: str, slug: str = DATASET_SLUG) -> str:
    return f"{user}/{slug}"


def stage_dataset(df: pd.DataFrame, folder: Path, *, user: str) -> Path:
    """Writes the dataset folder: train/val/test parquet files and a zip of this package."""
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for split in ("train", "val", "test"):
        part = df[df["split"] == split][["text", "label", "domain"]].reset_index(drop=True)
        part.to_parquet(folder / f"{split}.parquet", index=False)
    with zipfile.ZipFile(folder / "review_intel.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(PACKAGE_DIR.rglob("*.py")):
            if "__pycache__" not in path.parts:
                z.write(path, Path("review_intel") / path.relative_to(PACKAGE_DIR))
    meta = {"title": DATASET_SLUG, "id": _ref(user), "licenses": [{"name": "other"}]}
    (folder / "dataset-metadata.json").write_text(json.dumps(meta, indent=1))
    return folder


def stage_kernel(jobs: list[dict], folder: Path, *, user: str) -> Path:
    """Writes the notebook folder: the training script and its settings."""
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    script = _SCRIPT.format(transformers=TRANSFORMERS, jobs=json.dumps(jobs, indent=1))
    (folder / "run.py").write_text(script, encoding="utf-8")
    meta = {
        "id": _ref(user, KERNEL_SLUG),
        "title": KERNEL_SLUG,
        "code_file": "run.py",
        "language": "python",
        "kernel_type": "script",
        "is_private": True,
        "enable_gpu": True,
        "enable_internet": True,
        "dataset_sources": [_ref(user)],
        "competition_sources": [],
        "kernel_sources": [],
    }
    (folder / "kernel-metadata.json").write_text(json.dumps(meta, indent=1))
    return folder


def api():
    """An authenticated Kaggle client (token in ~/.kaggle, never in the repo)."""
    from kaggle.api.kaggle_api_extended import KaggleApi

    from review_intel.data.sources import use_system_certificates

    use_system_certificates()
    client = KaggleApi()
    client.authenticate()
    return client


def user(client) -> str:
    return client.get_config_value("username")


def push_dataset(client, folder: Path) -> None:
    """Creates the private dataset, or adds a new version if it already exists."""
    exists = any(
        d.ref == _ref(user(client)) for d in client.dataset_list(mine=True, search=DATASET_SLUG)
    )
    if exists:
        client.dataset_create_version(str(folder), "update", dir_mode="zip", quiet=True)
    else:
        client.dataset_create_new(str(folder), public=False, dir_mode="zip", quiet=True)


def wait_for_dataset(client, timeout_s: int = 900) -> None:
    """Kaggle processes an upload for a minute or two before a notebook can mount it. Its status
    endpoint answers 403 to API tokens, so "ready" means the training file is listed."""
    ref = _ref(user(client))
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        listing = client.dataset_list_files(ref, page_size=200)
        if any(f.name.endswith("train.parquet") for f in listing.files or []):
            return
        time.sleep(20)
    raise TimeoutError(f"dataset {ref} not ready after {timeout_s} s")


def push_kernel(client, folder: Path) -> None:
    client.kernels_push(str(folder))


def wait(client, poll_s: int = 60, timeout_s: int = 4 * 3600) -> str:
    """Polls the notebook until it finishes; returns its final status ("complete" or "error")."""
    ref = _ref(user(client), KERNEL_SLUG)
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        status = str(client.kernels_status(ref).status).lower()
        if any(s in status for s in ("complete", "error", "cancel")):
            return status
        time.sleep(poll_s)
    raise TimeoutError(f"notebook {ref} still running after {timeout_s} s")


def already_trained(dest: Path) -> bool:
    """True when a finished run's results are already downloaded to `dest`, so a rerun of the
    script doesn't silently spend GPU hours retraining (pass --force to retrain)."""
    return any(Path(dest).glob("*/result.json"))


def fetch_output(client, dest: Path, status: str) -> Path:
    """Downloads the notebook's output folder (models, test probabilities, log) next to `dest`,
    and swaps it in only if the run completed. A failed run's output goes to `<dest>-failed`, so
    the results notebook 03 reads are never replaced by a broken run."""
    dest = Path(dest)
    incoming = dest.with_name(dest.name + "-incoming")
    shutil.rmtree(incoming, ignore_errors=True)
    incoming.mkdir(parents=True)
    client.kernels_output(_ref(user(client), KERNEL_SLUG), str(incoming), force=True, quiet=True)
    target = dest if "complete" in status else dest.with_name(dest.name + "-failed")
    shutil.rmtree(target, ignore_errors=True)
    incoming.rename(target)
    return target
