"""Publish the current DistilBERT model (models/distilbert/LATEST) to the Hugging Face Hub.

Run from pipeline/, after `hf auth login` with a write token:
    uv run python scripts/push_model.py           # shows the card and the files, uploads nothing
    uv run python scripts/push_model.py --push    # creates the public repo and uploads

Only the model files and the model card leave the laptop: no review text.
"""

import json
import sys

from huggingface_hub import CommitOperationAdd, HfApi

from review_intel import config
from review_intel.data.sources import use_system_certificates
from review_intel.models import hub

sys.stdout.reconfigure(encoding="utf-8")
use_system_certificates()


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


run_id = (config.MODELS_DIR / "distilbert" / "LATEST").read_text().strip()
model_dir = config.MODELS_DIR / "distilbert" / run_id
run = load(config.MODELS_DIR / "kaggle" / "full" / "full" / "result.json")
if run["run_id"] != run_id:
    sys.exit(f"LATEST is {run_id} but the downloaded run is {run['run_id']}: re-run notebook 03.")

metrics = config.REPORTS_DIR / "metrics"
api = HfApi()
repo_id = f"{api.whoami()['name']}/{hub.REPO_NAME}"
card = hub.model_card(
    test=load(metrics / "distilbert.json"),
    baseline=load(metrics / "baseline.json"),
    holdout=load(metrics / "distilbert_holdout.json"),
    run=run,
    repo_id=repo_id,
)
files = hub.files_to_upload(model_dir)

if "--push" not in sys.argv:
    print(card)
    print(f"Would upload to https://huggingface.co/{repo_id}:")
    for f in files:
        print(f"  {f.name}  ({f.stat().st_size / 1e6:,.1f} MB)")
    sys.exit("Dry run: add --push to upload.")

api.create_repo(repo_id, repo_type="model", private=False, exist_ok=True)
ops = [CommitOperationAdd(f.name, str(f)) for f in files]
ops.append(CommitOperationAdd("README.md", card.encode("utf-8")))
info = api.create_commit(repo_id, ops, commit_message=f"Model from training run {run_id}")
print(f"Published: https://huggingface.co/{repo_id} (commit {info.oid[:7]})")
