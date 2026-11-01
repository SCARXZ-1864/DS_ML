"""Cleaning rules: what counts as a usable review, its label, and removing duplicates."""

from __future__ import annotations

import html
import re

import pandas as pd
from langdetect import DetectorFactory, LangDetectException, detect_langs

from review_intel import config

DetectorFactory.seed = 0  # langdetect is random by default; fix it so runs are repeatable

MIN_CHARS = 15
_TAGS = re.compile(r"<[^>]+>")
_SPACE = re.compile(r"\s+")
_NOT_LETTER = re.compile(r"[^a-z ]+")


def clean_text(text: str) -> str:
    """Removes HTML tags and entities (Amazon text contains <br />) and collapses whitespace."""
    return _SPACE.sub(" ", html.unescape(_TAGS.sub(" ", text or ""))).strip()


MIN_DETECT_CHARS = 40  # below this, language detection is little better than a guess
MIN_ENGLISH_PROB = 0.2
# Very common English words. Two different ones in a review is strong evidence of English even
# when langdetect is confused (it called "fake fruit flavor ... and doesn't taste good" Norwegian).
_COMMON_ENGLISH = """
the and is was it to of for this that with but not very i my you they we are have had
doesn't don't didn't isn't wasn't would will good great taste
at like just price best ever quality item perfect excellent delicious flavor wonderful
love fresh favorite fast
"""  # the last two lines: everyday review words that aren't Spanish, French or Portuguese words
_ENGLISH_WORDS = frozenset(_COMMON_ENGLISH.split())
_WORD = re.compile(r"[a-z']+")


def _is_english(text: str) -> bool:
    """True unless the review is clearly in another language.

    The first version used langdetect's single best guess and dropped ~3% of Amazon reviews, most
    of them English: very short ones ("Yum. Delicious!") and ALL-CAPS ones, which skews the data
    towards longer, calmer reviews. So: lowercase first (capitals confuse it), give reviews under
    40 characters the benefit of the doubt, and drop only when English is unlikely.
    """
    sample = text[:300].lower().replace("’", "'")
    if len(sample.strip()) < MIN_DETECT_CHARS:
        return True
    if len(_ENGLISH_WORDS.intersection(_WORD.findall(sample))) >= 2:
        return True
    try:
        probs = {lang.lang: lang.prob for lang in detect_langs(sample)}
    except LangDetectException:  # no letters to judge by
        return False
    return probs.get("en", 0.0) >= MIN_ENGLISH_PROB


def drop_reason(review: dict) -> str | None:
    """Why a review is left out of the dataset, or None to keep it. Expects cleaned text."""
    if review.get("stars") not in config.LABEL_MAP:
        return "no_stars"
    if len(review["text"].strip()) < MIN_CHARS:
        return "short"
    if not _is_english(review["text"]):
        return "non_english"
    return None


def label_for(stars: int) -> str:
    return config.LABEL_MAP[stars]


def _dedupe_key(text: str) -> str:
    """Case, punctuation and digits don't make a review different."""
    return _SPACE.sub(" ", _NOT_LETTER.sub(" ", text.lower())).strip()[:200]


def dedupe(df: pd.DataFrame) -> pd.DataFrame:
    """Keeps the first of each set of (near-)identical texts. Runs before splitting, so a copy of a
    training review can't end up in the test set and inflate the scores (RISKS R03)."""
    return df.loc[~df["text"].map(_dedupe_key).duplicated()].reset_index(drop=True)
