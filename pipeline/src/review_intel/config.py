"""Single source of truth for paths, seeds, sample sizes and model ids.

Scripts and notebooks import from here instead of hardcoding values, so changing a
domain or a sample size is a one-line edit (PLAN §0.1, Part 2 design §4).
"""

from __future__ import annotations

from pathlib import Path

_HERE = Path(__file__).resolve()
# In the repo: pipeline/src/review_intel/config.py → 3 levels up. Inside a Modal container the
# package sits at /root/review_intel/, which has no 3 levels; paths aren't used there anyway.
REPO_ROOT = _HERE.parents[3] if len(_HERE.parents) > 3 else _HERE.parent
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
INTERIM_DIR = DATA_DIR / "interim"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = REPO_ROOT / "pipeline" / "reports"
MODELS_DIR = REPO_ROOT / "pipeline" / "models"  # gitignored; big model files stay local

SEED = 42

# The three demo shop types and where their reviews come from.
DOMAINS = ("restaurant", "grocery", "appliances")
AMAZON_DATASET = "McAuley-Lab/Amazon-Reviews-2023"  # Hugging Face, streamed
AMAZON_CATEGORIES = {"grocery": "Grocery_and_Gourmet_Food", "appliances": "Appliances"}
YELP_KAGGLE = "yelp-dataset/yelp-dataset"  # Yelp Open Dataset mirror; filtered to Restaurants

PER_DOMAIN_SAMPLE = 50_000
DEV_PER_DOMAIN = 7_000  # ~20k in total for fast iteration before scaling up
ANALYSIS_SAMPLE_SIZE = PER_DOMAIN_SAMPLE * len(DOMAINS)
SERVING_CORPUS_SIZE = 50_000

# Whole shops (an Amazon product or a Yelp business) go to one split, so a model is never
# marked on reviews of a shop it saw in training.
SPLITS = {"train": 0.8, "val": 0.1, "test": 0.1}

# Star rating → sentiment label
LABEL_MAP = {1: "negative", 2: "negative", 3: "neutral", 4: "positive", 5: "positive"}
LABELS = ("negative", "neutral", "positive")

# Models
BASE_MODEL = "distilbert-base-uncased"
ABSA_MODEL = "yangheng/deberta-v3-base-absa-v1.1"
EMBED_MODEL = "BAAI/bge-small-en-v1.5"

# GPU spend cap for all of Part 2, out of Modal's $30/month free credits (RISKS R32).
MODAL_BUDGET_USD = 5.0
