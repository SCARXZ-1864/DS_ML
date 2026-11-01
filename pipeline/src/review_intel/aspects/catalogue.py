"""The aspect catalogue: a saved list of what customers talk about for one kind of shop.

Built once per domain by grouping phrases that mean the same thing ("waiter", "server", "staff")
using sentence embeddings (numbers that place similar meanings close together). A shop's reviews
are then *matched* to the catalogue instead of being clustered afresh, so aspect ids stay the same
across shops and runs (needed by Compare, trends and alerts), and a shop with only 20 reviews still
works. Phrases that match nothing can become a shop's own "new themes" (RISKS R35).
"""

from __future__ import annotations

import json
import re
from collections import Counter
from collections.abc import Callable, Sequence

import numpy as np
from sklearn.cluster import AgglomerativeClustering

from review_intel import config

Embed = Callable[[list[str]], np.ndarray]
CATALOGUE_DIR = (
    config.REPO_ROOT / "pipeline" / "catalogues"
)  # small JSON, committed: the app needs it

# Tuned on real reviews (notebook 04): 0.25 groups waiter/waitress/hostess and price/cost/pricing;
# 0.3 already merges food with restaurant and dinner.
DISTANCE_THRESHOLD = 0.25  # cosine distance below which two phrases are "the same aspect"
MAX_UNIQUE = 3000  # clustering is O(n²) in memory: keep the commonest phrases only
# bge-small puts unrelated single words at ~0.67–0.74 similarity (music~food 0.70) and true
# matches at ~0.86–0.99, so a match needs 0.80. Better unmatched than wrongly labelled.
MATCH_THRESHOLD = 0.80  # cosine similarity needed to match a phrase to a catalogue aspect


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _unit(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.where(norms == 0, 1, norms)


def _cluster(counts: Counter, embed: Embed, min_count: int, limit: int | None) -> list[dict]:
    texts = [t for t, _ in counts.most_common(MAX_UNIQUE)]
    if not texts:
        return []
    vectors = _unit(np.asarray(embed(texts), dtype=np.float64))
    if len(texts) == 1:
        labels = np.zeros(1, dtype=int)
    else:
        labels = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=DISTANCE_THRESHOLD,
            metric="cosine",
            linkage="average",
        ).fit_predict(vectors)
    clusters = []
    for label in set(labels.tolist()):
        idx = [i for i, lab in enumerate(labels) if lab == label]
        members = sorted(idx, key=lambda i: -counts[texts[i]])
        total = sum(counts[texts[i]] for i in idx)
        if total < min_count:
            continue
        weights = np.array([counts[texts[i]] for i in idx], dtype=np.float64)
        centroid = _unit((vectors[idx] * weights[:, None]).sum(axis=0, keepdims=True))[0]
        name = texts[members[0]].title()
        clusters.append(
            {
                "id": _slug(name),
                "name": name,
                "centroid": [float(x) for x in centroid],
                "examples": [texts[i] for i in members[:6]],
                "count": int(total),
            }
        )
    clusters.sort(key=lambda c: -c["count"])
    if limit:
        clusters = clusters[:limit]
    seen: Counter = Counter()
    for c in clusters:  # two clusters with the same name get -2, -3 ids
        seen[c["id"]] += 1
        if seen[c["id"]] > 1:
            c["id"] = f"{c['id']}-{seen[c['id']]}"
    return clusters


def build_catalogue(
    phrases: Sequence[dict],
    embed: Embed,
    *,
    min_count: int = 30,
    max_aspects: int = 15,
    domain: str,
) -> list[dict]:
    """Groups a domain's phrases into at most `max_aspects` aspects with at least `min_count`
    mentions each, named after their most common phrase."""
    del domain  # kept in the signature so calls read clearly; the file name records it
    return _cluster(Counter(p["text"] for p in phrases), embed, min_count, max_aspects)


def match(
    phrases: Sequence[dict],
    catalogue: Sequence[dict],
    embed: Embed,
    threshold: float = MATCH_THRESHOLD,
) -> list[tuple[dict, str | None]]:
    """Each phrase with the id of its nearest catalogue aspect, or None if nothing is close."""
    if not phrases:
        return []
    texts = sorted({p["text"] for p in phrases})
    vectors = _unit(np.asarray(embed(texts), dtype=np.float64))
    centroids = np.array([c["centroid"] for c in catalogue], dtype=np.float64)
    best: dict[str, str | None] = {}
    if len(centroids):
        sims = vectors @ centroids.T
        for i, t in enumerate(texts):
            j = int(np.argmax(sims[i]))
            best[t] = catalogue[j]["id"] if sims[i, j] >= threshold else None
    return [(p, best.get(p["text"])) for p in phrases]


def new_themes(unmatched: Sequence[dict], embed: Embed, min_mentions: int = 3) -> list[dict]:
    """A shop's own themes from phrases the catalogue didn't cover: only ones mentioned at least
    `min_mentions` times, so a single odd phrase never becomes a "new topic" alert."""
    themes = _cluster(Counter(p["text"] for p in unmatched), embed, min_mentions, None)
    return [{**t, "id": f"new-{t['id']}", "isNew": True} for t in themes]


def save_catalogue(domain: str, aspects: list[dict]) -> None:
    CATALOGUE_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(aspects, indent=1) + "\n"  # end with a newline, as the pre-commit hook wants
    (CATALOGUE_DIR / f"{domain}.json").write_text(text, encoding="utf-8")


def load_catalogue(domain: str) -> list[dict]:
    return json.loads((CATALOGUE_DIR / f"{domain}.json").read_text(encoding="utf-8"))
