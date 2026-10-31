# Part 2: ML Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real models behind the app:
- a multi-domain review dataset;
- a TF-IDF baseline and a fine-tuned DistilBERT sentiment model;
- automatic aspects with per-aspect sentiment and causes;
- `analyze_reviews(reviews) -> ShopReport`.

Each step is shown in a notebook that runs from the terminal with its outputs saved.

**Architecture:**
- The pure logic lives in the `review_intel` Python package (`pipeline/src/review_intel/`) with fast unit tests that use stub models.
- Notebooks in `pipeline/notebooks/` call the package and show the results.
- Heavy model work (training, batch scoring, embeddings) runs in functions of a Modal app (`pipeline/src/review_intel/gpu.py`) that the notebooks call. Results come back as files in a Modal Volume and are downloaded to `data/processed/` and `pipeline/models/`.

**Tech stack:**
- Python 3.12 with uv.
- pandas and pyarrow; scikit-learn; matplotlib.
- datasets, transformers and torch (CPU wheel locally, GPU on Modal); sentence-transformers; spaCy with `en_core_web_sm`.
- langdetect, kaggle, modal, huggingface_hub.
- jupyter and nbconvert; pytest and ruff.

**Spec:** `docs/superpowers/specs/2026-10-31-part2-ml-core-design.md`

## Global Constraints

- **Workspace:** `C:\dev\review-intel`, branch `feat/ml-core` (created from `feat/frontend-mock` in Task 1). Python only through `uv` inside `pipeline/` (`uv add`, `uv run`).
- **Memory (the laptop often has 1–2 GB free):**
  - Never read a whole raw file into memory; stream it line by line or in batches.
  - Load at most one model at a time on the laptop.
  - No `pnpm`/`next` server may run during data or model work. Check port 3000 first and stop any leftover `review-intel\web` server.
- **Data sizes (`config.py`):**
  - `DOMAINS = ("restaurant", "grocery", "appliances")`
  - `PER_DOMAIN_SAMPLE = 50_000`
  - `DEV_PER_DOMAIN = 7_000` (~20k in total)
  - `SEED = 42`
  - splits 0.8 / 0.1 / 0.1, grouped by `group_id`
- **Labels:** stars 1–2 → `negative`, 3 → `neutral`, 4–5 → `positive`. English only, using `langdetect` with a fixed seed.
- **Modal budget:**
  - At most **$5** of credits for all of Part 2.
  - Each GPU function sets `timeout` (training ≤ 3,600 s, scoring ≤ 1,800 s) and uses the cheapest GPU that fits, starting with `T4`.
  - Each notebook prints the estimated cost before a run and the actual elapsed time after it.
- **Secrets:**
  - The Kaggle token and the HF token live only in the user's profile (`C:\Users\HP\.kaggle\`, or user environment variables) and in Modal secrets. Never in the repo, notebooks, logs or the OneDrive mirror.
  - Notebooks must not print environment variables.
- **Notebooks:**
  - Start with "What this does and why".
  - Explain each step in plain words in markdown cells.
  - End with "Key findings".
  - Run with `uv run jupyter nbconvert --to notebook --execute --inplace notebooks/<name>.ipynb` from `pipeline/`. The outputs are committed.
  - Figures are also saved to `pipeline/reports/figures/` (PNG, ≤ 200 KB each).
