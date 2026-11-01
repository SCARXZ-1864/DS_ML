import pytest
import spacy

from review_intel.aspects.phrases import extract_phrases


@pytest.fixture(scope="module")
def nlp():
    return spacy.load("en_core_web_sm")


def texts(phrases):
    return [p["text"] for p in phrases]


def test_offsets_point_at_the_customers_own_words(nlp):
    review = "The biryani was great but we waited 50 minutes. Customer service was rude."
    for p in extract_phrases("r1", review, nlp):
        assert review[p["start"] : p["end"]].lower().startswith(p["text"].split()[0][:3])
        assert review[p["sent_start"] : p["sent_start"] + len(p["sentence"])] == p["sentence"]


def test_finds_the_thing_being_talked_about(nlp):
    assert "waiter" in texts(extract_phrases("r", "The waiter was rude.", nlp))


def test_keeps_compound_nouns_and_drops_adjectives(nlp):
    found = texts(extract_phrases("r", "Great customer service and the wait time was short.", nlp))
    assert "customer service" in found
    assert "wait time" in found


def test_drops_pronouns_and_vague_words(nlp):
    found = texts(
        extract_phrases(
            "r", "It was a great experience and I loved everything about the place.", nlp
        )
    )
    assert found == []


def test_people_times_and_the_venue_itself_are_not_aspects(nlp):
    review = "My wife and a friend came to the restaurant on Friday night."
    assert texts(extract_phrases("r", review, nlp)) == []


def test_opinion_words_tagged_as_nouns_are_not_aspects(nlp):
    """Notebook 05: spaCy sometimes tags these as nouns, and they became junk "themes"."""
    for text in (
        "This is the best.",
        "There was a lack of everything.",
        "None of it worked.",
        "Total win.",
    ):
        assert texts(extract_phrases("r", text, nlp)) == [], text


def test_lemmatises_plurals(nlp):
    assert "fry" in texts(extract_phrases("r", "The fries were cold.", nlp))
