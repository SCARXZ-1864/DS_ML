"""The repo is public, and the Yelp and Amazon licences forbid republishing review text. Re-running
a notebook puts example reviews back into its saved outputs; this fails until they are removed
with `uv run python scripts/strip_review_text.py` (see "Publishing safely" in the README)."""

import json

import pandas as pd
import pytest

from review_intel import config
from review_intel.publish import REMOVED, longest_prose, review_text_cells, strip_notebook

NOTEBOOKS = sorted((config.REPO_ROOT / "pipeline" / "notebooks").glob("*.ipynb"))
REVIEW = "I ordered the biryani and it was cold when it finally arrived at our table"


def notebook(*outputs):
    cells = [{"cell_type": "code", "source": "", "outputs": [o]} for o in outputs]
    return {"cells": cells, "metadata": {}, "nbformat": 4, "nbformat_minor": 5}


def test_prose_detection_catches_a_review_but_not_a_table():
    assert len(longest_prose(REVIEW).split()) >= 9
    assert len(longest_prose("Food 681 39.8 | Line 114 13.2\nBest: Food, Ham, Line").split()) < 9


def test_stripping_replaces_review_text_and_keeps_the_rest(tmp_path):
    review = {"output_type": "stream", "name": "stdout", "text": REVIEW}
    table = {"output_type": "stream", "name": "stdout", "text": "Food 681 39.8\n"}
    image = {"output_type": "display_data", "data": {"image/png": "iVBOR", "text/plain": REVIEW}}
    path = tmp_path / "nb.ipynb"
    path.write_text(json.dumps(notebook(review, table, image)), encoding="utf-8")
    assert strip_notebook(path) == 1
    cells = json.loads(path.read_text(encoding="utf-8"))["cells"]
    assert cells[0]["outputs"] == [{"output_type": "stream", "name": "stdout", "text": REMOVED}]
    assert cells[1]["outputs"] == [table] and cells[2]["outputs"] == [image]
    assert strip_notebook(path) == 0  # the note itself isn't review text


@pytest.mark.parametrize("path", NOTEBOOKS, ids=lambda p: p.stem)
def test_saved_notebook_outputs_hold_no_review_text(path):
    nb = json.loads(path.read_text(encoding="utf-8"))
    assert review_text_cells(nb, path.stem) == [], (
        f"{path.name} shows review text: run scripts/strip_review_text.py"
    )


def test_absa_validation_pairs_hold_labels_but_no_review_text():
    pairs = pd.read_csv(config.REPORTS_DIR / "validation" / "absa_pairs.csv")
    assert "cause" not in pairs.columns
    assert {"pair_id", "aspect", "sentiment", "gold"} <= set(pairs.columns)
    assert len(pairs) == 200
