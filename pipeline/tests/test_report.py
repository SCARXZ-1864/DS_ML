import numpy as np
import pytest
import spacy

from review_intel.report import CATALOGUE_FOR, analyze_reviews

GROUPS = {
    "food": 0,
    "biryani": 0,
    "dish": 0,
    "service": 1,
    "staff": 1,
    "waiter": 1,
    "price": 2,
    "parking": 3,
}
CATALOGUE = [
    {
        "id": "food",
        "name": "Food",
        "centroid": [1, 0, 0, 0, 0, 0],
        "examples": ["food"],
        "count": 50,
    },
    {
        "id": "service",
        "name": "Service",
        "centroid": [0, 1, 0, 0, 0, 0],
        "examples": ["service"],
        "count": 40,
    },
    {
        "id": "price",
        "name": "Price",
        "centroid": [0, 0, 1, 0, 0, 0],
        "examples": ["price"],
        "count": 30,
    },
]


def embed(texts):
    out = []
    for t in texts:
        v = np.zeros(6)
        v[GROUPS.get(t, 5)] = 1.0
        if t not in GROUPS:
            v[4] = 0.5  # unknown words sit together, away from every aspect
        out.append(v / np.linalg.norm(v))
    return np.array(out)


def sentiment(texts):
    out = []
    for t in texts:
        neg = any(w in t.lower() for w in ("cold", "rude", "slow", "awful", "pricey"))
        pos = any(w in t.lower() for w in ("great", "lovely", "friendly", "delicious"))
        label = "negative" if neg and not pos else "positive" if pos and not neg else "neutral"
        score = {"negative": -0.8, "positive": 0.8, "neutral": 0.0}[label]
        out.append({"label": label, "score": score, "confidence": 0.9})
    return out


def absa(pairs):
    return sentiment([clause for clause, _ in pairs])


@pytest.fixture(scope="module")
def nlp():
    return spacy.load("en_core_web_sm")


def run(reviews, nlp, shop_type="restaurant"):
    return analyze_reviews(
        reviews,
        shop_type,
        sentiment=sentiment,
        absa=absa,
        embed=embed,
        nlp=nlp,
        catalogue=CATALOGUE,
    )


REVIEWS = [
    {
        "text": "The food was delicious and the staff were friendly.",
        "stars": 5,
        "date": "2026-09-03",
    },
    {"text": "The food was cold and the service was slow.", "stars": 2, "date": "2026-09-20"},
    {"text": "Lovely biryani, great service.", "stars": 5, "date": "2026-10-01"},
    {"text": "The dish was cold, the waiter was rude.", "stars": 1, "date": "2026-10-11"},
    {"text": "Food was okay. Price was okay.", "stars": 3, "date": "2026-10-12"},
    {
        "text": "Great food but the parking was awful, parking was full and parking was far.",
        "stars": 4,
        "date": "2026-10-20",
    },
]


def test_kpis_match_a_hand_calculation(nlp):
    r = run(REVIEWS, nlp).to_dict()
    assert r["kpis"]["reviews"] == 6
    # sentiment stub: reviews 1 and 3 positive; 2 and 4 negative; 5 neutral; 6 mixed → neutral
    assert r["kpis"]["positivePct"] == pytest.approx(100 * 2 / 6, abs=0.1)
    assert r["kpis"]["negativePct"] == pytest.approx(100 * 2 / 6, abs=0.1)
    assert r["kpis"]["avgStars"] == pytest.approx((5 + 2 + 5 + 1 + 3 + 4) / 6, abs=0.01)


def test_monthly_points_add_up(nlp):
    months = {m["month"]: m for m in run(REVIEWS, nlp).to_dict()["monthly"]}
    assert set(months) == {"2026-09", "2026-10"}
    for m in months.values():
        assert m["pos"] + m["neg"] + m["neu"] == m["count"]
        assert sum(m["stars"]) == m["count"]


def test_no_stars_and_no_dates_still_build_a_report(nlp):
    plain = [{"text": r["text"], "stars": None, "date": None} for r in REVIEWS]
    r = run(plain, nlp).to_dict()
    assert r["kpis"]["avgStars"] is None
    assert r["monthly"] == []


def test_non_english_and_empty_reviews_are_skipped_and_counted(nlp):
    extra = [
        {"text": "   ", "stars": 3, "date": None},
        {
            "text": "Muy buen producto. Llegaron frescas y con un sabor muy rico, no tan dulces",
            "stars": 5,
            "date": None,
        },
    ]
    r = run(REVIEWS + extra, nlp).to_dict()
    assert r["skipped"] == {"nonEnglish": 1, "empty": 1}
    assert r["kpis"]["reviews"] == 6


