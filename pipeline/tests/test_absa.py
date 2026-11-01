import pytest
import spacy

from review_intel.aspects.absa import aspect_mentions, cache_key, cause_span
from review_intel.aspects.phrases import extract_phrases

REVIEW = "The biryani was great but we waited 50 minutes. Staff were friendly, though slow."


@pytest.fixture(scope="module")
def phrases():
    return {p["text"]: p for p in extract_phrases("r1", REVIEW, spacy.load("en_core_web_sm"))}


def test_cause_is_the_clause_around_the_phrase(phrases):
    s, e = cause_span(REVIEW, phrases["biryani"])
    assert REVIEW[s:e] == "The biryani was great"
    s, e = cause_span(REVIEW, phrases["minute"])
    assert REVIEW[s:e] == "we waited 50 minutes"
    s, e = cause_span(REVIEW, phrases["staff"])
    assert REVIEW[s:e] == "Staff were friendly"


def test_and_splits_clauses_only_when_a_new_subject_follows():
    nlp = spacy.load("en_core_web_sm")
    review = "The food was cold and the service was slow. Fish and chips were great."
    found = {p["text"]: p for p in extract_phrases("r", review, nlp)}
    s, e = cause_span(review, found["food"])
    assert review[s:e] == "The food was cold"
    s, e = cause_span(review, found["service"])
    assert review[s:e] == "the service was slow"
    s, e = cause_span(review, found["chip"])
    assert review[s:e] == "Fish and chips were great"


def test_mentions_use_the_customers_own_words(phrases):
    matched = [
        (phrases["biryani"], "food"),
        (phrases["minute"], "wait-time"),
        (phrases["staff"], None),
    ]

    def scorer(pairs):
        return [
            {"label": "positive" if "great" in s else "negative", "confidence": 0.9}
            for s, _ in pairs
        ]

    mentions = aspect_mentions(
        "r1", REVIEW, matched, {"food": "Food", "wait-time": "Wait time"}, scorer
    )
    assert [(m["aspectId"], m["sentiment"]) for m in mentions] == [
        ("food", "positive"),
        ("wait-time", "negative"),
    ]
    for m in mentions:
        assert REVIEW[m["start"] : m["end"]] in REVIEW
        assert m["review_id"] == "r1"


def test_one_mention_per_aspect_and_clause(phrases):
    matched = [(phrases["biryani"], "food"), (phrases["biryani"], "food")]
    mentions = aspect_mentions(
        "r1",
        REVIEW,
        matched,
        {"food": "Food"},
        lambda pairs: [{"label": "positive", "confidence": 1.0}] * len(pairs),
    )
    assert len(mentions) == 1


def test_cache_key_is_stable_and_input_sensitive():
    assert cache_key([("a", "b")]) == cache_key([("a", "b")])
    assert cache_key([("a", "b")]) != cache_key([("a", "c")])
