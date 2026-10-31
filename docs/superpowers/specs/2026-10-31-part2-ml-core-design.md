# Part 2 design: ML core (sentiment, aspects and the shop report)

**Date:** 2026-10-31 · **Status:** awaiting user approval · **Owner:** project author (reviewer), Claude (implementer)

## 1. Intent

Every number in the app is mock data today. Part 2 builds the real models and shows them working.

**The moment that matters:** you hand the system a list of reviews for one shop, and it returns:
- **Per review:** overall sentiment with a confidence; the aspects mentioned, each with its own sentiment; and the exact words that caused each feeling (the *cause*).
- **For the whole list:** positive, negative and neutral shares, the average stars, the **best** and **worst** aspects, the most common **reasons** behind praise and complaints with real quotes as proof, and the themes found automatically, including ones nobody listed in advance.

**Why:** this is the core of a data science portfolio project. A model that explains customer feeling, not just scores it, is the point. Every step must be **shown**, not just done: the work lives in notebooks whose saved outputs (tables, charts, training progress, scores) can be opened and shown to anyone.

## 2. Goals, non-goals, anti-goals

**Goals**
1. A clean, labelled, multi-domain review dataset: restaurants, groceries and appliances.
2. A simple baseline sentiment model, then a fine-tuned transformer that beats it on the same test set, with honest metrics.
3. Aspects discovered automatically from review text, so it works for any shop type.
4. Sentiment per aspect, with the cause phrase that carries it.
5. A report for a list of reviews: averages, bests, worsts, reasons and themes, with quotes.
6. A reusable Python function, `analyze_reviews(reviews) -> ShopReport`, that later parts plug into the app.

**Non-goals (later parts)**
- Wiring results into the web app, the database or the upload jobs (Parts 3–4).
- The RAG chat (Part 6).
- Deploying the new model to the live inference service (done when the app needs it).
- BERTopic topic maps for the Topics page. The aspect themes here cover "what customers talk about"; BERTopic can follow.

**Anti-goals (failure even if it "works")**
- Metrics that flatter: a test set that leaks training data, or reporting accuracy instead of macro F1 on imbalanced classes.
- Notebooks that only run on a machine that no longer exists, or whose outputs weren't saved.
- Aspects that are a hand-written list for one shop type in disguise.
- "Causes" that aren't words the customer actually wrote.

## 3. Constraints

- **Laptop:** Windows 11, ~15.5 GB RAM, often only 1–2 GB free. No GPU. Data is streamed and sampled, never loaded whole. One heavy process at a time.
- **GPU work runs on Modal** (already set up for the inference service; $30/month free credits). A training run should cost well under $1 of the credits.
- **Notebooks run from the terminal.** They are executed top to bottom (`jupyter nbconvert --execute`), and the outputs are saved into the `.ipynb` file. Each notebook explains itself in plain words between the code cells.
- **Installs are approved** (the user said so on 2026-10-31): Jupyter, pandas, pyarrow, scikit-learn, matplotlib, datasets, transformers, torch (CPU build locally), spaCy with a small English model, sentence-transformers, and Modal's client.
- **Licences:**
  - Amazon Reviews 2023 is for research use; we don't re-upload the data.
  - Yelp review data is for academic/non-commercial use. The data card states both.
  - Only models and metrics are published.
- The existing project rules apply: milestone stops, ERROR_LOG, small commits, tests for the pipeline code, and the OneDrive mirror.

## 4. Decisions