def test_every_cause_is_the_customers_own_words(nlp):
    r = run(REVIEWS, nlp).to_dict()
    for rev, out in zip(REVIEWS, r["reviews"], strict=True):
        for m in out["aspectMentions"]:
            assert 0 <= m["start"] < m["end"] <= len(rev["text"])


def test_review_results_carry_the_text_their_offsets_point_into(nlp):
    """Notebook 05: a skipped review shifted every later result, and offsets point into the
    cleaned text (HTML removed, spaces collapsed), so the report must return that text."""
    messy = [
        {"text": "The food<br />was   cold &amp; the service was slow.", "stars": 2, "date": None},
        {"text": "   ", "stars": 3, "date": None},
        {"text": "Lovely biryani, great service.", "stars": 5, "date": None},
    ]
    out = run(messy, nlp).to_dict()["reviews"]
    assert [r["id"] for r in out] == ["r1", "r3"]  # r<n> = the n-th review given
    assert out[0]["text"] == "The food was cold & the service was slow."
    causes = [r["text"][m["start"] : m["end"]] for r in out for m in r["aspectMentions"]]
    assert "The food was cold & the service was slow" in causes or "The food was cold" in causes
    assert "great service" in causes


def test_bests_and_worsts_need_three_mentions(nlp):
    r = run(REVIEWS, nlp).to_dict()
    counts = {a["id"]: a["mentions"] for a in r["aspects"]}
    assert all(counts[a] >= 3 for a in r["bests"] + r["worsts"])
    assert "price" not in r["bests"] + r["worsts"]  # mentioned once
    assert r["bests"] == ["food"]  # 3 positive, 2 negative, 1 neutral
    assert "service" not in r["bests"] + r["worsts"]  # 2 positive, 2 negative: neither


def test_an_aspect_is_never_both_best_and_worst(nlp):
    """Notebook 05: a salon's only aspect, Parking (100% negative), was listed as its best too."""
    r = run(REVIEWS, nlp).to_dict()
    assert not set(r["bests"]) & set(r["worsts"])
    pct = {a["id"]: a for a in r["aspects"]}
    assert all(pct[a]["posPct"] > pct[a]["negPct"] for a in r["bests"])
    assert all(pct[a]["negPct"] > pct[a]["posPct"] for a in r["worsts"])


def test_worst_and_best_weigh_how_often_as_well_as_how_negative():
    """Notebook 05: Mother's Restaurant listed 9-mention "Hype" as its worst aspect, above the
    114-mention "Line" that was 60% negative, because ranking used percentages alone."""
    from review_intel.report import rank_aspects

    def aspect(id_, mentions, pos, neg):
        return {"id": id_, "mentions": mentions, "posPct": pos, "negPct": neg}

    aspects = [
        aspect("line", 114, 13.2, 60.5),
        aspect("hype", 9, 10.0, 70.0),
        aspect("food", 681, 39.8, 19.8),
        aspect("glad", 9, 90.0, 0.0),
    ]
    bests, worsts = rank_aspects(aspects, floor=8)
    assert worsts[0] == "line"
    assert bests[0] == "food"


def test_bigger_shops_need_more_mentions_to_rank(nlp):
    """Notebook 05: in a 400-review shop, 3-mention themes like "Lack" crowded out real aspects."""
    from review_intel.report import min_mentions

    assert min_mentions(6) == 3
    assert min_mentions(400) == 8


def test_reasons_carry_a_short_quote(nlp):
    r = run(REVIEWS, nlp).to_dict()
    food_neg = [x for x in r["reasons"]["food"] if x["tone"] == "negative"]
    assert food_neg[0]["example"] in ("The food was cold", "The dish was cold")


MORE_PARKING = [
    {"text": "Parking was a nightmare.", "stars": 2, "date": "2026-10-21"},
    {"text": "The parking was full again.", "stars": 3, "date": "2026-10-22"},
]


def test_small_shop_report_with_a_new_theme(nlp):
    r = run(REVIEWS + MORE_PARKING, nlp).to_dict()
    themes = [a for a in r["aspects"] if a.get("isNew")]
    assert [t["name"] for t in themes] == ["Parking"]  # 3 reviews, not in the catalogue


