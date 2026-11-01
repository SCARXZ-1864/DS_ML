"""Train DistilBERT on a free Kaggle GPU and download the results.

Run from pipeline/:
    uv run python scripts/kaggle_train.py smoke   # 2,000 reviews, 1 epoch: checks the setup
    uv run python scripts/kaggle_train.py full    # the real run plus the held-out shop type
    add --force to retrain when results are already downloaded; --skip-upload reuses the dataset

The output lands in pipeline/models/kaggle/<mode>/ (gitignored); notebook 03 reads it.
"""

import shutil
import sys
import time

import pandas as pd

from review_intel import config, kaggle_job
from review_intel.models.distilbert import TrainConfig

sys.stdout.reconfigure(encoding="utf-8")
mode = sys.argv[1] if len(sys.argv) > 1 else "smoke"
jobs = {
    "smoke": [kaggle_job.job("smoke", TrainConfig(epochs=1), sample_per_domain=667)],
    "full": [
        kaggle_job.job("full", TrainConfig()),
        kaggle_job.job(
            "holdout",
            TrainConfig(holdout_domain="appliances"),
            holdout="appliances",
            keep_model=False,
        ),
    ],
}[mode]

dest = config.MODELS_DIR / "kaggle" / mode
if kaggle_job.already_trained(dest) and "--force" not in sys.argv:
    sys.exit(f"{dest.relative_to(config.REPO_ROOT)} already has results; add --force to retrain.")

client = kaggle_job.api()
user = kaggle_job.user(client)
start = time.time()
if "--skip-upload" not in sys.argv:
    df = pd.read_parquet(config.INTERIM_DIR / "reviews.parquet")
    folder = kaggle_job.stage_dataset(df, kaggle_job.STAGE_DIR / "dataset", user=user)
    print(f"Uploading the private dataset {user}/{kaggle_job.DATASET_SLUG} …", flush=True)
    kaggle_job.push_dataset(client, folder)
    kaggle_job.wait_for_dataset(client)

kernel_dir = kaggle_job.STAGE_DIR / "kernel"
shutil.rmtree(kernel_dir, ignore_errors=True)
kaggle_job.push_kernel(client, kaggle_job.stage_kernel(jobs, kernel_dir, user=user))
print(f"Notebook pushed: https://www.kaggle.com/code/{user}/{kaggle_job.KERNEL_SLUG}", flush=True)
status = kaggle_job.wait(client)
print(f"Finished with status {status} after {(time.time() - start) / 60:,.1f} min", flush=True)

saved = kaggle_job.fetch_output(client, dest, status)
logs = sorted(saved.glob("*.log"))
if logs:
    print("--- notebook log (last lines) ---")
    print("\n".join(logs[0].read_text(encoding="utf-8", errors="replace").splitlines()[-25:]))
print("output saved to", saved.relative_to(config.REPO_ROOT))
sys.exit(0 if "complete" in status else 1)
