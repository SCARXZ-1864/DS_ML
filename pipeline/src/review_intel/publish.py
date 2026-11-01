"""Keeping review text out of the public repo: the Yelp and Amazon licences forbid republishing it,
and re-running a notebook puts example reviews back into its saved outputs."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

REMOVED = (
    "[Output removed before publishing: it shows review text, which the Yelp and Amazon "
    "licences don't allow us to republish. Run the notebook locally to see it.]\n"
)
# Lines our own code prints, which read like prose but contain no review text.
OWN_WORDS = ("Warning: You are sending unauthenticated", "min of training")
# Cells whose reviews were written in the notebook itself (notebook 05's made-up salon).
MADE_UP = {("05_shop_report", 12)}
PROSE_WORDS = 9  # a run this long between commas or table cells is a sentence, not a table
WORD = re.compile(r"[A-Za-z][A-Za-z'’\-]*")


def output_text(out: dict) -> str:
    """Everything an output shows as text, with HTML tags turned into cell breaks."""
    parts = ["".join(out["text"])] if "text" in out else []
    for kind, value in out.get("data", {}).items():
        if kind.startswith("text/"):
            parts.append("".join(value) if isinstance(value, list) else value)
    return html.unescape(re.sub(r"<[^>]+>", " | ", "\n".join(parts)))


def longest_prose(text: str) -> str:
    """The longest run of plain words between commas, table cells or line breaks."""
    best: list[str] = []
    for piece in re.split(r"[|\n\t,;]", text):
        if any(w in piece for w in OWN_WORDS):
            continue
        run: list[str] = []
        for tok in piece.split():
            run = run + [tok] if WORD.fullmatch(tok.strip(".!?:\"()…*'")) else []
            best = max(best, run, key=len)
    return " ".join(best)


def shows_review_text(out: dict) -> bool:
    if any(kind.startswith("image/") for kind in out.get("data", {})):
        return False
    text = output_text(out)
    return not text.startswith(REMOVED[:20]) and len(longest_prose(text).split()) >= PROSE_WORDS


def review_text_cells(nb: dict, name: str) -> list[int]:
    """Indexes of code cells with an output that shows review text."""
    return [
        i
        for i, cell in enumerate(nb["cells"])
        if cell["cell_type"] == "code"
        and (name, i) not in MADE_UP
        and any(shows_review_text(out) for out in cell.get("outputs", []))
    ]


def strip_notebook(path: Path) -> int:
    """Replaces each output that shows review text with a short note; returns how many cells."""
    path = Path(path)
    nb = json.loads(path.read_text(encoding="utf-8"))
    cells = review_text_cells(nb, path.stem)
    for i in cells:
        kept = []
        for out in nb["cells"][i]["outputs"]:
            if not shows_review_text(out):
                kept.append(out)
            elif not kept or kept[-1].get("text") != REMOVED:
                kept.append({"output_type": "stream", "name": "stdout", "text": REMOVED})
        nb["cells"][i]["outputs"] = kept
    if cells:
        text = json.dumps(nb, indent=1, ensure_ascii=False) + "\n"
        path.write_text(text, encoding="utf-8", newline="\n")
    return len(cells)
