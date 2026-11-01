"""Remove review text from the notebooks' saved outputs before committing (the repo is public and
the Yelp and Amazon licences forbid republishing review text).

Run from pipeline/:
    uv run python scripts/strip_review_text.py
"""

import sys

from review_intel import config
from review_intel.publish import strip_notebook

sys.stdout.reconfigure(encoding="utf-8")
for path in sorted((config.REPO_ROOT / "pipeline" / "notebooks").glob("*.ipynb")):
    n = strip_notebook(path)
    print(f"{path.name}: {n} output{'s' if n != 1 else ''} removed" if n else f"{path.name}: clean")