def test_one_customer_repeating_a_word_is_not_a_new_theme(nlp):
    """Final review: a single review saying "parking" three times became an isNew theme, which
    would raise a new-topic alert from one customer."""
    one = [
        {
            "text": "The parking near the parking garage was worse than any parking in town.",
            "stars": 2,
            "date": None,
        }
    ]
    assert not [a for a in run(one, nlp).to_dict()["aspects"] if a.get("isNew")]
    assert not [a for a in run(REVIEWS, nlp).to_dict()["aspects"] if a.get("isNew")]


def test_reasons_say_something_beyond_the_aspects_own_name(nlp):
    """Final review: notebook 05's reasons were mostly the aspect's name (Line → "line")."""
    r = run(REVIEWS, nlp).to_dict()
    food_neg = [x for x in r["reasons"]["food"] if x["tone"] == "negative"]
    words = {w for x in food_neg for w in x["text"].split()}
    assert not words & {"food", "dish", "biryani"}
    assert "cold" in words
    for x in food_neg:
        assert len(set(x["quoteReviewIds"])) == len(x["quoteReviewIds"])
        assert x["count"] <= 2  # reviews r2 and r4, counted once each


def test_a_shop_whose_reviews_are_all_skipped_still_gets_a_report(nlp):
    def strict_sentiment(texts):
        assert texts, "the baseline model fails on an empty batch"
        return sentiment(texts)

    reviews = [{"text": "  ", "stars": 3, "date": None}]
    r = analyze_reviews(
        reviews,
        "salon",
        sentiment=strict_sentiment,
        absa=absa,
        embed=embed,
        nlp=nlp,
        catalogue=CATALOGUE,
    ).to_dict()
    assert r["kpis"]["reviews"] == 0
    assert r["skipped"]["empty"] == 1
    assert r["reviews"] == [] and r["aspects"] == []


def test_messy_stars_and_dates_are_treated_as_missing_not_crashes(nlp):
    reviews = [
        {"text": "The food was delicious.", "stars": "4", "date": "2026-10-03T18:00:00Z"},
        {"text": "The food was cold.", "stars": 9, "date": "03/15/2024"},
        {"text": "The food was okay.", "stars": "n/a", "date": "2026-13-01"},
    ]
    r = run(reviews, nlp).to_dict()
    assert [x["stars"] for x in r["reviews"]] == [4, None, None]
    assert [x["date"] for x in r["reviews"]] == ["2026-10-03", None, None]
    assert r["kpis"]["avgStars"] == 4
    assert [m["month"] for m in r["monthly"]] == ["2026-10"]


def test_reviews_and_aspects_carry_what_the_app_contract_needs(nlp):
    """web/src/lib/data/schemas.ts: reviews need date and stars; aspects need a monthly trend and
    example review ids (per-aspect trends are what stable aspect ids are for)."""
    r = run(REVIEWS, nlp).to_dict()
    first = r["reviews"][0]
    assert (first["date"], first["stars"]) == ("2026-09-03", 5)
    food = next(a for a in r["aspects"] if a["id"] == "food")
    assert {m["month"] for m in food["monthly"]} == {"2026-09", "2026-10"}
    for m in food["monthly"]:
        assert m["pos"] + m["neg"] + m["neu"] == m["count"]
    assert sum(m["count"] for m in food["monthly"]) == food["mentions"]
    assert 1 <= len(food["exampleReviewIds"]) <= 3
    assert len(set(food["exampleReviewIds"])) == len(food["exampleReviewIds"])


def test_reasons_quote_real_reviews(nlp):
    r = run(REVIEWS, nlp).to_dict()
    food_neg = [x for x in r["reasons"]["food"] if x["tone"] == "negative"]
    assert food_neg and "cold" in food_neg[0]["text"]
    assert set(food_neg[0]["quoteReviewIds"]) <= {"r2", "r4"}


def test_output_uses_the_frontend_contracts_names(nlp):
    r = run(REVIEWS, nlp).to_dict()
    assert {
        "kpis",
        "monthly",
        "aspects",
        "bests",
        "worsts",
        "reasons",
        "reviews",
        "skipped",
    } <= set(r)
    assert {"positivePct", "negativePct", "avgStars"} <= set(r["kpis"])
    assert {"aspectId", "start", "end", "sentiment"} <= set(r["reviews"][0]["aspectMentions"][0])


def test_shop_types_map_to_catalogues():
    assert CATALOGUE_FOR["electronics"] == "appliances"
    assert CATALOGUE_FOR["salon"] == "general"
