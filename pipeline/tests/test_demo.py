from collections import Counter

import pytest

from review_intel import demo

SHOP = demo.SHOPS["saffron-table"]


def test_plan_spreads_reviews_over_the_months_and_grows():
    plan = demo.plan_reviews(SHOP, n=300, seed=1)
    assert len(plan) == 300
    months = Counter(p["date"][:7] for p in plan)
    assert sorted(months) == demo.month_keys(SHOP["from"], SHOP["months"])
    first, last = sorted(months)[0], sorted(months)[-1]
    assert months[last] > months[first]


def test_plan_is_reproducible():
    assert demo.plan_reviews(SHOP, n=50, seed=7) == demo.plan_reviews(SHOP, n=50, seed=7)


def test_every_review_has_topics_and_stars_that_follow_their_tone():
    for p in demo.plan_reviews(SHOP, n=300, seed=2):
        assert p["topics"] and 1 <= p["stars"] <= 5
        net = sum({"positive": 1, "negative": -1}.get(t, 0) for _, t in p["topics"])
        assert (
            (net > 0 and p["stars"] >= 4)
            or (net < 0 and p["stars"] <= 2)
            or (net == 0 and p["stars"] == 3)
        )


def test_the_drifting_aspect_gets_worse_over_time():
    plan = demo.plan_reviews(SHOP, n=2000, seed=3)
    half = sorted(p["date"] for p in plan)[1000]

    def neg_share(rows):
        tones = [t for p in rows for a, t in p["topics"] if a == "wait time"]
        return tones.count("negative") / len(tones)

    early = [p for p in plan if p["date"] < half]
    late = [p for p in plan if p["date"] >= half]
    assert neg_share(late) > neg_share(early) + 0.05


def test_prompt_lists_every_review_to_write():
    specs = demo.plan_reviews(SHOP, n=5, seed=4)
    text = demo.prompt(SHOP, specs)
    assert "Saffron Table" in text and text.count("\n- ") >= 5
    assert all(f"{s['stars']}★" in text for s in specs)


def test_accept_checks_the_model_wrote_one_review_per_spec():
    specs = demo.plan_reviews(SHOP, n=2, seed=5)
    written = [{"text": "Lovely biryani and quick service."}, {"text": "We waited far too long."}]
    rows = demo.accept(specs, written)
    assert [r["text"] for r in rows] == [w["text"] for w in written]
    assert [(r["stars"], r["date"]) for r in rows] == [(s["stars"], s["date"]) for s in specs]
    with pytest.raises(ValueError, match="2 reviews"):
        demo.accept(specs, written[:1])
    with pytest.raises(ValueError, match="empty"):
        demo.accept(specs, [{"text": "ok"}, {"text": "  "}])
