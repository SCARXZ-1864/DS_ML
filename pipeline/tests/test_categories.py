import numpy as np

from review_intel.aspects.categories import CATEGORIES, assign, roll_up

# A tiny stand-in for the embedding model: each word points at one category's direction.
DIRECTION = {
    "Food": 0,
    "tasty food": 0,
    "biryani": 0,
    "Biryani": 0,
    "Wait time": 1,
    "long wait": 1,
    "Minute": 1,
    "Delay": 1,
    "Service": 2,
    "staff": 2,
    "Waitress": 2,
}
CATS = [
    {"id": "food", "name": "Food", "group": "product", "seeds": ["tasty food", "biryani"]},
    {"id": "wait-time", "name": "Wait time", "group": "service", "seeds": ["long wait"]},
    {"id": "service", "name": "Service", "group": "service", "seeds": ["staff"]},
]


def embed(texts):
    out = []
    for t in texts:
        v = np.zeros(4)
        v[DIRECTION.get(t, 3)] = 1.0
        out.append(v)
    return np.array(out)


def mention(aid, start, sentiment):
    return {"aspectId": aid, "start": start, "end": start + 5, "sentiment": sentiment}


def review(rid, date, *mentions):
    return {
        "id": rid,
        "date": date,
        "stars": 3,
        "text": "x" * 40,
        "sentiment": "neutral",
        "score": 0.0,
        "confidence": 0.9,
        "aspectMentions": list(mentions),
    }


REPORT = {
    "kpis": {"reviews": 4},
    "monthly": [],
    "aspects": [
        {"id": "new-minute", "name": "Minute", "mentions": 3, "isNew": True},
        {"id": "food", "name": "Food", "mentions": 2},
        {"id": "new-biryani", "name": "Biryani", "mentions": 2, "isNew": True},
        {"id": "new-bengaluru", "name": "Bengaluru", "mentions": 2, "isNew": True},
        {"id": "new-delay", "name": "Delay", "mentions": 1, "isNew": True},
    ],
    "bests": ["food"],
    "worsts": ["new-minute"],
    "reasons": {
        "new-minute": [
            {
                "text": "forty minutes",
                "tone": "negative",
                "count": 2,
                "quoteReviewIds": ["r1"],
                "example": "forty minutes",
            }
        ],
        "new-delay": [
            {
                "text": "delay",
                "tone": "negative",
                "count": 3,
                "quoteReviewIds": ["r2"],
                "example": "a delay",
            }
        ],
        "new-biryani": [
            {
                "text": "biryani",
                "tone": "positive",
                "count": 2,
                "quoteReviewIds": ["r3"],
                "example": "biryani",
            }
        ],
    },
    "reviews": [
        review(
            "r1",
            "2026-01-03",
            mention("new-minute", 0, "negative"),
            mention("food", 10, "positive"),
        ),
        review(
            "r2",
            "2026-02-03",
            mention("new-minute", 0, "negative"),
            mention("new-delay", 0, "negative"),
        ),
        review(
            "r3",
            "2026-02-09",
            mention("new-biryani", 0, "positive"),
            mention("new-bengaluru", 10, "neutral"),
        ),
        review(
            "r4", None, mention("new-minute", 0, "positive"), mention("new-biryani", 10, "positive")
        ),
    ],
    "skipped": {},
}


def test_assign_maps_each_aspect_to_its_nearest_category_or_none():
    got = assign(["Minute", "Biryani", "Waitress", "Bengaluru"], CATS, embed)
    assert got == {
        "Minute": "wait-time",
        "Biryani": "food",
        "Waitress": "service",
        "Bengaluru": None,
    }


def test_roll_up_turns_terms_into_categories():
    out = roll_up(REPORT, CATS, embed, min_mentions=1)
    names = {a["id"]: a for a in out["aspects"]}
    assert list(names) == ["food", "wait-time"]  # most mentioned first; Bengaluru fits nothing
    food, wait = names["food"], names["wait-time"]
    assert (food["mentions"], food["posPct"]) == (3, 100.0)
    # r2 mentions Minute and Delay on the same words: one wait-time mention, not two
    assert (wait["mentions"], wait["negPct"]) == (3, 66.7)
    assert wait["name"] == "Wait time" and wait["group"] == "service" and "isNew" not in wait
    assert [m["month"] for m in wait["monthly"]] == ["2026-01", "2026-02"]  # r4 has no date
    assert food["exampleReviewIds"] == ["r3", "r1", "r4"]  # newest first, undated last


def test_roll_up_relabels_review_mentions_and_drops_the_unplaced():
    out = roll_up(REPORT, CATS, embed, min_mentions=1)
    reviews = {r["id"]: r for r in out["reviews"]}
    assert [m["aspectId"] for m in reviews["r2"]["aspectMentions"]] == ["wait-time"]
    assert [m["aspectId"] for m in reviews["r3"]["aspectMentions"]] == ["food"]


def test_roll_up_merges_reasons_strongest_first():
    out = roll_up(REPORT, CATS, embed, min_mentions=1)
    assert [r["text"] for r in out["reasons"]["wait-time"]] == ["delay", "forty minutes"]
    assert [r["text"] for r in out["reasons"]["food"]] == ["biryani"]


def test_roll_up_reranks_best_and_worst():
    out = roll_up(REPORT, CATS, embed, min_mentions=1)
    assert out["bests"] == ["food"] and out["worsts"] == ["wait-time"]


def test_every_shop_type_has_categories():
    for shop_type in ("restaurant", "grocery", "electronics", "clothing", "salon", "other"):
        cats = CATEGORIES[shop_type]
        assert 5 <= len(cats) <= 9
        assert all(c["seeds"] and c["group"] for c in cats)
        assert len({c["id"] for c in cats}) == len(cats)


def test_examples_are_newest_clear_reviews_with_both_tones():
    clear = [
        {
            **review(f"p{i}", f"2026-0{i}-01", mention("food", 0, "positive")),
            "sentiment": "positive",
        }
        for i in range(1, 5)
    ]
    grumble = {
        **review("n1", "2025-12-01", mention("food", 0, "negative")),
        "sentiment": "negative",
    }
    upbeat = {**review("u1", "2026-09-01", mention("food", 0, "negative")), "sentiment": "positive"}
    report = {
        **REPORT,
        "aspects": [{"id": "food", "name": "Food"}],
        "reasons": {},
        "reviews": [grumble, *clear, upbeat],
    }
    food = roll_up(report, CATS, embed, min_mentions=1)["aspects"][0]
    assert food["exampleReviewIds"] == ["p4", "n1", "p3"]