- **Metrics:** macro F1 is the headline number. Always use the **same** test split for every model. Write metrics to `pipeline/reports/metrics/<model>.json`.
- **Licences:** raw data never goes into git or onto the HF Hub (`/data/` is already gitignored). The data card names each source and its licence.
- **Commits and rules:**
  - Small `type: description` commits, each ending with both attribution lines: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01FXxW1BzKF25uzwgsiqqAZg`.
  - Run the mirror script after each commit.
  - Follow the ERROR_LOG process. STOP at each milestone marked **STOP**.

## Review Focus

1. **Leaks between splits.** The same product, business or near-identical text must never appear in both train and test. Otherwise the scores look better than they really are. Pinned in Task 4 (`test_split_keeps_groups_together`, `test_near_duplicates_removed_before_split`).
2. **The 5 GB Yelp file blowing up memory.** Reading must stream and keep only the sample. Pinned in Task 3 (`test_yelp_reader_streams` uses a generator-only file object and checks the peak list size).
3. **Runaway GPU spend.** A hung run must stop at its timeout, and a rerun must not silently retrain. Pinned in Task 8 (`test_training_config_has_timeout_and_budget`) and Task 10 (the scoring reuses cached results when its input hash matches).
4. **Reviews without stars or dates, empty text, or non-English text** given to `analyze_reviews`. The report should still build, with `avgStars: null`, no monthly points, and a skipped count. Pinned in Task 11.
5. **A shop with very few reviews (5–20)** in the report. It should use catalogue matching with no clustering crash, and themes should appear only when they have at least 3 mentions. Pinned in Task 11 (`test_small_shop_report`).

---

## File map

```
pipeline/
  pyproject.toml                                  modify: dependency groups data/ml/nb (Task 2)
  src/review_intel/config.py(+test)               modify: domains, sizes, sources (Task 2)
  src/review_intel/data/sources.py(+test)         create: Amazon streamer, Yelp restaurant reader (Task 3)
  src/review_intel/data/clean.py(+test)           create: clean, language, labels, dedupe (Task 4)
  src/review_intel/data/split.py(+test)           create: grouped split (Task 4)
  src/review_intel/data/build.py                  create: build_dataset(dev: bool) end to end (Task 5)
  src/review_intel/models/baseline.py(+test)      create (Task 7)
  src/review_intel/models/metrics.py(+test)       create: macro F1, per-class, confusion, JSON (Task 7)
  src/review_intel/gpu.py                         create: Modal app, Volume, train/score/embed functions (Tasks 8, 10)
  src/review_intel/models/distilbert.py(+test)    create: class weights, training config, predict wrapper (Task 8)
  src/review_intel/aspects/phrases.py(+test)      create: candidate phrases with char offsets (Task 9)
  src/review_intel/aspects/catalogue.py(+test)    create: cluster → catalogue, match, new themes (Task 9)
  src/review_intel/aspects/absa.py(+test)         create: pairs, scoring adapter, causes (Task 10)
  src/review_intel/report.py(+test)               create: ShopReport dataclasses + analyze_reviews (Task 11)
  notebooks/01_data.ipynb … 05_shop_report.ipynb  create (Tasks 5, 7, 8, 10, 11)
  reports/data_card.md, metrics/*.json, figures/*.png, validation/absa_pairs.csv
PLAN.md, RISKS.md, README.md                      modify (Task 1)
```

---

### Task 1: Update PLAN.md, RISKS.md and the README for the new scope **(STOP after)**

**Files:** Modify `PLAN.md`, `RISKS.md`, `README.md`.

- [ ] **Step 1:** Create the branch: `git checkout -b feat/ml-core`.
- [ ] **Step 2:** Update PLAN.md:
  - **§0 TL;DR and §1:** any shop type; three demo domains; automatic aspects; owner SaaS; Google Business Profile import and search preview (from the frontend spec's 2026-10-31 addition).
  - **§4:** replace M1–M6 with Part 2 milestones P2-M1…M5 that point to this plan, and add the 7 parts.
  - **§5 data flow:** Modal instead of Colab.
  - **§7:** add the new decisions (domains and sources, Kaggle Yelp, Modal for GPU, $5 budget, aspect catalogue). Mark decision #1 (cell phones) as superseded.
- [ ] **Step 3:** Update RISKS.md:
  - Add risks for Modal credit overspend, the Yelp licence (non-commercial), domain imbalance in the metrics, aspect catalogue drift, and a Kaggle token leak.
  - Mark phone-specific risks as superseded.
- [ ] **Step 4:** Update the README status line for Part 2 starting, and link the new spec and plan.
- [ ] **Step 5:** Commit `docs: update plan, risks and README for multi-domain scope and Part 2`, then mirror.
- [ ] **Step 6: STOP.** Show the user a short summary of what changed, and wait for their go-ahead.

### Task 2: Dependencies, config and credentials

**Files:**
- Modify: `pipeline/pyproject.toml`, `pipeline/src/review_intel/config.py`
- Test: `pipeline/tests/test_config.py`

**Interfaces — produces** (`config.py`):
- `DOMAINS`, `PER_DOMAIN_SAMPLE`, `DEV_PER_DOMAIN`
- `AMAZON_CATEGORIES = {"grocery": "Grocery_and_Gourmet_Food", "appliances": "Appliances"}`
- `YELP_KAGGLE = "yelp-dataset/yelp-dataset"`
- `SPLITS = {"train": 0.8, "val": 0.1, "test": 0.1}`
- `MODELS_DIR = REPO_ROOT / "pipeline" / "models"`
- `MODAL_BUDGET_USD = 5.0`
- `BASE_MODEL = "distilbert-base-uncased"`
- `ABSA_MODEL = "yangheng/deberta-v3-base-absa-v1.1"`
- `EMBED_MODEL = "BAAI/bge-small-en-v1.5"`

`CATEGORY` and `DATASET_REPO` are removed. Their test is updated, not deleted.

- [ ] **Step 1: Failing tests:**
  - `DOMAINS` has the 3 names.
  - The split fractions sum to 1.
  - Every `AMAZON_CATEGORIES` key is in `DOMAINS`.
  - `MODELS_DIR` and `RAW_DIR` are inside `REPO_ROOT`.
  - The `.gitignore` covers `/data/` and `pipeline/models/`. Read `.gitignore` and assert both patterns.
- [ ] **Step 2:** `uv run pytest tests/test_config.py` → FAIL.
- [ ] **Step 3: Implement config.** Add `pipeline/models/` to `.gitignore`. Add the dependency groups with `uv add`:
  - data: pandas, pyarrow, datasets, langdetect, kaggle
  - ml: scikit-learn, matplotlib, transformers, sentence-transformers, spacy, huggingface_hub, modal
  - nb: jupyter, nbconvert, ipykernel

  Add torch from the **CPU** wheel index, using `[tool.uv.sources]` with the PyTorch CPU index. Then run `uv run python -m spacy download en_core_web_sm`.
- [ ] **Step 4:** Tests → PASS. `uv run ruff check .` is clean.
- [ ] **Step 5: Credentials.** Check the current Kaggle CLI docs for how a `KGAT_` access token is read (an environment variable or a token file), store the user's token that way under `C:\Users\HP\` (never in the repo), and verify with `uv run kaggle datasets files yelp-dataset/yelp-dataset` (lists files, no download). Check that `modal` is logged in with `uv run modal profile current`. Record in the commit message *that* the credentials were configured, never the values.
- [ ] **Step 6:** Commit `chore(pipeline): ML dependencies and multi-domain config`, then mirror.

### Task 3: Data sources

**Files:**
- Create: `pipeline/src/review_intel/data/sources.py`, `pipeline/tests/test_sources.py`, `pipeline/tests/fixtures/{yelp_business.jsonl,yelp_review.jsonl,amazon_reviews.jsonl}` (5–20 lines each, hand-made)

**Interfaces — produces:**
- `RawReview = TypedDict` with: `review_id: str`, `domain: str`, `group_id: str`, `shop_name: str | None`, `stars: int`, `text: str`, `date: str` (YYYY-MM-DD).
- `iter_amazon(domain: str, *, records: Iterable[dict] | None = None) -> Iterator[RawReview]`. It streams from Hugging Face (`datasets.load_dataset(..., streaming=True)`) unless `records` is given (tests). Mapping:
  - `group_id` = `parent_asin`
  - `review_id` = `f"{parent_asin}:{user_id}:{timestamp}"`
  - `text` = title + ". " + text (title dropped when empty)
  - `date` from the millisecond timestamp
- `restaurant_ids(business_lines: Iterable[str]) -> dict[str, str]` maps business_id → name for businesses whose `categories` includes `Restaurants`.
- `iter_yelp(review_lines: Iterable[str], restaurants: dict[str, str]) -> Iterator[RawReview]` keeps only reviews of those businesses. Mapping: `group_id` = business_id, `shop_name` = name, `date` = the first 10 characters of `date`.
- `reservoir_sample(items: Iterable[T], k: int, seed: int) -> list[T]` (algorithm R) keeps at most `k` items in memory.
- `download_yelp(dest: Path) -> tuple[Path, Path]` uses the Kaggle API to download only `yelp_academic_dataset_business.json` and `yelp_academic_dataset_review.json`, skipping files that already exist.

- [ ] **Step 1: Failing tests:**
  - The Amazon fixture maps to `RawReview` with the joined title and text and an ISO date.
  - `restaurant_ids` keeps only `Restaurants` businesses, including a business with `categories: null` (skipped).
  - `iter_yelp` drops non-restaurant reviews.
  - `test_yelp_reader_streams`: feed `iter_yelp` a generator of 10,000 synthetic lines and take `reservoir_sample(k=50)`. The result has length 50, and the generator was consumed lazily (wrap it in a counter and assert it was pulled one item at a time, not converted to a list first).
  - `reservoir_sample` is repeatable with the same seed.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(pipeline): streaming readers for Amazon and Yelp restaurant reviews`.

### Task 4: Cleaning, labels, dedupe and grouped split

**Files:**
- Create: `data/clean.py`, `data/split.py`
- Test: `tests/test_clean.py`, `tests/test_split.py`

**Interfaces — produces:**
- `clean_text(s: str) -> str` strips HTML tags and entities and collapses whitespace.
- `keep(review) -> str | None` returns a drop reason (`"short"` under 15 characters after cleaning, `"non_english"`, `"no_stars"`) or None.
- `label_for(stars: int) -> str`
- `dedupe(df) -> df` removes exact and near-duplicate texts (lowercased, punctuation and digits stripped, first 200 characters) **before** the split.
- `grouped_split(df, fractions, seed) -> pd.Series[str]` assigns whole groups to train, val or test, aiming at the fractions by review count. It works per domain, so each domain gets roughly 80/10/10.
- `CleaningReport = dict[str, int]` counts each drop reason, for the data card.

- [ ] **Step 1: Failing tests:**
  - HTML is stripped (`"<br />Great&amp;cheap"` → `"Great&cheap"`).
  - Short, empty and French reviews are dropped with the right reason.
  - The labels map exactly as specified.
  - `test_near_duplicates_removed_before_split`: two texts differing only in case and punctuation keep one.
  - `test_split_keeps_groups_together`: no group_id appears in two splits.
  - Fractions within ±5 points on a 600-row synthetic frame of 60 groups.
  - Same seed gives the same split.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(pipeline): cleaning, labels, dedupe and grouped splits`.

### Task 5: Build the dataset and notebook 01 on the dev sample **(STOP after)**

**Files:**
- Create: `data/build.py`, `notebooks/01_data.ipynb`
- Write: `reports/data_card.md`

**Interfaces — produces:** `build_dataset(dev: bool = True) -> tuple[pd.DataFrame, dict]`. It samples `DEV_PER_DOMAIN` or `PER_DOMAIN_SAMPLE` per domain with `reservoir_sample`, cleans, dedupes, splits, and writes `data/interim/reviews{_dev}.parquet`.
- Columns: `review_id, domain, group_id, shop_name, stars, text, date, label, split`
- The returned dict holds the cleaning counts per domain.

- [ ] **Step 1:** Write a small test, `test_build_dataset_on_fixtures`: monkeypatch the sources to the fixtures. It asserts the parquet columns, that every label is valid, and that no group appears in two splits.
- [ ] **Step 2:** Run → FAIL. Implement → PASS. Commit.
- [ ] **Step 3:** Download the Yelp files (`download_yelp`). Note the disk space used in the notebook.
- [ ] **Step 4:** Write `01_data.ipynb`:
  1. Sources and licences.
  2. Build the dev dataset.
  3. Cleaning counts as a table.
  4. Label balance per domain (chart).
  5. Review length distribution (chart).
  6. Reviews over time (chart).
  7. Example reviews per label.
  8. Sanity checks (5★ reviews containing "terrible", etc.).
  9. Group-leak check (prints 0).
  10. Key findings.

  Run it from the terminal. Write `reports/data_card.md` from the same numbers.
- [ ] **Step 5:** Commit `feat(pipeline): dataset build and data notebook on the dev sample`, then mirror.
- [ ] **Step 6: STOP.** Send the notebook and the data card to the user (SendUserFile). Ask for the go-ahead to build the full 150k set and start paid GPU work.

### Task 6: Full dataset

- [ ] **Step 1:** Run `build_dataset(dev=False)` from a short script, watching free memory. Re-run `01_data.ipynb` with `DEV = False` (a parameter cell at the top). Update the data card.
- [ ] **Step 2:** Commit `data: full multi-domain dataset build (data card and notebook)`.

### Task 7: Metrics and the baseline (notebook 02) **(STOP after)**

**Files:**
- Create: `models/metrics.py`, `models/baseline.py`, `notebooks/02_baseline.ipynb`
- Tests: `tests/test_metrics.py`, `tests/test_baseline.py`

**Interfaces — produces:**
- `evaluate(y_true, y_pred, labels=LABELS) -> dict` returns `{macro_f1, accuracy, per_class: {label: {precision, recall, f1, support}}, confusion: list[list[int]]}`.
- `evaluate_by_domain(df, pred_col) -> dict[str, dict]`
- `save_metrics(name: str, metrics: dict) -> Path` writes `reports/metrics/{name}.json` with a timestamp and the test set size.
- `train_baseline(train_df, val_df, seed) -> Pipeline`: TF-IDF word 1–2-grams plus character 3–5-grams, `LogisticRegression(class_weight="balanced")`, a small grid over `C` in {0.5, 1, 2, 4}, chosen by validation macro F1.
- `top_terms(pipeline, n) -> dict[label, list[str]]`

- [ ] **Step 1: Failing tests:**
  - `evaluate` on a known 6-item example gives macro F1 ≈ 0.611 and the matching confusion matrix.
  - The baseline trained on 60 tiny synthetic reviews predicts "terrible awful" as negative and "great lovely" as positive.
  - `save_metrics` writes valid JSON.
- [ ] **Step 2:** Run → FAIL. Implement → PASS. Commit.
- [ ] **Step 3:** Write `02_baseline.ipynb`:
  1. What a baseline is and why it comes first.
  2. Train.
  3. Test macro F1 and the per-class table.
  4. Confusion matrix (PNG).
  5. Per-domain table.
  6. Top words per class.
  7. Five wrong predictions with comments.
  8. Key findings.

  Run it. Save `metrics/baseline.json`.
- [ ] **Step 4:** Commit and mirror. **STOP**: send the notebook to the user and summarise the scores.

### Task 8: DistilBERT on Modal (notebook 03) **(STOP after)**

**Files:**
- Create: `gpu.py`, `models/distilbert.py`, `notebooks/03_distilbert.ipynb`
- Test: `tests/test_distilbert.py`

**Interfaces — produces:**
- `class_weights(labels: Sequence[str]) -> list[float]`: inverse frequency, normalised to mean 1, in `LABELS` order.
- `TrainConfig` (dataclass) with:
  - `model=BASE_MODEL`, `max_len=256`, `epochs=3`, `lr=5e-5`, `batch_size=32`, `fp16=True`
  - `early_stopping_patience=1`, `seed=SEED`
  - `gpu="T4"`, `timeout_s=3600`, `est_cost_usd: float`
  - `holdout_domain: str | None = None`
- `estimate_cost(n_train, cfg) -> float` uses the T4 hourly price as a constant with a comment citing Modal's pricing page as of the run date.
- **In `gpu.py`** (`app = modal.App("review-intel-train")`):
  - A Volume `review-intel-artifacts` and an image with torch, transformers, datasets and scikit-learn.
  - `train_sentiment(train_parquet: bytes, val_parquet: bytes, cfg: dict) -> dict` runs on the GPU. It uses the Hugging Face `Trainer` with a weighted cross-entropy loss and **prints** progress per epoch (loss and validation macro F1), which the notebook shows. It saves the best checkpoint to the Volume under `distilbert/{run_id}` and returns `{run_id, history, val_metrics, seconds}`.
  - `predict(texts: list[str], run_id: str) -> list[dict]` runs on the GPU in batches of 256 and returns `{label, score, confidence}`, where score = P(pos) − P(neg).
- `download_model(run_id) -> Path` copies the model from the Volume to `pipeline/models/distilbert/{run_id}`.

- [ ] **Step 1: Failing tests:**
  - `class_weights(["positive"]*8 + ["negative"]*2)` gives the negative weight greater than the positive one, with a mean of 1.
  - `test_training_config_has_timeout_and_budget`: `TrainConfig().timeout_s <= 3600`, and `estimate_cost(150_000, TrainConfig()) < MODAL_BUDGET_USD`.
- [ ] **Step 2:** Run → FAIL. Implement the pure parts → PASS. Commit.
- [ ] **Step 3:** A smoke run on Modal with 2,000 training rows and 1 epoch, to check the pipeline end to end at a cost of cents. Fix problems under the ERROR_LOG rules.
- [ ] **Step 4:** Write `03_distilbert.ipynb`:
  1. What fine-tuning is.
  2. The cost estimate.
  3. The training run, with streamed epoch logs.
  4. Test metrics on the same test set: the side-by-side table against the baseline, both confusion matrices, and the per-domain table.
  5. The held-out-domain experiment (`holdout_domain="appliances"`), reported.
  6. An error analysis of 30 misclassified reviews, sorted into sarcasm, mixed feelings, stars disagreeing with the text, and other.
  7. Elapsed time and cost.
  8. Key findings.

  Save `metrics/distilbert.json` and `metrics/distilbert_holdout.json`.
- [ ] **Step 5: Hugging Face Hub.** Ask the user for an HF **write** token (it goes into a Modal secret and the user's environment, not the chat if avoidable). Push the model with a model card (data, labels, metrics, limits). If the user prefers to wait, keep the model on the Volume and locally, and note it.
- [ ] **Step 6:** Commit and mirror. **STOP**: send the notebook and summarise.

### Task 9: Aspect phrases and the catalogue

**Files:**
- Create: `aspects/phrases.py`, `aspects/catalogue.py`
- Tests: `tests/test_phrases.py`, `tests/test_catalogue.py`

**Interfaces — produces:**
- `Phrase = TypedDict` with: `review_id`, `sentence: str`, `sent_start: int`, `text: str` (lowercased lemma form), `start: int`, `end: int` (character offsets into the review).
- `extract_phrases(review_id: str, text: str, nlp) -> list[Phrase]`: noun chunks from spaCy with determiners and pronouns dropped, a stoplist (`"it"`, `"thing"`, `"place"`, `"product"`, `"time"`, …), and 1–3 tokens.
- `build_catalogue(phrases: list[Phrase], embed: Callable[[list[str]], np.ndarray], *, min_count=30, max_aspects=15, domain: str) -> list[CatalogueAspect]`:
  - It clusters unique phrases weighted by frequency (agglomerative clustering on cosine distance, threshold tuned in the notebook).
  - It keeps clusters with at least `min_count` mentions.
  - It names each cluster by its most frequent phrase, title-cased.
  - `CatalogueAspect = {id: slug(name), name, centroid: list[float], examples: list[str], count}`.
- `save_catalogue(domain, aspects)` and `load_catalogue(domain)` use `pipeline/models/aspects/{domain}.json`. The `"general"` catalogue is built from all domains.
- `match(phrases, catalogue, embed, threshold=0.55) -> list[(Phrase, aspect_id | None)]`
- `new_themes(unmatched: list[Phrase], embed, min_mentions=3) -> list[CatalogueAspect]` with `isNew` semantics.

- [ ] **Step 1: Failing tests** (spaCy is used for real, since the small model is fast; embeddings use a **stub** that maps known words to fixed vectors):
  - The offsets satisfy `text[start:end]` equal to the original phrase text.
  - "The waiter was rude" yields "waiter".
  - Pronouns are dropped.
  - The catalogue merges "waiter" and "server" (the stub puts them close together).
  - The catalogue drops clusters under `min_count`.
  - `match` returns None for an unrelated phrase.
  - `new_themes` ignores a phrase mentioned only twice.
- [ ] **Step 2:** Run → FAIL. Implement → PASS. Commit `feat(pipeline): aspect phrases and a stable aspect catalogue`.

### Task 10: Aspect sentiment, causes and validation (notebook 04) **(STOP after)**

**Files:**
- Create: `aspects/absa.py`, `notebooks/04_aspects.ipynb`, `reports/validation/absa_pairs.csv`
- Modify: `gpu.py` (add `embed`, `score_absa`)
- Test: `tests/test_absa.py`

**Interfaces — produces:**
- **In `gpu.py`:**
  - `embed(texts: list[str]) -> list[list[float]]` uses bge-small.
  - `score_absa(pairs: list[tuple[str, str]]) -> list[dict]` takes (sentence, aspect name) pairs and returns `{label, confidence}`.
  - Both cache their results on the Volume, keyed by the SHA-256 of their input. A rerun with the same input returns the cache with no GPU spend.
- `cause_span(review_text, phrase: Phrase) -> tuple[int, int]` returns the clause around the phrase: it expands to the nearest `, ; . ! ? but although however` boundary inside the sentence. The result is always a span of the original text.
- `aspect_mentions(reviews, matched, scores) -> list[dict]` gives `{review_id, aspectId, start, end, sentiment, confidence}`, where `start` and `end` are the cause span.

- [ ] **Step 1: Failing tests** (the scorer is a stub):
  - In "The biryani was great but we waited 50 minutes", the cause for "waited" (wait time) is "we waited 50 minutes", and the cause for "biryani" is "The biryani was great".
  - `text[start:end]` always equals the customer's words.
  - The cache key is stable for the same input.
- [ ] **Step 2:** Run → FAIL. Implement → PASS. Commit.
- [ ] **Step 3: Validation set.** Draw 200 (sentence, aspect) pairs, stratified by domain and by predicted label, into `absa_pairs.csv` with an empty `gold` column. Claude drafts the gold labels by reading each sentence, marked `labelled_by=claude`. The user may spot-check any rows.
- [ ] **Step 4:** Write `04_aspects.ipynb`:
  1. What aspects are and why they're discovered, not listed.
  2. Phrase extraction examples with highlights.
  3. Catalogues per domain plus the general one (table and cluster sizes).
  4. Scoring the aspects with the cost estimate.
  5. Causes with examples.
  6. Validation: accuracy and macro F1 against the 200 gold pairs, the confusion matrix, and notes on the mistakes.
  7. Key findings.

  Save `metrics/absa_validation.json`.
- [ ] **Step 5:** Commit and mirror. **STOP**: send the notebook and summarise.

### Task 11: `analyze_reviews` and the shop report (notebook 05) **(STOP after; then final review)**

**Files:**
- Create: `report.py`, `notebooks/05_shop_report.ipynb`
- Test: `tests/test_report.py`

**Interfaces — produces** (dataclasses with `to_dict()` in the frontend contract's camelCase):
- `ReviewIn = {text: str, stars: int | None, date: str | None}`
- `ShopReport`:
  - `kpis {reviews, positivePct, negativePct, avgStars|None}`
  - `monthly [MonthPoint]` (empty when there are no dates)
  - `aspects [{id, name, mentions, posPct, negPct, neuPct, isNew?}]`
  - `bests [aspect id]` (top 3 by net score with ≥ 3 mentions)
  - `worsts [aspect id]` (top 3 by negative share with ≥ 3 mentions)
  - `reasons {aspectId: [{text, tone, count, quoteReviewIds}]}`
  - `reviews [{id, sentiment, score, confidence, aspectMentions}]`
  - `skipped {nonEnglish, empty}`
- `analyze_reviews(reviews: list[ReviewIn], shop_type: str, *, sentiment, absa, embed, nlp) -> ShopReport`. The models are injected so tests pass stubs and the notebook passes the Modal-backed ones.
- **Reasons:** for each aspect, its cause texts by tone are grouped with c-TF-IDF-style distinctive word pairs. Up to 3 reasons per tone, each with a count and up to 3 quote ids.

- [ ] **Step 1: Failing tests** (all models stubbed):
  - The KPIs match a hand calculation.
  - `avgStars` is None when no review has stars.
  - `monthly` is empty without dates.
  - Non-English and empty reviews are skipped and counted.
  - `test_small_shop_report` with 6 reviews builds without error, themes need ≥ 3 mentions, and bests and worsts ignore aspects under 3 mentions.
  - Every `aspectMentions` span lies inside its review text.
  - `to_dict()` keys are camelCase.
- [ ] **Step 2:** Run → FAIL. Implement → PASS. Commit.
- [ ] **Step 3:** Write `05_shop_report.ipynb`, the demo:
  1. Pick a real Yelp restaurant from the **test** split with at least 80 reviews.
  2. Run `analyze_reviews`.
  3. Show the KPIs, the monthly trend chart, the bests and worsts, the reasons with quotes, the themes, and 10 reviews with their causes highlighted (HTML in the output cell, escaped).
  4. Run the same steps on an Amazon appliance product and on a 5-review CSV, to show it works at small sizes.
  5. Key findings.
- [ ] **Step 4:** Update the README (results table: baseline vs. DistilBERT, per domain, held-out domain, ABSA validation; how to rerun the notebooks) and ERROR_LOG. Commit and mirror.
- [ ] **Step 5: STOP.** Run the final review of the whole branch, then send the notebooks to the user with a summary.
