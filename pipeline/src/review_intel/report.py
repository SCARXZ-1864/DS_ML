"""The shop report: everything the app shows about one shop, from a plain list of its reviews.

    analyze_reviews([{text, stars?, date?}, ...], shop_type, sentiment=…, absa=…, embed=…, nlp=…)

The models are passed in, so tests use instant stand-ins and notebooks pass the real ones (on the
laptop or on a Modal GPU). The output follows the web app's data contract
(web/src/lib/data/schemas.ts): camelCase keys, percentages 0–100, character offsets for causes.
"""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

from review_intel.aspects.absa import Scorer, aspect_mentions
from review_intel.aspects.catalogue import Embed, load_catalogue, match, new_themes
from review_intel.aspects.phrases import extract_phrases
from review_intel.data.clean import _is_english, clean_text

Sentiment = Callable[[list[str]], list[dict]]  # texts → [{label, score, confidence}]

# Shop types in the app (web ShopType) → which aspect catalogue to match against.
CATALOGUE_FOR = {
    "restaurant": "restaurant",
    "grocery": "grocery",
    "electronics": "appliances",
    "clothing": "general",
    "salon": "general",
    "other": "general",
}
MIN_MENTIONS = 3  # never rank an aspect on fewer mentions than this


def min_mentions(n_reviews: int) -> int:
    """How many mentions an aspect or theme needs before it counts: 3, or 2% of the reviews in a
    bigger shop. With a flat 3, a 400-review shop ranked junk like "Lack" (notebook 05)."""
    return max(MIN_MENTIONS, round(0.02 * n_reviews))


TOP = 3
_STOP_WORDS = """
the and was were are is be been being this that these those with for from but not very too our
they them their there here have has had just really also about into out over then than when what
which who will would could should can did does doing get got its it's i'm we've you your his her
him she he our ours all any some more most much one two such only own same so
"""
_STOP = frozenset(_STOP_WORDS.split())
_WORD = re.compile(r"[a-z][a-z']{2,}")


@dataclass
class ShopReport:
    kpis: dict
    monthly: list[dict]
    aspects: list[dict]
    bests: list[str]
    worsts: list[str]
    reasons: dict[str, list[dict]]
    reviews: list[dict]
    skipped: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "kpis": self.kpis,
            "monthly": self.monthly,
            "aspects": self.aspects,
            "bests": self.bests,
            "worsts": self.worsts,
            "reasons": self.reasons,
            "reviews": self.reviews,
            "skipped": self.skipped,
        }


def _pct(part: int, whole: int) -> float | None:
    return round(100 * part / whole, 1) if whole else None


_ISO_DATE = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])")


def _stars(value) -> int | None:
    """A 1–5 whole-star rating, or None for anything else ("4" from a CSV counts as 4)."""
    try:
        stars = float(value)
    except (TypeError, ValueError):
        return None
    return int(stars) if stars.is_integer() and 1 <= stars <= 5 else None


def _date(value) -> str | None:
    """YYYY-MM-DD from an ISO date or timestamp, or None. Ambiguous forms such as 03/04/2024
    (March or April?) are treated as missing rather than guessed."""
    m = _ISO_DATE.match(str(value or ""))
    return m.group(0) if m else None


def _monthly(reviews: list[dict]) -> list[dict]:
    by_month: dict[str, list[dict]] = defaultdict(list)
    for r in reviews:
        if r.get("date"):
            by_month[r["date"][:7]].append(r)
    points = []
    for month in sorted(by_month):
        rs = by_month[month]
        labels = Counter(r["sentiment"] for r in rs)
        stars = None
        if "stars" in rs[0] and all(r.get("stars") for r in rs):
            star_counts = Counter(r["stars"] for r in rs)
            stars = [star_counts.get(s, 0) for s in range(1, 6)]
        points.append(
            {
                "month": month,
                "count": len(rs),
                "pos": labels["positive"],
                "neg": labels["negative"],
                "neu": labels["neutral"],
                "stars": stars,
            }
        )
    return points


def _terms(text: str) -> list[str]:
    words = [w for w in _WORD.findall(text.lower()) if w not in _STOP]
    return words + [f"{a} {b}" for a, b in zip(words, words[1:], strict=False)]


def _base(word: str) -> str:
    """A rough singular, so "servers" and "server" count as the same word."""
    return word[:-1] if len(word) > 3 and word.endswith("s") and not word.endswith("ss") else word


