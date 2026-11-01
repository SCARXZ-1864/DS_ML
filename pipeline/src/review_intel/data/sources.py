"""Readers for the three review sources.

Every reader takes an iterable of JSON lines and yields one review at a time, so a multi-GB
file is never held in memory; only the sample we keep is (RISKS R01). Downloads happen once
into data/raw/ (gitignored), because a fair random sample has to read the whole file anyway.
"""

from __future__ import annotations

import io
import json
import random
import re
import zipfile
from collections.abc import Iterable, Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import TypedDict

from review_intel import config

_STAR_TITLE = re.compile(r"^(one|two|three|four|five) stars?$", re.IGNORECASE)


class RawReview(TypedDict):
    review_id: str
    domain: str
    group_id: str  # the shop: an Amazon product (parent_asin) or a Yelp business
    shop_name: str | None
    stars: int
    text: str
    date: str  # YYYY-MM-DD


def iter_amazon(domain: str, lines: Iterable[str]) -> Iterator[RawReview]:
    """Amazon Reviews 2023 records → RawReview. The title is kept as the first sentence, except
    Amazon's automatic "Five Stars"-style titles: they repeat the rating, so a model trained on them
    would be reading the answer (ERROR_LOG 2026-11-01)."""
    for line in lines:
        r = json.loads(line)
        title = (r.get("title") or "").strip()
        if _STAR_TITLE.match(title):
            title = ""
        body = (r.get("text") or "").strip()
        text = f"{title}. {body}" if title else body
        yield {
            "review_id": f"{r['parent_asin']}:{r['user_id']}:{r['timestamp']}",
            "domain": domain,
            "group_id": r["parent_asin"],
            "shop_name": None,  # product names live in a separate metadata file
            "stars": int(r["rating"]),
            "text": text,
            "date": datetime.fromtimestamp(r["timestamp"] / 1000, tz=UTC).strftime("%Y-%m-%d"),
        }


def restaurant_ids(business_lines: Iterable[str]) -> dict[str, str]:
    """business_id → name for Yelp businesses listed under the Restaurants category."""
    out: dict[str, str] = {}
    for line in business_lines:
        b = json.loads(line)
        categories = [c.strip() for c in (b.get("categories") or "").split(",")]
        if "Restaurants" in categories:
            out[b["business_id"]] = b["name"]
    return out


def iter_yelp(review_lines: Iterable[str], restaurants: dict[str, str]) -> Iterator[RawReview]:
    """Yelp reviews of the given restaurants → RawReview; everything else is skipped."""
    for line in review_lines:
        r = json.loads(line)
        name = restaurants.get(r["business_id"])
        if name is None:
            continue
        yield {
            "review_id": r["review_id"],
            "domain": "restaurant",
            "group_id": r["business_id"],
            "shop_name": name,
            "stars": int(r["stars"]),
            "text": r["text"],
            "date": r["date"][:10],
        }


def reservoir_sample[T](items: Iterable[T], k: int, seed: int) -> list[T]:
    """A uniform random sample of k items from a stream of unknown length (algorithm R).

    Holds at most k items, so it works on files far bigger than memory.
    """
    rng = random.Random(seed)
    sample: list[T] = []
    for i, item in enumerate(items):
        if i < k:
            sample.append(item)
        else:
            j = rng.randint(0, i)
            if j < k:
                sample[j] = item
    return sample


def read_lines(path: Path) -> Iterator[str]:
    """Lines of a .jsonl file, or of the single file inside a .zip, without extracting it."""
    if path.suffix == ".zip":
        with zipfile.ZipFile(path) as zf, zf.open(zf.namelist()[0]) as raw:
            yield from io.TextIOWrapper(raw, encoding="utf-8")
    else:
        with path.open(encoding="utf-8") as f:
            yield from f


def use_system_certificates() -> None:
    """Makes Python trust the same certificates as Windows.

    Antivirus HTTPS scanning (Kaspersky on this laptop) re-signs every site with its own root
    certificate. Windows trusts it, but Python's built-in certificate list doesn't, so downloads
    fail with CERTIFICATE_VERIFY_FAILED. Using the system store keeps verification on
    (ERROR_LOG 2026-11-01).
    """
    import truststore

    truststore.inject_into_ssl()


def download_amazon(domain: str) -> Path:
    """Downloads one Amazon category's review file once (skips it if already there)."""
    from huggingface_hub import hf_hub_download

    use_system_certificates()
    category = config.AMAZON_CATEGORIES[domain]
    return Path(
        hf_hub_download(
            repo_id=config.AMAZON_DATASET,
            repo_type="dataset",
            filename=f"raw/review_categories/{category}.jsonl",
            local_dir=config.RAW_DIR / "amazon",
        )
    )


YELP_FILES = ("yelp_academic_dataset_business.json", "yelp_academic_dataset_review.json")


def download_yelp(dest: Path | None = None) -> tuple[Path, Path]:
    """Downloads only the Yelp business and review files from Kaggle, skipping files that exist.

    Kaggle serves each file zipped; read_lines() reads them straight from the zip.
    """
    dest = dest or config.RAW_DIR / "yelp"
    dest.mkdir(parents=True, exist_ok=True)
    paths = []
    for name in YELP_FILES:
        existing = [p for p in (dest / name, dest / f"{name}.zip") if p.exists()]
        if not existing:
            # In-process API (not the CLI) so the system certificates above apply to it too.
            use_system_certificates()
            from kaggle.api.kaggle_api_extended import KaggleApi

            api = KaggleApi()
            api.authenticate()
            api.dataset_download_file(config.YELP_KAGGLE, name, path=str(dest), quiet=False)
            existing = [p for p in (dest / name, dest / f"{name}.zip") if p.exists()]
        paths.append(existing[0])
    return paths[0], paths[1]
