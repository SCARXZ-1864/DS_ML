from pathlib import Path

import pandas as pd

from review_intel import config
from review_intel.data.build import COLUMNS, build_dataset

FIX = Path(__file__).parent / "fixtures"
WORDS = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
    "hotel", "india", "juliet", "kilo", "lima", "mike",
]


def fake_reviews(domain, n_groups=12, per_group=5):
    texts = [
        "The food was lovely and the staff were kind to us.",
        "Terrible experience, it arrived broken and late again.",
        "It was fine, nothing special about it at all really.",
        "Great value for the price, would happily buy it again.",
        "Very slow service and the order was completely wrong.",
    ]
    rows = []
    for g in range(n_groups):
        for i in range(per_group):
            rows.append({
                "review_id": f"{domain}-{g}-{i}", "domain": domain, "group_id": f"{domain}-g{g}",
                "shop_name": None, "stars": (i % 5) + 1,
                # Words, not digits, make each row unique: dedupe ignores digits on purpose.
                "text": f"{texts[i]} Visit {WORDS[g]} {WORDS[-1 - i]}.",
                "date": "2026-01-0" + str(i + 1),
            })
    rows.append({**rows[0], "review_id": f"{domain}-dup"})  # an exact duplicate to remove
    rows.append({**rows[1], "review_id": f"{domain}-short", "text": "Bad."})  # too short
    return rows


def test_build_dataset_on_fixtures(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "INTERIM_DIR", tmp_path)
    sources = {d: fake_reviews(d) for d in config.DOMAINS}
    df, report = build_dataset(dev=True, sources=sources, per_domain=40)

    assert list(df.columns) == COLUMNS
    assert set(df["label"]) <= set(config.LABELS)
    assert set(df["split"]) == {"train", "val", "test"}
    assert (df.groupby("group_id")["split"].nunique() == 1).all()
    assert (df.groupby("domain").size() <= 40).all()
    assert report["restaurant"]["short"] == 1
    assert report["restaurant"]["duplicate"] == 1
    saved = pd.read_parquet(tmp_path / "reviews_dev.parquet")
    assert len(saved) == len(df)
