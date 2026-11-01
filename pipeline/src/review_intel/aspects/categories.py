"""Aspect categories: the few broad topics an owner thinks in (Food, Wait time, Service, ...).

Part 2 finds aspect *terms* (what customers name: "biryani", "40 minutes", "the waitress") by
matching phrases to a catalogue and clustering the rest into new themes. On a shop the catalogue
didn't foresee, that gives dozens of narrow terms (85 at the demo restaurant, Part 3). ABSA work
separates the two levels (SemEval's aspect terms vs. aspect categories). `roll_up` assigns every
term to its nearest category by embedding similarity and adds up the tones. Terms that fit no
category ("Bengaluru") are dropped, and the specific terms survive as the categories' reasons.

The categories are written per shop type, for shops of that kind in general, not for any one
demo shop. Each one is described by its name plus a few seed phrases.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Sequence

import numpy as np

from review_intel.aspects.catalogue import Embed

# Cosine similarity a term needs to its nearest category. bge-small puts almost every word between
# 0.6 and 0.95, so a cut-off can't separate junk from real terms: at the demo restaurant "Bengaluru"
# scored 0.64 and the dish "Rogan Josh" 0.60. Nearly every term's *nearest* category was right, so
# the cut-off only drops what is far from all of them. About 6% of mentions still land in the wrong
# category ("Perfection" → Ambience); a "not a topic" category was tried and swallowed real terms.
CATEGORY_THRESHOLD = 0.55
TOP_REASONS = 3


def _cat(id_: str, name: str, group: str, *seeds: str) -> dict:
    return {"id": id_, "name": name, "group": group, "seeds": list(seeds)}


_PRICE = _cat("price", "Price", "price", "price", "value for money", "expensive", "cheap", "bill")
_STAFF = _cat("service", "Service", "service", "staff", "helpful staff", "rude staff", "service")

CATEGORIES: dict[str, list[dict]] = {
    "restaurant": [
        _cat(
            "food", "Food", "product", "food", "taste", "dish", "curry", "biryani", "kebab", "bread"
        ),
        _cat("drinks", "Drinks", "product", "drinks", "coffee", "cocktails", "juice", "lassi"),
        _cat("service", "Service", "service", "service", "waiter", "staff", "server", "manager"),
        _cat(
            "wait-time", "Wait time", "service", "wait", "waited minutes", "delay", "slow", "queue"
        ),
        _cat("ambience", "Ambience", "place", "ambience", "decor", "music", "lighting", "seating"),
        _PRICE,
        _cat("cleanliness", "Cleanliness", "place", "clean", "dirty", "hygiene", "washroom"),
        _cat("portions", "Portions", "product", "portion size", "quantity", "small portions"),
    ],
    "grocery": [
        _cat(
            "freshness", "Freshness", "product", "fresh", "vegetables", "fruit", "rotten", "stale"
        ),
        _PRICE,
        _cat("stock", "Stock", "product", "in stock", "out of stock", "selection", "variety"),
        _cat("delivery", "Delivery", "delivery", "delivery", "late delivery", "delivery slot"),
        _cat("packaging", "Packaging", "delivery", "packaging", "bags", "leaking", "damaged"),
        _cat("checkout", "Checkout", "service", "checkout", "billing counter", "payment", "queue"),
        _STAFF,
    ],
    "electronics": [
        _cat("build", "Build quality", "product", "build quality", "sturdy", "broke", "material"),
        _cat("performance", "Performance", "product", "works well", "performance", "power"),
        _cat("delivery", "Delivery", "delivery", "delivery", "late delivery", "damaged box"),
        _cat("installation", "Installation", "service", "installation", "technician", "setup"),
        _cat("warranty", "Warranty", "service", "warranty", "repair", "replacement", "refund"),
        _cat("energy", "Energy use", "product", "energy use", "electricity bill", "power saving"),
        _cat("noise", "Noise", "product", "noise", "loud", "quiet", "vibration"),
        _PRICE,
    ],
    "clothing": [
        _cat("fit", "Fit", "product", "fit", "size", "too small", "too loose"),
        _cat("quality", "Quality", "product", "fabric", "stitching", "material", "faded"),
        _cat("style", "Style", "product", "design", "colour", "style", "looks"),
        _PRICE,
        _cat("returns", "Returns", "service", "return", "exchange", "refund"),
        _STAFF,
        _cat("delivery", "Delivery", "delivery", "delivery", "shipping", "late delivery"),
    ],
    "salon": [
        _cat("results", "Results", "product", "haircut", "colour", "facial", "result"),
        _cat("staff", "Staff", "service", "stylist", "staff", "friendly", "rude"),
        _cat("wait-time", "Wait time", "service", "wait", "appointment", "late", "delay"),
        _cat("hygiene", "Hygiene", "place", "clean", "hygiene", "towels", "dirty"),
        _PRICE,
        _cat("ambience", "Ambience", "place", "ambience", "music", "relaxing", "decor"),
    ],
    "other": [
        _cat("product", "Product", "product", "product", "quality", "item"),
        _STAFF,
        _cat("wait-time", "Wait time", "service", "wait", "slow", "delay", "queue"),
        _PRICE,
        _cat("place", "Place", "place", "clean", "location", "parking", "ambience"),
        _cat("delivery", "Delivery", "delivery", "delivery", "shipping", "late"),
    ],
}


def _unit(v: np.ndarray) -> np.ndarray:
    return v / np.clip(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12, None)


def assign(
    names: Sequence[str],
    categories: Sequence[dict],
    embed: Embed,
    threshold: float = CATEGORY_THRESHOLD,
) -> dict[str, str | None]:
    """Each term name → the id of its nearest category, or None below `threshold`."""
    if not names:
        return {}
    centroids = np.array(
        [
            _unit(_unit(np.asarray(embed([c["name"], *c["seeds"]]), float)).mean(0))
            for c in categories
        ]
    )
    sims = _unit(np.asarray(embed(list(names)), float)) @ centroids.T
    out = {}
    for name, row in zip(names, sims, strict=True):
        j = int(np.argmax(row))
        out[name] = categories[j]["id"] if row[j] >= threshold else None
    return out


def _strongest(reasons: list[dict]) -> list[dict]:
    """Most-used first, each word once, at most TOP_REASONS of each tone."""
    out, seen, per_tone = [], set(), Counter()
    for r in sorted(reasons, key=lambda x: -x["count"]):
        if r["text"] not in seen and per_tone[r["tone"]] < TOP_REASONS:
            seen.add(r["text"])
            per_tone[r["tone"]] += 1
            out.append(r)
    return out


def _examples(mentions: list[tuple[dict, str]], n: int = 3) -> list[str]:
    """Review ids to show for a category: the newest *clear* reviews first (the review's overall
    tone matches the mention, so it reads as praise or as a complaint), with the newest clear
    complaint and the newest clear praise both included when there are any."""
    dated = sorted((m for m in mentions if m[0]["date"]), key=lambda m: m[0]["date"], reverse=True)
    newest = dated + [m for m in mentions if not m[0]["date"]]
    clear = [(r, s) for r, s in newest if s != "neutral" and r["sentiment"] == s]
    picks = clear[:1]
    picks += [next(((r, s) for r, s in clear if s != picks[0][1]), None)] if picks else []
    picks += clear + newest
    return list(dict.fromkeys(r["id"] for r, _ in (m for m in picks if m)))[:n]


def roll_up(
    report: dict,
    categories: Sequence[dict],
    embed: Embed,
    min_mentions: int,
    threshold: float = CATEGORY_THRESHOLD,
) -> dict:
    """The report (ShopReport.to_dict()) with its aspects replaced by categories."""
    from review_intel.report import _monthly, _pct, rank_aspects

    names = {a["id"]: a["name"] for a in report["aspects"]}
    by_name = assign(list(dict.fromkeys(names.values())), categories, embed, threshold)
    cat_of = {aid: by_name[name] for aid, name in names.items()}
    info = {c["id"]: c for c in categories}

    reviews, mentions = [], defaultdict(list)  # category → [(review, sentiment)]
    for r in report["reviews"]:
        seen, kept = set(), []
        for m in r["aspectMentions"]:
            cat = cat_of.get(m["aspectId"])
            if cat is None or (cat, m["start"], m["end"]) in seen:
                continue  # two terms on the same words are one mention of the category
            seen.add((cat, m["start"], m["end"]))
            kept.append({**m, "aspectId": cat})
            mentions[cat].append((r, m["sentiment"]))
        reviews.append({**r, "aspectMentions": kept})

    pooled: dict[str, list[dict]] = defaultdict(list)
    for aid, rs in report["reasons"].items():
        if cat_of.get(aid):
            pooled[cat_of[aid]] += rs
    reasons = {cat: _strongest(rs) for cat, rs in pooled.items()}

    aspects = []
    for cat, ms in sorted(mentions.items(), key=lambda kv: (-len(kv[1]), info[kv[0]]["name"])):
        tones = Counter(s for _, s in ms)
        total = len(ms)
        aspects.append(
            {
                "id": cat,
                "name": info[cat]["name"],
                "group": info[cat]["group"],
                "mentions": total,
                "posPct": _pct(tones["positive"], total),
                "negPct": _pct(tones["negative"], total),
                "neuPct": _pct(tones["neutral"], total),
                "monthly": _monthly([{"date": r["date"], "sentiment": s} for r, s in ms]),
                "exampleReviewIds": _examples(ms),
            }
        )
    bests, worsts = rank_aspects(aspects, min_mentions)
    return {
        **report,
        "aspects": aspects,
        "bests": bests,
        "worsts": worsts,
        "reasons": {c: rs for c, rs in reasons.items() if c in mentions},
        "reviews": reviews,
    }