def _reasons(
    mentions: list[dict],
    causes: dict[tuple[str, int, int], str],
    own_words: dict[str, set[str]],
) -> dict[str, list[dict]]:
    """For each aspect and tone, the words that set those causes apart from the shop's other causes
    (a TF-IDF-style score), each with how many reviews use it and up to 3 reviews quoting it.

    Words naming the aspect itself (`own_words`: its name and the phrases matched to it) are left
    out: they're in nearly every cause, so "line" would be the top reason for Line (final review).
    """
    all_terms = [set(_terms(causes[(m["review_id"], m["start"], m["end"])])) for m in mentions]
    df = Counter(t for ts in all_terms for t in ts)
    n = len(mentions)
    out: dict[str, list[dict]] = defaultdict(list)
    groups: dict[tuple[str, str], list[int]] = defaultdict(list)
    for i, m in enumerate(mentions):
        groups[(m["aspectId"], m["sentiment"])].append(i)
    for (aspect_id, tone), idx in groups.items():
        if tone == "neutral":
            continue
        own = own_words.get(aspect_id, set())
        tf = Counter(
            t for i in idx for t in all_terms[i] if not any(_base(w) in own for w in t.split())
        )
        scored = sorted(
            tf, key=lambda t: (-tf[t] * (math.log((1 + n) / (1 + df[t])) + 1), -len(t), t)
        )
        for term in scored[:TOP]:
            hits = [i for i in idx if term in all_terms[i]]
            reviews = list(dict.fromkeys(mentions[i]["review_id"] for i in hits))
            first = mentions[hits[0]]
            example = causes[(first["review_id"], first["start"], first["end"])]
            out[aspect_id].append(
                {
                    "text": term,
                    "tone": tone,
                    "count": len(reviews),  # reviews, each counted once
                    "quoteReviewIds": reviews[:3],
                    "example": example,  # the first cause, in the customer's own words
                }
            )
    return dict(out)


def rank_aspects(aspects: Sequence[dict], floor: int) -> tuple[list[str], list[str]]:
    """The best and worst aspect ids, at most TOP each, among those with `floor`+ mentions.

    Ranked by *net* mentions (positive minus negative, or the reverse), so both how often and
    how strongly count: 114 mentions at 60% negative outrank 9 at 70% (notebook 05). Bests lean
    positive and worsts negative, so an aspect is never both.
    """
    ranked = [a for a in aspects if a["mentions"] >= floor]

    def net(a: dict) -> float:
        return a["mentions"] * ((a["posPct"] or 0) - (a["negPct"] or 0))

    good = sorted((a for a in ranked if net(a) > 0), key=lambda a: -net(a))
    bad = sorted((a for a in ranked if net(a) < 0), key=net)
    return [a["id"] for a in good[:TOP]], [a["id"] for a in bad[:TOP]]


