"""DistilBERT fine-tuning: the settings and the small pieces that don't need a GPU.

The training itself runs on a Modal GPU (review_intel.gpu). Keeping these parts here means they
are tested on the laptop in milliseconds.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from dataclasses import asdict, dataclass

from review_intel import config

# Modal prices per second (modal.com/pricing, checked 2026-11-01): T4 GPU $0.000164, plus the
# container's CPU ($0.0000131 per core) and memory ($0.00000222 per GiB). Our container asks for
# 2 cores and 16 GiB.
GPU_PRICE_PER_S = {"T4": 0.000164, "L4": 0.000222, "A10": 0.000306}
CONTAINER_PRICE_PER_S = 2 * 0.0000131 + 16 * 0.00000222
STARTUP_S = 180  # image start, model download, tokenising


@dataclass(frozen=True)
class TrainConfig:
    model: str = config.BASE_MODEL
    max_len: int = 256  # covers ~95% of reviews whole (notebook 01)
    epochs: int = 3
    lr: float = 5e-5
    batch_size: int = 32
    fp16: bool = True
    early_stopping_patience: int = 1
    seed: int = config.SEED
    gpu: str = "T4"
    timeout_s: int = 3600  # a hung run stops here instead of burning credits (RISKS R32)
    samples_per_s: float = 250.0  # measured by the smoke run; used only for the cost estimate
    holdout_domain: str | None = None  # train without this domain, to test on an unseen shop type

    def to_dict(self) -> dict:
        return asdict(self)


def class_weights(labels: Sequence[str]) -> list[float]:
    """One weight per label (in config.LABELS order): rarer labels weigh more, so the model can't
    score well by ignoring neutral. Inverse frequency, scaled so the labels present average 1."""
    counts = Counter(labels)
    raw = [1.0 / counts[label] if counts[label] else 0.0 for label in config.LABELS]
    present = [w for w in raw if w]
    mean = sum(present) / len(present)
    return [w / mean for w in raw]


def estimate_cost(n_train: int, cfg: TrainConfig) -> float:
    """Upper-bound dollars for one training run: all epochs, one validation pass per epoch."""
    n_val = n_train / 8  # validation is 10% of the data and training 80%
    seconds = STARTUP_S + cfg.epochs * (n_train + n_val) / cfg.samples_per_s
    seconds = min(seconds, cfg.timeout_s)
    return round(seconds * (GPU_PRICE_PER_S[cfg.gpu] + CONTAINER_PRICE_PER_S), 2)


def scores_from_probs(probs: Sequence[Sequence[float]]) -> list[dict]:
    """Model probabilities (config.LABELS order) → label, a -1..1 score and a confidence.

    score = P(positive) - P(negative): near +1 clearly positive, near -1 clearly negative, near 0
    neutral or mixed. confidence is the probability of the chosen label.
    """
    neg, pos = config.LABELS.index("negative"), config.LABELS.index("positive")
    out = []
    for p in probs:
        best = max(range(len(p)), key=p.__getitem__)
        out.append({"label": config.LABELS[best], "score": p[pos] - p[neg], "confidence": p[best]})
    return out
