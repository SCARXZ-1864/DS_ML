import json
from pathlib import Path

from review_intel.data.sources import iter_amazon, iter_yelp, reservoir_sample, restaurant_ids

FIX = Path(__file__).parent / "fixtures"


def lines(name):
    return (FIX / name).read_text(encoding="utf-8").splitlines()


def test_amazon_records_map_to_raw_reviews():
    reviews = list(iter_amazon("appliances", lines("amazon_reviews.jsonl")))
    assert len(reviews) == 3
    first = reviews[0]
    assert first == {
        "review_id": "P01:U1:1519317108692",
        "domain": "appliances",
        "group_id": "P01",
        "shop_name": None,
        "stars": 5,
        "text": "Work great. work great. use a new one every month",
        "date": "2018-02-22",
    }


def test_amazon_review_without_title_keeps_only_the_text():
    reviews = list(iter_amazon("appliances", lines("amazon_reviews.jsonl")))
    assert reviews[1]["text"] == "Broke after a week."


def test_automatic_star_titles_are_dropped_because_they_leak_the_label():
    """Amazon gives untitled reviews a title like "Five Stars", which matches the rating 99.8%
    of the time, so leaving it in lets a model read the answer (notebook 02's first run)."""
    def record(title, rating):
        return json.dumps({"rating": rating, "title": title, "text": "Tasty enough for us.",
                           "parent_asin": "P", "user_id": "U", "timestamp": 1600000000000})

    texts = [r["text"] for r in iter_amazon("grocery", [
        record("Five Stars", 5.0), record("one star", 1.0), record("Two Stars ", 2.0),
        record("Five stars for flavor", 5.0),
    ])]
    assert texts[:3] == ["Tasty enough for us."] * 3
    assert texts[3] == "Five stars for flavor. Tasty enough for us."  # a real title is kept


def test_restaurant_ids_keep_only_restaurants():
    expected = {"b-rest": "Saffron House", "b-cafe": "Bean There"}
    assert restaurant_ids(lines("yelp_business.jsonl")) == expected


def test_yelp_reader_keeps_only_restaurant_reviews():
    restaurants = restaurant_ids(lines("yelp_business.jsonl"))
    reviews = list(iter_yelp(lines("yelp_review.jsonl"), restaurants))
    assert [r["review_id"] for r in reviews] == ["r1", "r3"]
    assert reviews[0] == {
        "review_id": "r1",
        "domain": "restaurant",
        "group_id": "b-rest",
        "shop_name": "Saffron House",
        "stars": 5,
        "text": "Best biryani in town.",
        "date": "2018-07-07",
    }


def test_yelp_reader_streams():
    """10,000 lines go through one at a time; only the sample is ever held in memory."""
    pulled = {"n": 0}

    def source():
        for i in range(10_000):
            pulled["n"] += 1
            row = {"review_id": f"r{i}", "business_id": "b", "stars": 4, "text": "ok"}
            yield json.dumps({**row, "date": "2020-01-01 00:00:00"})

    stream = iter_yelp(source(), {"b": "B"})
    first = next(stream)
    assert pulled["n"] == 1  # nothing was read ahead into a list
    sample = reservoir_sample(stream, k=50, seed=1)
    assert len(sample) == 50
    assert pulled["n"] == 10_000
    assert first["review_id"] == "r0"


def test_reservoir_sample_is_repeatable_and_fair_size():
    assert reservoir_sample(range(1000), 10, seed=7) == reservoir_sample(range(1000), 10, seed=7)
    assert reservoir_sample(range(5), 10, seed=7) == [0, 1, 2, 3, 4]
    assert reservoir_sample(range(1000), 10, seed=7) != reservoir_sample(range(1000), 10, seed=8)