def analyze_reviews(
    reviews: Sequence[dict],
    shop_type: str,
    *,
    sentiment: Sentiment,
    absa: Scorer,
    embed: Embed,
    nlp,
    catalogue: list[dict] | None = None,
) -> ShopReport:
    """The full report for one shop's reviews ({text, stars?, date?} each)."""
    catalogue = (
        catalogue
        if catalogue is not None
        else load_catalogue(CATALOGUE_FOR.get(shop_type, "general"))
    )
    skipped = {"nonEnglish": 0, "empty": 0}
    kept: list[dict] = []
    for i, r in enumerate(reviews):
        text = clean_text(r.get("text") or "")
        if not text:
            skipped["empty"] += 1
        elif not _is_english(text):
            skipped["nonEnglish"] += 1
        else:
            kept.append(
                {
                    "id": f"r{i + 1}",
                    "text": text,
                    "stars": _stars(r.get("stars")),
                    "date": _date(r.get("date")),
                }
            )

    if kept:  # the baseline model fails on an empty batch
        for r, s in zip(kept, sentiment([r["text"] for r in kept]), strict=True):
            r.update(
                sentiment=s["label"], score=float(s["score"]), confidence=float(s["confidence"])
            )

    # Aspects: match to the catalogue; what's left can form this shop's own new themes.
    phrases = {r["id"]: extract_phrases(r["id"], r["text"], nlp) for r in kept}
    matched = {rid: match(ps, catalogue, embed) for rid, ps in phrases.items()}
    unmatched = [p for pairs in matched.values() for p, aid in pairs if aid is None]
    floor = min_mentions(len(kept))
    themes = new_themes(unmatched, embed, min_mentions=floor)
    names = {a["id"]: a["name"] for a in catalogue} | {t["id"]: t["name"] for t in themes}
    own_words: dict[str, set[str]] = defaultdict(set)  # words that name each aspect
    for aspect_id, name in names.items():
        own_words[aspect_id] |= {_base(w) for w in _WORD.findall(name.lower())}
    mentions: list[dict] = []
    causes: dict[tuple[str, int, int], str] = {}
    for r in kept:
        pairs = list(matched[r["id"]])
        if themes:  # give unmatched phrases a second chance against this shop's themes
            leftover = [p for p, aid in pairs if aid is None]
            pairs = [(p, aid) for p, aid in pairs if aid is not None] + match(
                leftover, themes, embed
            )
        for p, aid in pairs:
            if aid is not None:
                own_words[aid] |= {_base(w) for w in _WORD.findall(p["text"].lower())}
        ms = aspect_mentions(r["id"], r["text"], pairs, names, absa)
        for m in ms:
            causes[(m["review_id"], m["start"], m["end"])] = r["text"][m["start"] : m["end"]]
        mentions += ms

    # A new theme needs `floor` different reviews: one customer repeating a word is not a topic.
    new_ids = {t["id"] for t in themes}
    theme_reviews: dict[str, set[str]] = defaultdict(set)
    for m in mentions:
        if m["aspectId"] in new_ids:
            theme_reviews[m["aspectId"]].add(m["review_id"])
    dropped = {t for t in new_ids if len(theme_reviews[t]) < floor}
    mentions = [m for m in mentions if m["aspectId"] not in dropped]
    by_review: dict[str, list[dict]] = defaultdict(list)
    for m in mentions:
        by_review[m["review_id"]].append(m)
    for r in kept:
        r["aspectMentions"] = [
            {k: m[k] for k in ("aspectId", "start", "end", "sentiment")} for m in by_review[r["id"]]
        ]

    dates = {r["id"]: r["date"] for r in kept}
    tones: dict[str, Counter] = defaultdict(Counter)
    per_aspect: dict[str, list[dict]] = defaultdict(list)
    for m in mentions:
        tones[m["aspectId"]][m["sentiment"]] += 1
        per_aspect[m["aspectId"]].append(m)
    aspects = []
    for aspect_id, c in sorted(tones.items(), key=lambda kv: -sum(kv[1].values())):
        total = sum(c.values())
        ms = per_aspect[aspect_id]
        aspects.append(
            {
                "id": aspect_id,
                "name": names[aspect_id],
                "mentions": total,
                "posPct": _pct(c["positive"], total),
                "negPct": _pct(c["negative"], total),
                "neuPct": _pct(c["neutral"], total),
                "monthly": _monthly(
                    [{"date": dates[m["review_id"]], "sentiment": m["sentiment"]} for m in ms]
                ),
                "exampleReviewIds": list(dict.fromkeys(m["review_id"] for m in ms))[:3],
                **({"isNew": True} if aspect_id in new_ids else {}),
            }
        )
    bests, worsts = rank_aspects(aspects, floor)

    labels = Counter(r["sentiment"] for r in kept)
    stars = [r["stars"] for r in kept if r["stars"]]
    return ShopReport(
        kpis={
            "reviews": len(kept),
            "positivePct": _pct(labels["positive"], len(kept)),
            "negativePct": _pct(labels["negative"], len(kept)),
            "avgStars": round(sum(stars) / len(stars), 2) if stars else None,
        },
        monthly=_monthly(kept),
        aspects=aspects,
        bests=bests,
        worsts=worsts,
        reasons=_reasons(mentions, causes, own_words),
        # "text" is the cleaned text the mention offsets point into; "id" r<n> is the n-th review
        # given, so results can be matched back even when some reviews were skipped. Bad stars
        # and dates (a "4" string counts; 9 stars or 03/04/2024 don't) arrive here as None.
        reviews=[
            {
                k: r[k]
                for k in (
                    "id",
                    "date",
                    "stars",
                    "text",
                    "sentiment",
                    "score",
                    "confidence",
                    "aspectMentions",
                )
            }
            for r in kept
        ],
        skipped=skipped,
    )
