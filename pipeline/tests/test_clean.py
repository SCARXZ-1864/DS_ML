import pandas as pd

from review_intel.data.clean import clean_text, dedupe, drop_reason, label_for


def review(text, stars=5):
    return {"review_id": "r", "domain": "grocery", "group_id": "g", "shop_name": None,
            "stars": stars, "text": text, "date": "2026-01-01"}


def test_html_tags_and_entities_are_removed():
    assert clean_text("<br />Great&amp;cheap<br/>  coffee\n\n") == "Great&cheap coffee"


def test_reasons_for_dropping_a_review():
    assert drop_reason(review("Tasty and fresh, will buy again.")) is None
    assert drop_reason(review("Good.")) == "short"
    assert drop_reason(review("   ")) == "short"
    french = "Le service était très lent et la nourriture était froide."
    assert drop_reason(review(french)) == "non_english"
    assert drop_reason(review("Tasty and fresh, will buy again.", stars=0)) == "no_stars"


import pytest  # noqa: E402


# Made-up reviews shaped like the real Amazon ones the first language filter wrongly called
# non-English (notebook 01, dev run); each still fools langdetect the same way. Real review text
# isn't kept in the repo (licence).
@pytest.mark.parametrize("text", [
    "tastes fine. looks great",
    "Yum. So tasty!!",
    "Gross. Too sweet",
    "SUPER VALUE. TASTY, TOTALLY AMAZING, STRONGLY RECOMMENDED",
    "STALE SMASHED DIS COLORED. SMASHED, FADED, HARD PRODUCT NOT RECOMMEND, WASTE",
    "Fake lemon taste. Fake lemon taste and doesn't smell good",
    "Excellent. Excellent taste quick delivery",
    "Best fudge ever!!!. Best fudge ever!!!",
    "Natural- no sugar no oil. Fresh! Delicious.",
    "Great flavor. Fantastic tea at a fantastic price!",
])
def test_short_and_all_caps_english_reviews_are_kept(text):
    assert drop_reason(review(text)) is None


@pytest.mark.parametrize("text", [
    "Muy buen producto. Llegaron frescas y con un sabor muy rico, no tan dulces como pensaba",
    "Salsa muy sabrosa. Picante y rica, llego a tiempo y en buenas condiciones",
    "Muy bueno. Buena cantidad, la caja bien grande y todo en buenas condiciones",
    "Ricos. Muy buenas galletas, justo lo que esperaba de este producto",
])
def test_longer_spanish_reviews_are_dropped(text):
    assert drop_reason(review(text)) == "non_english"


def test_labels_follow_the_star_rule():
    assert [label_for(s) for s in (1, 2, 3, 4, 5)] == [
        "negative", "negative", "neutral", "positive", "positive",
    ]


def test_near_duplicates_removed_before_split():
    df = pd.DataFrame([
        {**review("Great food!! Will return."), "review_id": "a"},
        {**review("great food will return"), "review_id": "b"},
        {**review("Terrible service tonight."), "review_id": "c"},
    ])
    assert list(dedupe(df)["review_id"]) == ["a", "c"]
