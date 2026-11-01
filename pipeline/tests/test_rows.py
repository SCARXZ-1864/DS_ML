from review_intel.db.rows import headline, shop_rows, top_complaints

META = {"id": "demo-cafe", "name": "Demo Cafe", "type": "restaurant", "is_demo": True}


def month(m, pos, neg, neu, stars=None):
    return {
        "month": m,
        "count": pos + neg + neu,
        "pos": pos,
        "neg": neg,
        "neu": neu,
        "stars": stars,
    }


def aspect(aid, name, mentions, pos, neg, ids=()):
    return {
        "id": aid,
        "name": name,
        "mentions": mentions,
        "posPct": pos,
        "negPct": neg,
        "neuPct": round(100 - pos - neg, 1),
        "monthly": [],
        "exampleReviewIds": list(ids),
    }


def review(rid, date, sentiment, mentions=()):
    return {
        "id": rid,
        "date": date,
        "stars": 4,
        "text": "The coffee was cold and the cake was lovely.",
        "sentiment": sentiment,
        "score": 0.5,
        "confidence": 0.9,
        "aspectMentions": [
            {"aspectId": a, "start": 4, "end": 10, "sentiment": s} for a, s in mentions
        ],
    }


REPORT = {
    "kpis": {"reviews": 3, "positivePct": 33.3, "negativePct": 33.3, "avgStars": 4.0},
    "monthly": [month("2026-01", 1, 0, 0, [0, 0, 0, 1, 0]), month("2026-03", 0, 1, 1, None)],
    "aspects": [
        aspect("food", "Food", 9, 80.0, 10.0, ["r1"]),
        aspect("wait", "Wait time", 6, 10.0, 70.0),
    ],
    "bests": ["food"],
    "worsts": ["wait"],
    "reasons": {"wait": [{"text": "queue", "tone": "negative", "count": 2}]},
    "reviews": [
        review("r1", "2026-01-05", "positive", [("food", "positive")]),
        review("r2", "2026-03-02", "negative", [("wait", "negative"), ("wait", "negative")]),
        review("r3", None, "neutral", [("wait", "negative"), ("food", "positive")]),
    ],
}


def test_shop_row_summarises_the_report():
    shop = shop_rows(META, REPORT, model="DistilBERT")["shops"][0]
    assert shop["id"] == "demo-cafe" and shop["is_demo"] is True and shop["owner_id"] is None
    assert (shop["review_count"], shop["date_from"], shop["date_to"]) == (3, "2026-01", "2026-03")
    assert shop["model"] == "DistilBERT"


def test_months_keep_counts_and_missing_stars():
    months = shop_rows(META, REPORT)["shop_months"]
    assert [(m["month"], m["count"], m["stars"]) for m in months] == [
        ("2026-01", 1, [0, 0, 0, 1, 0]),
        ("2026-03", 2, None),
    ]
    assert all(m["shop_id"] == "demo-cafe" for m in months)


def test_aspects_keep_their_order_and_reasons():
    aspects = shop_rows(META, REPORT)["aspects"]
    assert [(a["id"], a["rank"]) for a in aspects] == [("food", 0), ("wait", 1)]
    assert aspects[1]["reasons"][0]["text"] == "queue" and aspects[0]["reasons"] == []
    assert aspects[0]["example_review_ids"] == ["r1"] and aspects[0]["is_new"] is False


def test_reviews_list_each_mentioned_aspect_once_and_keep_missing_dates():
    reviews = {r["id"]: r for r in shop_rows(META, REPORT)["reviews"]}
    assert reviews["r2"]["aspect_ids"] == ["wait"]
    assert reviews["r3"]["aspect_ids"] == ["wait", "food"]
    assert reviews["r3"]["date"] is None
    assert reviews["r1"]["aspect_mentions"][0] == {
        "aspectId": "food",
        "start": 4,
        "end": 10,
        "sentiment": "positive",
    }


def test_headline_names_the_best_and_the_worst_aspect():
    parts = headline(REPORT)["parts"]
    assert "".join(p["text"] for p in parts) == (
        "Customers love the food, but wait time draws the most complaints."
    )
    assert [p.get("tone") for p in parts if p.get("tone")] == ["positive", "negative"]


def test_headline_without_ranked_aspects_uses_overall_tone():
    plain = {**REPORT, "bests": [], "worsts": []}
    assert headline(plain) == {"parts": [{"text": "Reviews are mixed so far."}]}
    happy = {**plain, "kpis": {**REPORT["kpis"], "positivePct": 80.0, "negativePct": 5.0}}
    assert headline(happy)["parts"][0]["text"] == "Reviews are mostly positive so far."


def test_top_complaints_quote_the_newest_negative_review_of_each_worst_aspect():
    assert top_complaints(REPORT) == [{"aspectId": "wait", "negPct": 70.0, "quoteReviewId": "r2"}]


def test_a_shop_with_no_reviews_has_no_dates():
    empty = {
        **REPORT,
        "kpis": {"reviews": 0},
        "monthly": [],
        "aspects": [],
        "bests": [],
        "worsts": [],
        "reasons": {},
        "reviews": [],
    }
    rows = shop_rows(META, empty)
    assert rows["shops"][0]["date_from"] is None and rows["reviews"] == []


def test_complaint_quotes_prefer_a_review_that_is_negative_overall():
    mixed = review("r9", "2026-04-01", "positive", [("wait", "negative")])  # newest, but upbeat
    report = {**REPORT, "reviews": [*REPORT["reviews"], mixed]}
    assert top_complaints(report)[0]["quoteReviewId"] == "r2"
    only_mixed = {**REPORT, "reviews": [mixed]}
    assert top_complaints(only_mixed)[0]["quoteReviewId"] == "r9"  # better than no quote
