import random

import pandas as pd

from review_intel.data.split import grouped_split

FRACTIONS = {"train": 0.8, "val": 0.1, "test": 0.1}


def frame(n_groups=60, seed=3):
    rng = random.Random(seed)
    rows = []
    for g in range(n_groups):
        for i in range(rng.randint(1, 20)):
            rows.append({"review_id": f"{g}-{i}", "group_id": f"g{g}", "domain": "grocery"})
    for g in range(20):
        rows.append({"review_id": f"r{g}", "group_id": f"rest{g}", "domain": "restaurant"})
    return pd.DataFrame(rows)


def test_split_keeps_groups_together():
    df = frame()
    df["split"] = grouped_split(df, FRACTIONS, seed=42)
    assert (df.groupby("group_id")["split"].nunique() == 1).all()


def test_split_fractions_are_close_to_the_targets_in_each_domain():
    df = frame()
    df["split"] = grouped_split(df, FRACTIONS, seed=42)
    for _, part in df.groupby("domain"):
        shares = part["split"].value_counts(normalize=True)
        for name, target in FRACTIONS.items():
            assert abs(shares.get(name, 0) - target) <= 0.05, (name, shares.to_dict())


def test_split_is_repeatable():
    df = frame()
    assert grouped_split(df, FRACTIONS, seed=42).equals(grouped_split(df, FRACTIONS, seed=42))
