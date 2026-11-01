"""A Part 2 shop report (ShopReport.to_dict()) as database rows, plus the two things the report
leaves to its reader: the one-line headline and the top complaints on the Overview page."""

from __future__ import annotations


def headline(report: dict) -> dict:
    """Structured parts, never HTML (the web Headline type): best aspect, then worst."""
    names = {a["id"]: a["name"] for a in report["aspects"]}
    best = names.get(next(iter(report["bests"]), None))
    worst = names.get(next(iter(report["worsts"]), None))
    if best and worst:
        return {
            "parts": [
                {"text": "Customers love the "},
                {"text": best.lower(), "tone": "positive"},
                {"text": ", but "},
                {"text": worst.lower(), "tone": "negative"},
                {"text": " draws the most complaints."},
            ]
        }
    if best:
        return {
            "parts": [
                {"text": "Customers love the "},
                {"text": best.lower(), "tone": "positive"},
                {"text": "."},
            ]
        }
    if worst:
        return {
            "parts": [{"text": worst, "tone": "negative"}, {"text": " draws the most complaints."}]
        }
    kpis = report["kpis"]
    pos, neg = kpis.get("positivePct") or 0, kpis.get("negativePct") or 0
    tone = (
        "mostly positive" if pos >= 60 and neg < 20 else "mostly negative" if neg >= 40 else "mixed"
    )
    return {"parts": [{"text": f"Reviews are {tone} so far."}]}


def _newest_first(reviews: list[dict]) -> list[dict]:
    """Newest first; reviews without a date last."""
    dated = sorted((r for r in reviews if r["date"]), key=lambda r: r["date"], reverse=True)
    return dated + [r for r in reviews if not r["date"]]


def top_complaints(report: dict) -> list[dict]:
    """The worst aspects (Part 2's ranking), each quoted by the newest review that complains about
    it, preferring reviews that are negative overall: a happy review that grumbles once
    ("waited 20 minutes, which is normal") makes a weak example of a complaint."""
    pct = {a["id"]: a["negPct"] for a in report["aspects"]}
    newest = _newest_first(report["reviews"])
    reviews = [r for r in newest if r["sentiment"] == "negative"] + [
        r for r in newest if r["sentiment"] != "negative"
    ]
    out = []
    for aspect_id in report["worsts"]:
        quote = next(
            (
                r["id"]
                for r in reviews
                if any(
                    m["aspectId"] == aspect_id and m["sentiment"] == "negative"
                    for m in r["aspectMentions"]
                )
            ),
            None,
        )
        out.append({"aspectId": aspect_id, "negPct": pct[aspect_id] or 0, "quoteReviewId": quote})
    return out


def shop_rows(meta: dict, report: dict, model: str | None = None) -> dict[str, list[dict]]:
    """Rows for each table, keyed by table name. `meta` holds id, name, type, is_demo, owner_id."""
    shop_id = meta["id"]
    months = [m["month"] for m in report["monthly"]]
    shop = {
        "id": shop_id,
        "name": meta["name"],
        "type": meta["type"],
        "is_demo": meta.get("is_demo", False),
        "owner_id": meta.get("owner_id"),
        "review_count": report["kpis"]["reviews"],
        "date_from": min(months) if months else None,
        "date_to": max(months) if months else None,
        "headline": headline(report),
        "top_complaints": top_complaints(report),
        "model": model,
    }
    shop_months = [
        {
            "shop_id": shop_id,
            **{k: m[k] for k in ("month", "count", "pos", "neg", "neu")},
            "stars": m.get("stars"),
        }
        for m in report["monthly"]
    ]
    aspects = [
        {
            "shop_id": shop_id,
            "id": a["id"],
            "name": a["name"],
            "grp": a.get("group"),
            "is_new": bool(a.get("isNew")),
            "mentions": a["mentions"],
            "pos_pct": a["posPct"] or 0,
            "neg_pct": a["negPct"] or 0,
            "neu_pct": a["neuPct"] or 0,
            "monthly": a["monthly"],
            "example_review_ids": a["exampleReviewIds"],
            "reasons": report["reasons"].get(a["id"], []),
            "rank": rank,
        }
        for rank, a in enumerate(report["aspects"])
    ]
    reviews = [
        {
            "shop_id": shop_id,
            **{
                k: r[k] for k in ("id", "date", "stars", "text", "sentiment", "score", "confidence")
            },
            "aspect_mentions": r["aspectMentions"],
            "aspect_ids": list(dict.fromkeys(m["aspectId"] for m in r["aspectMentions"])),
        }
        for r in report["reviews"]
    ]
    return {"shops": [shop], "shop_months": shop_months, "aspects": aspects, "reviews": reviews}