| Decision | Choice | Why |
|---|---|---|
| Data sources | **Amazon Reviews 2023**: `Grocery_and_Gourmet_Food` and `Appliances` (Hugging Face `McAuley-Lab/Amazon-Reviews-2023`, streamed). **Yelp** *(user's choice, 2026-11-01)*: the **Yelp Open Dataset from Kaggle** (`yelp-dataset/yelp-dataset`), downloaded with the Kaggle API. It is filtered to businesses in the `Restaurants` category, read line by line, never loaded whole | Matches the three demo shop types agreed on 2026-10-30. The Kaggle copy has business ids, categories and dates, so restaurants can be split by business and the demo can be a real restaurant over time |
| Size | ~**50k reviews per domain, 150k in total** (configurable). Development uses a 20k subset first | Keeps the laptop within memory and training under an hour |
| Labels | From stars: 1–2 negative, 3 neutral, 4–5 positive | Standard; the README states the honesty caveat that labels come from stars |
| Splits | Fixed 80/10/10 with a saved seed, **grouped by product (Amazon) or business (Yelp)**, so one shop's reviews never sit in both train and test | Stops leaks inflating the scores |
| Baseline | TF-IDF (word and character n-grams) + logistic regression with balanced class weights, tuned on validation macro F1. Runs on the laptop | Fast, explainable yardstick |
| Main sentiment model | **DistilBERT** fine-tuned on all three domains, class-weighted loss, early stopping on validation macro F1. Trained on a **Modal GPU** called from the notebook, which streams training progress back into the notebook | Strong and small enough to serve cheaply later |
| Aspect discovery (automatic) | Pull candidate aspect phrases (noun phrases) from review sentences with spaCy, embed them with a small sentence-embedding model, **cluster** similar phrases, and name each cluster by its most frequent phrase. Done per domain, and per shop in the report | Works for any shop type with no hand-written list |
| Aspect sentiment | The pretrained aspect-sentiment model `yangheng/deberta-v3-base-absa-v1.1` scores each (sentence, aspect) pair. It is **not retrained**. It is checked against ~200 hand-labelled pairs and reported honestly | Proven model; validation keeps it honest |
| Cause | The sentence, trimmed to the clause containing the aspect phrase, is the cause shown for that aspect's sentiment. Always the customer's own words | Meets the "cause must be real words" anti-goal |
| Reasons | For each aspect, the negative (and positive) cause phrases are grouped by their most distinctive words, giving "slow service on weekends"-style reasons, each with 1–3 quotes | Turns hundreds of mentions into a few readable reasons |
| Where results live | `pipeline/` (Python package, tests, notebooks); metrics in `reports/metrics/*.json`; figures in `reports/figures/`; the trained model on the Hugging Face Hub (public model card) | Fits the existing repo layout and PLAN.md |

### 4.1 Answers settled after the builder check (Claude's calls unless marked)

- **Stable aspects, matched per shop** *(Claude's call)*.
  - Discovery runs once per domain on the training data and saves an **aspect catalogue**: an id, a name, the cluster centre and example phrases for each aspect.
  - A shop's phrases are matched to the nearest catalogue aspect.
  - Phrases that match nothing, if they reach a minimum number of mentions, become **new themes** for that shop. This is what feeds `isNew` and the `new_aspect` alerts.
  - Ids therefore stay the same across shops and runs, which `/app/compare`, the monthly trends and the alerts need. Small shops (20–50 reviews) also work, because they're matched rather than clustered.
  - Shop types with no catalogue of their own (clothing, salons, other) use a **general catalogue** built from all three domains.
- **`ShopReport` follows the frontend data contract** *(Claude's call)*, so Parts 3–4 don't redesign it:
  - Overview-style KPIs, with average stars set to `null` when no review has stars.
  - Monthly points when reviews have dates.
  - Aspects with positive, negative and neutral shares.
  - Per-review sentiment with a −1..1 score and a confidence.
  - Aspect mentions as `{aspectId, start, end, sentiment}` **character offsets** into the review text. The cause is that offset span, so it is always the customer's own words.
  - Plus the Part 2 extras: bests, worsts, and reasons with quote review ids.
  - The input is a list of `{text, stars?, date?}` and a shop type.
- **GPU use** *(Claude's call)*. Notebooks 03–05 may call Modal GPUs for training **and** for batch scoring (DistilBERT, the aspect model, embeddings).
  - Budget: **at most $5 of the $30 monthly free credits for all of Part 2**. Each notebook prints the estimated and actual cost of its GPU runs.
  - The laptop never loads more than one model at a time.
- **How "DistilBERT wins" is judged** *(Claude's call)*:
  - Macro F1 on the combined test set **and** a per-domain table, both compared with the baseline.
  - Plus one extra experiment: train on two domains and test on the third, as evidence of how it copes with an unseen shop type. It is reported, not required to win.
- **Language** *(Claude's call)*.
  - Training data keeps English only (a language-detection step, with counts in the data card).
  - `analyze_reviews` flags non-English reviews, leaves them out of the scores, and reports how many it skipped.
- **Stops** *(from the project's workflow rules)*:
  1. The PLAN.md / RISKS.md / README update goes first, as its own change.
  2. Then a stop after each notebook milestone.
  3. The data notebook runs on the 20k development subset first, and stops for review before the full 150k run and the first paid GPU training.

## 5. The notebooks (what the user will open and show)

Each notebook starts with "what this does and why", explains each step in plain words, and ends with "key findings".

1. **`01_data.ipynb`:** download and sample, clean, label, split, then look at the data: label balance, review lengths, examples. Saves `data/interim/reviews.parquet` and `reports/data_card.md`.
2. **`02_baseline.ipynb`:** train the TF-IDF model; show macro F1, per-class scores, a confusion matrix and the words that push most towards positive or negative.
3. **`03_distilbert.ipynb`:** fine-tune on a Modal GPU with progress shown epoch by epoch, then a side-by-side comparison with the baseline on the same test set, and an error analysis of ~30 misclassified reviews (sarcasm, mixed feelings, stars that disagree with the text).
4. **`04_aspects.ipynb`:** discover aspects per domain, score aspect sentiment, extract causes, and validate against the hand-labelled pairs.
5. **`05_shop_report.ipynb`, the demo:** pick one shop's reviews (a real Yelp restaurant from the test split, an Amazon product, or any CSV) and run `analyze_reviews`. It prints the report: averages, bests, worsts, reasons with quotes, themes, and per-review sentiment with causes highlighted.

## 6. Definition of done (Part 2)

- All five notebooks run top to bottom from the terminal, with outputs saved in them.
- Metrics JSON files for the baseline and DistilBERT on the **same** test set. DistilBERT beats the baseline on macro F1, or the notebook explains why not.
- The aspect-sentiment validation score is reported, whatever it is.
- `analyze_reviews` has unit tests on small hand-made inputs, which use a stub model so they run in seconds.
- The model is on the Hugging Face Hub with a model card. The README gets a results table. ERROR_LOG records any incidents.
- **PLAN.md, RISKS.md and the README are updated for the new scope** (multi-domain data, automatic aspects, Modal for training), as the frontend spec asked for before Part 2.

## 6.1 One step for the user

The Kaggle download needs a free Kaggle account and an API token:
1. On kaggle.com, go to **Settings → API → Create New Token**.
2. Save the downloaded `kaggle.json` to `C:\Users\HP\.kaggle\kaggle.json`.
3. Accept the dataset's rules on its Kaggle page if asked.

The token is a secret: it stays out of the repo and the OneDrive mirror. Only the review file (~5 GB) and the business file are downloaded, into `C:\dev\review-intel\data\raw\` (gitignored), and the notebook streams them.

## 7. Left to the builder

- Exact cleaning thresholds, clustering settings and the number of aspects per domain (tuned on the data, with the choice explained in the notebook).
- Modal GPU type (the cheapest that fits DistilBERT training in under an hour).
- How the 200 validation pairs are labelled. The builder drafts the labels; the user can spot-check.
