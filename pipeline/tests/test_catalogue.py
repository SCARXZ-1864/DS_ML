import numpy as np

from review_intel.aspects.catalogue import (
    build_catalogue,
    load_catalogue,
    match,
    new_themes,
    save_catalogue,
)

# A stand-in embedding: words that mean the same thing share a direction.
GROUPS = {
    "waiter": 0,
    "server": 0,
    "staff": 0,
    "food": 1,
    "biryani": 1,
    "dish": 1,
    "price": 2,
    "cost": 2,
    "parking": 3,
    "weather": 4,
}


def embed(texts):
    out = []
    for t in texts:
        v = np.zeros(8)
        g = GROUPS.get(t)
        if g is None:
            v[7] = 1.0  # everything unknown points the same "other" way
            v[5] = (hash(t) % 7) / 10
        else:
            v[g] = 1.0
            v[6] = (len(t) % 3) / 20  # small differences within a group
        out.append(v / np.linalg.norm(v))
    return np.array(out)


def phrase(text, n=1):
    return [
        {
            "review_id": f"r{i}",
            "sentence": text,
            "sent_start": 0,
            "text": text,
            "start": 0,
            "end": len(text),
        }
        for i in range(n)
    ]


def sample():
    return (
        phrase("waiter", 20)
        + phrase("server", 15)
        + phrase("staff", 5)
        + phrase("food", 30)
        + phrase("biryani", 12)
        + phrase("price", 31)
        + phrase("parking", 4)
    )


def test_similar_phrases_merge_into_one_aspect_named_after_the_commonest():
    cat = build_catalogue(sample(), embed, min_count=30, domain="restaurant")
    names = {a["name"]: a["count"] for a in cat}
    assert names["Waiter"] == 40
    assert names["Food"] == 42
    assert names["Price"] == 31


def test_aspects_below_the_minimum_count_are_dropped():
    cat = build_catalogue(sample(), embed, min_count=30, domain="restaurant")
    assert "Parking" not in {a["name"] for a in cat}


def test_ids_are_stable_slugs():
    cat = build_catalogue(sample(), embed, min_count=30, domain="restaurant")
    assert {a["id"] for a in cat} == {"waiter", "food", "price"}


def test_match_finds_the_nearest_aspect_or_none():
    cat = build_catalogue(sample(), embed, min_count=30, domain="restaurant")
    matched = dict(
        (p["text"], aid)
        for p, aid in match(phrase("staff") + phrase("dish") + phrase("weather"), cat, embed)
    )
    assert matched == {"staff": "waiter", "dish": "food", "weather": None}


def test_new_themes_need_at_least_three_mentions():
    themes = new_themes(phrase("parking", 3) + phrase("weather", 2), embed, min_mentions=3)
    assert [t["name"] for t in themes] == ["Parking"]
    assert themes[0]["isNew"] is True


def test_catalogue_round_trips_through_json(tmp_path, monkeypatch):
    from review_intel.aspects import catalogue as mod

    monkeypatch.setattr(mod, "CATALOGUE_DIR", tmp_path)
    cat = build_catalogue(sample(), embed, min_count=30, domain="restaurant")
    save_catalogue("restaurant", cat)
    assert load_catalogue("restaurant") == cat
