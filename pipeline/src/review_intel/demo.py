"""The public demo shops: invented reviews, written by an LLM from a plan, then scored by the real
Part 2 models. No Yelp or Amazon text is used, so the demo can be shown publicly (Part 3 design).

The plan fixes what each review is about, its tone and its stars, with trends over time (say,
complaints about waiting grow). The LLM only turns each line of the plan into natural text. The
models never see the plan: what the dashboard shows is what they read in the text.
"""

from __future__ import annotations

import random
from datetime import date

# Each aspect: how often reviews mention it, how often a mention is negative or positive at the
# start, and how much the negative share grows by the end. Mirrors the web mock shops
# (web/src/lib/data/mock/shops.ts).
SHOPS = {
    "saffron-table": {
        "id": "saffron-table",
        "name": "Saffron Table",
        "type": "restaurant",
        "about": "a busy North Indian restaurant in Bengaluru, known for biryani and tandoor",
        "from": "2024-11",
        "months": 24,
        "growth": 0.4,
        "aspects": [
            ("food", 0.55, 0.10, 0.80, 0.02),
            ("service", 0.35, 0.20, 0.62, 0.03),
            ("wait time", 0.22, 0.40, 0.20, 0.25),
            ("ambience", 0.18, 0.10, 0.66, 0.0),
            ("price", 0.20, 0.24, 0.46, 0.03),
            ("cleanliness", 0.10, 0.10, 0.58, -0.02),
        ],
    },
    "freshcart": {
        "id": "freshcart",
        "name": "FreshCart Grocery",
        "type": "grocery",
        "about": "a neighbourhood grocery with home delivery: produce, dairy and staples",
        "from": "2024-11",
        "months": 24,
        "growth": 0.35,
        "aspects": [
            ("freshness of fruit and vegetables", 0.40, 0.30, 0.45, 0.25),
            ("prices", 0.35, 0.10, 0.72, 0.0),
            ("items in stock", 0.22, 0.28, 0.38, 0.03),
            ("home delivery", 0.30, 0.24, 0.50, 0.02),
            ("packaging", 0.12, 0.14, 0.52, 0.0),
            ("checkout", 0.15, 0.16, 0.47, -0.02),
        ],
    },
    "volthome": {
        "id": "volthome",
        "name": "VoltHome Appliances",
        "type": "electronics",
        "about": "an online appliance store: washing machines, fridges, fans, mixers",
        "from": "2024-11",
        "months": 24,
        "growth": 0.5,
        "aspects": [
            ("build quality", 0.40, 0.12, 0.74, 0.0),
            ("delivery", 0.30, 0.27, 0.45, 0.03),
            ("installation", 0.25, 0.40, 0.25, 0.20),
            ("warranty and repairs", 0.15, 0.24, 0.40, 0.02),
            ("energy use", 0.12, 0.08, 0.57, 0.0),
            ("noise", 0.14, 0.19, 0.41, 0.01),
        ],
    },
}
SEED = 42
REVIEWS_PER_SHOP = 300


def month_keys(start: str, n: int) -> list[str]:
    year, month = map(int, start.split("-"))
    keys = []
    for i in range(n):
        y, m = divmod(month - 1 + i, 12)
        keys.append(f"{year + y}-{m + 1:02d}")
    return keys


def _stars(topics: list[tuple[str, str]], rnd: random.Random) -> int:
    net = sum({"positive": 1, "negative": -1}.get(t, 0) for _, t in topics)
    if net > 0:
        return rnd.choice((4, 5, 5))
    if net < 0:
        return rnd.choice((1, 2, 2))
    return 3


def plan_reviews(shop: dict, n: int = REVIEWS_PER_SHOP, seed: int = SEED) -> list[dict]:
    """n review specs ({date, stars, topics: [(aspect, tone)]}), oldest first, more each month."""
    rnd = random.Random(f"{seed}:{shop['id']}")
    months = month_keys(shop["from"], shop["months"])
    last = max(1, len(months) - 1)
    weights = [1 + shop["growth"] * i / last for i in range(len(months))]
    # Every month gets at least one review (when there are enough); the rest follow the volume.
    base = 1 if n >= len(months) else 0
    per_month = [base] * len(months)
    for i in rnd.choices(range(len(months)), weights=weights, k=n - base * len(months)):
        per_month[i] += 1

    specs = []
    for i, (month, count) in enumerate(zip(months, per_month, strict=True)):
        t = i / last
        for _ in range(count):
            topics = []
            for name, share, neg, pos, drift in shop["aspects"]:
                if rnd.random() < share:
                    neg_now = min(0.9, max(0.02, neg + drift * t))
                    pos_now = min(0.98 - neg_now, max(0.02, pos - drift * 0.5 * t))
                    r = rnd.random()
                    tone = (
                        "negative"
                        if r < neg_now
                        else "positive"
                        if r < neg_now + pos_now
                        else "neutral"
                    )
                    topics.append((name, tone))
            if not topics:  # every review talks about something
                name, *_ = rnd.choices(shop["aspects"], weights=[a[1] for a in shop["aspects"]])[0]
                topics.append((name, rnd.choice(("positive", "positive", "negative", "neutral"))))
            y, m = map(int, month.split("-"))
            days = (date(y + m // 12, m % 12 + 1, 1) - date(y, m, 1)).days
            specs.append(
                {
                    "date": f"{month}-{rnd.randint(1, days):02d}",
                    "stars": _stars(topics, rnd),
                    "topics": topics,
                }
            )
    return specs


def prompt(shop: dict, specs: list[dict]) -> str:
    lines = "\n".join(
        f"- {s['stars']}★ — " + "; ".join(f"{name}: {tone}" for name, tone in s["topics"])
        for s in specs
    )
    return f"""You are writing realistic but entirely invented customer reviews for a demo app.
The shop is "{shop["name"]}", {shop["about"]}.

Write exactly {len(specs)} reviews, one for each line below, in the same order. Each line gives the
star rating and what the review talks about, with the customer's feeling about each topic
(neutral means mentioned without a strong opinion).

{lines}

Rules:
- Vary the length (1 to 5 sentences), voice, vocabulary and detail like real customers do. Some are
  terse, some chatty; a few have small typos. Do not start every review the same way.
- Mention concrete specifics (dishes, products, times, prices in rupees) that fit the shop.
- Talk about each listed topic in your own words. Never mention the star rating or "topics".
- Never name real people or real brands of other shops.
Return a JSON list of objects with a single key "text"."""


def accept(specs: list[dict], written: list[dict]) -> list[dict]:
    """Pairs the LLM's texts with their specs ({text, stars, date}); refuses a mismatched batch."""
    if len(written) != len(specs):
        raise ValueError(f"asked for {len(specs)} reviews, got {len(written)}")
    rows = []
    for spec, w in zip(specs, written, strict=True):
        text = (w.get("text") or "").strip()
        if not text:
            raise ValueError("the model returned an empty review")
        rows.append({"text": text, "stars": spec["stars"], "date": spec["date"]})
    return rows
