"""Single source of truth for paths, seeds and sample sizes.

Scripts import from here instead of hardcoding values, so changing the
category or sample size is a one-line edit (PLAN §7).
"""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
INTERIM_DIR = DATA_DIR / "interim"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = REPO_ROOT / "pipeline" / "reports"

SEED = 42

DATASET_REPO = "McAuley-Lab/Amazon-Reviews-2023"
CATEGORY = "Cell_Phones_and_Accessories"

ANALYSIS_SAMPLE_SIZE = 150_000
SERVING_CORPUS_SIZE = 50_000
DEV_SAMPLE_SIZE = 20_000  # fast iteration before scaling up

# Star rating → sentiment label (PLAN M1)
LABEL_MAP = {1: "negative", 2: "negative", 3: "neutral", 4: "positive", 5: "positive"}
LABELS = ("negative", "neutral", "positive")
