"""Train/val/test split that keeps each shop's reviews together."""

from __future__ import annotations

import random

import pandas as pd


def grouped_split(df: pd.DataFrame, fractions: dict[str, float], seed: int) -> pd.Series:
    """Assigns whole groups (products or businesses) to one split each.

    If one shop's reviews sat in both train and test, the model could learn that shop's quirks
    and look better than it is on shops it has never seen (RISKS R03). Each domain is split on its
    own, so every domain gets roughly the target fractions. Groups are visited in a seeded random
    order and each goes to the split furthest below its target, measured in reviews.
    """
    rng = random.Random(seed)
    assignment: dict[str, str] = {}
    for _, part in df.groupby("domain", sort=True):
        sizes = part.groupby("group_id").size()
        groups = sorted(sizes.index)
        rng.shuffle(groups)
        total = int(sizes.sum())
        filled = dict.fromkeys(fractions, 0)
        for g in groups:
            name = max(fractions, key=lambda s: fractions[s] * total - filled[s])
            assignment[g] = name
            filled[name] += int(sizes[g])
    return df["group_id"].map(assignment).rename("split")
