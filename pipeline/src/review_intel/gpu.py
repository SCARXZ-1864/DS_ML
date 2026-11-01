"""GPU work on Modal: fine-tuning and batch scoring.

Notebooks call these functions with `with modal.enable_output(), app.run(): fn.remote(...)`. The
code runs in a container with a GPU on Modal's servers and streams its printed progress back
into the notebook. Results live on a Modal Volume (a cloud folder that persists between runs),
keyed by a hash of the inputs, so re-running a notebook reuses them instead of paying again
(RISKS R32).
"""

from __future__ import annotations

import modal

from review_intel.models.distilbert import TrainConfig

app = modal.App("review-intel-train")
volume = modal.Volume.from_name("review-intel-artifacts", create_if_missing=True)
VOL = "/vol"
DEFAULT = TrainConfig()

image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "torch==2.15.0",
        "transformers==5.22.1",
        "accelerate",
        "datasets",
        "scikit-learn",
        "pandas",
        "pyarrow",
    )
    .add_local_python_source("review_intel")
)


@app.function(
    image=image,
    gpu=DEFAULT.gpu,
    timeout=DEFAULT.timeout_s,
    cpu=2,
    memory=16384,
    volumes={VOL: volume},
)
def train_sentiment(train_parquet: bytes, val_parquet: bytes, cfg: dict) -> dict:
    """Fine-tunes DistilBERT on the given reviews (review_intel.models.train) and keeps the best
    epoch by validation macro F1. Returns the run summary; the model stays on the Volume."""
    import io
    import json
    from pathlib import Path

    import pandas as pd

    from review_intel.models.train import fit_sentiment, run_id

    train_df = pd.read_parquet(io.BytesIO(train_parquet))
    val_df = pd.read_parquet(io.BytesIO(val_parquet))
    out = Path(VOL) / "distilbert" / run_id(train_df, val_df, cfg)
    if (out / "result.json").exists():
        print(f"Run {out.name} already trained; reusing it (no GPU time spent).")
        return {**json.loads((out / "result.json").read_text()), "cached": True}
    result = fit_sentiment(train_df, val_df, cfg, out, log=lambda line: print(line, flush=True))
    volume.commit()
    return result


@app.function(image=image, gpu="T4", timeout=1800, cpu=2, memory=8192, volumes={VOL: volume})
def predict_probs(
    texts: list[str], run_id: str, max_len: int = 256, batch_size: int = 256
) -> list[list[float]]:
    """Label probabilities (config.LABELS order) for each text, from a trained run on the Volume."""
    from review_intel.models import train

    probs = train.predict_probs(f"{VOL}/distilbert/{run_id}/model", texts, max_len, batch_size)
    print(f"Scored {len(texts):,} texts with run {run_id}")
    return probs


def download_model(run_id: str):
    """Copies a trained model from the Volume to pipeline/models/distilbert/<run_id>.

    That folder is gitignored: model files are far too big for git.
    """
    from review_intel import config

    dest = config.MODELS_DIR / "distilbert" / run_id
    prefix = f"distilbert/{run_id}/model"
    for entry in volume.listdir(prefix, recursive=True):
        if entry.type != modal.volume.FileEntryType.FILE:
            continue
        target = dest / entry.path[len(prefix) :].lstrip("/")
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as f:
            for chunk in volume.read_file(entry.path):
                f.write(chunk)
    return dest
