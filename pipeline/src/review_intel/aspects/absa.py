"""Aspect sentiment and causes.

For each aspect a review mentions, the *cause* is the clause around the mention, cut out of the
review by character offsets, so it is always the customer's own words ("we waited 50 minutes").
The aspect-sentiment model reads that clause plus the phrase and says positive, neutral or
negative. Using the clause rather than the whole sentence keeps "the biryani was great **but** we
waited 50 minutes" from lending its praise to the wait.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Callable, Sequence

from review_intel import config

Scorer = Callable[[list[tuple[str, str]]], list[dict]]

# Where one idea ends and the next begins inside a sentence.
# "and" only ends a clause when a new subject follows ("cold and the service was slow"), so
# "fish and chips were great" stays whole.
_BOUNDARY = re.compile(
    r"[,;:!?.()]"
    r"|\s(?:but|although|though|however|while|whereas|except)\s"
    r"|\sand\s(?=(?:the|our|my|their|his|her|its|it|we|they|i|he|she|this|that|there)\b)",
    re.I,
)
_TRIM = " \t\n,;:.!?-–—()\"'"


def cause_span(review_text: str, phrase: dict) -> tuple[int, int]:
    """Character offsets of the clause containing the phrase, within its sentence."""
    s0 = phrase["sent_start"]
    sentence = review_text[s0 : s0 + len(phrase["sentence"])]
    rel_start, rel_end = phrase["start"] - s0, phrase["end"] - s0
    start, end = 0, len(sentence)
    for m in _BOUNDARY.finditer(sentence):
        if m.end() <= rel_start:
            start = m.end()
        elif m.start() >= rel_end:
            end = m.start()
            break
    while start < end and sentence[start] in _TRIM:
        start += 1
    while end > start and sentence[end - 1] in _TRIM:
        end -= 1
    return s0 + start, s0 + end


def aspect_mentions(
    review_id: str,
    text: str,
    matched: Sequence[tuple[dict, str | None]],
    names: dict[str, str],
    scorer: Scorer,
) -> list[dict]:
    """One mention per (aspect, clause): its sentiment, confidence and cause offsets.

    `matched` pairs each phrase with a catalogue aspect id (None = unmatched, skipped).
    `scorer` takes (clause, phrase as written) pairs and returns {label, confidence} for each.
    """
    seen: set[tuple[str, int, int]] = set()
    todo = []
    for phrase, aspect_id in matched:
        if aspect_id is None or aspect_id not in names:
            continue
        start, end = cause_span(text, phrase)
        if (aspect_id, start, end) in seen or start >= end:
            continue
        seen.add((aspect_id, start, end))
        todo.append((aspect_id, start, end, text[phrase["start"] : phrase["end"]]))
    if not todo:
        return []
    scores = scorer([(text[s:e], written) for _, s, e, written in todo])
    return [
        {
            "review_id": review_id,
            "aspectId": aspect_id,
            "start": s,
            "end": e,
            "sentiment": sc["label"],
            "confidence": float(sc["confidence"]),
        }
        for (aspect_id, s, e, _), sc in zip(todo, scores, strict=True)
    ]


def cache_key(items) -> str:
    """A fingerprint of a batch of inputs, so scored results can be reused instead of recomputed."""
    return hashlib.sha256(json.dumps(items, sort_keys=True).encode()).hexdigest()[:16]


def local_absa(model: str = config.ABSA_MODEL, batch_size: int = 16) -> Scorer:
    """The aspect-sentiment model on the laptop CPU. Fine for thousands of pairs; the full
    dataset goes to a GPU instead."""
    from transformers import pipeline

    from review_intel.data.sources import use_system_certificates

    use_system_certificates()  # model download from Hugging Face (Kaspersky re-signs HTTPS)
    clf = pipeline("text-classification", model=model, device=-1)

    def score(pairs: list[tuple[str, str]]) -> list[dict]:
        out = clf(
            [{"text": c, "text_pair": a} for c, a in pairs], batch_size=batch_size, truncation=True
        )
        return [{"label": o["label"].lower(), "confidence": float(o["score"])} for o in out]

    return score


def local_embedder(model: str = config.EMBED_MODEL) -> Callable[[list[str]], object]:
    """Sentence embeddings (bge-small, 33M parameters) on the CPU: normalised, so a dot product is
    the cosine similarity."""
    from sentence_transformers import SentenceTransformer

    from review_intel.data.sources import use_system_certificates

    use_system_certificates()
    enc = SentenceTransformer(model, device="cpu")
    return lambda texts: enc.encode(
        texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False
    )
