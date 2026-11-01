"""Builds the labelled, split dataset: sample → clean → label → dedupe → split → parquet."""

from __future__ import annotations

import math
from collections import Counter
from collections.abc import Iterable, Mapping

import pandas as pd

from review_intel import config
from review_intel.data.clean import clean_text, dedupe, drop_reason, label_for
from review_intel.data.sources import (
    RawReview,
    download_amazon,
    download_yelp,
    iter_amazon,
    iter_yelp,
    read_lines,
    reservoir_sample,
    restaurant_ids,
)
from review_intel.data.split import grouped_split

COLUMNS = [
    "review_id", "domain", "group_id", "shop_name", "stars", "text", "date", "label", "split",
]

# Sample a bit more than needed: cleaning drops some reviews, and we still want `per_domain` left.
OVERSAMPLE = 1.3


def real_sources() -> dict[str, Iterable[RawReview]]:
    """Streams from the downloaded files (downloading them once if needed)."""
    business, reviews = download_yelp()
    sources: dict[str, Iterable[RawReview]] = {
        "restaurant": iter_yelp(read_lines(reviews), restaurant_ids(read_lines(business))),
    }
    for domain in config.AMAZON_CATEGORIES:
        sources[domain] = iter_amazon(domain, read_lines(download_amazon(domain)))
    return sources


def _clean_domain(raw: Iterable[RawReview], per_domain: int) -> tuple[pd.DataFrame, Counter]:
    counts: Counter = Counter()
    rows = []
    for r in reservoir_sample(raw, math.ceil(per_domain * OVERSAMPLE), seed=config.SEED):
        counts["sampled"] += 1
        r = {**r, "text": clean_text(r["text"])}
        reason = drop_reason(r)
        if reason:
            counts[reason] += 1
            continue
        rows.append({**r, "label": label_for(r["stars"])})
    df = pd.DataFrame(rows)
    before = len(df)
    df = dedupe(df) if before else df
    counts["duplicate"] = before - len(df)
    df = df.head(per_domain)
    counts["kept"] = len(df)
    return df, counts


def build_dataset(
    dev: bool = True,
    *,
    sources: Mapping[str, Iterable[RawReview]] | None = None,
    per_domain: int | None = None,
) -> tuple[pd.DataFrame, dict[str, dict[str, int]]]:
    """Builds data/interim/reviews_dev.parquet (dev) or reviews.parquet (full) and returns it with
    the per-domain cleaning counts, which go into the data card."""
    per_domain = per_domain or (config.DEV_PER_DOMAIN if dev else config.PER_DOMAIN_SAMPLE)
    sources = sources if sources is not None else real_sources()
    frames, report = [], {}
    for domain in config.DOMAINS:
        df, counts = _clean_domain(sources[domain], per_domain)
        frames.append(df)
        report[domain] = dict(counts)
    df = pd.concat(frames, ignore_index=True)
    df["split"] = grouped_split(df, config.SPLITS, seed=config.SEED)
    df = df[COLUMNS]
    config.INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    name = "reviews_dev.parquet" if dev else "reviews.parquet"
    df.to_parquet(config.INTERIM_DIR / name, index=False)
    return df, report
