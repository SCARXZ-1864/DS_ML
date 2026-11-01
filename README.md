# Customer Review Intelligence Tool

A web app that analyzes a shop's customer reviews and shows its owner:

1. **Overall sentiment** and how it changes over time
2. **Main topics** customers talk about, discovered automatically (plus a "top complaints" view)
3. **Aspect-based sentiment**, e.g. *battery: negative, screen: positive*
4. **A chat box** that answers plain-English questions with **citations to real reviews** (RAG)

The models were trained on 150k public reviews: Yelp restaurants, and Amazon grocery and appliance products.

> **Status:** 🚧 **Part 2 (ML core) done**: a fine-tuned DistilBERT sentiment model (test macro F1 0.761 vs 0.732 for the baseline), aspect catalogues with cause clauses, and `analyze_reviews`, which builds a shop's full report. See [the design](docs/superpowers/specs/2026-10-31-part2-ml-core-design.md), [the plan](docs/superpowers/plans/2026-11-01-part2-ml-core.md) and the results below. Part 1 (frontend with mock data) reached **checkpoint 3**: mock login and signup, My shops, Add shop, Settings, a CSV upload wizard, Sources with a simulated Google Business Profile connection, Alerts, shareable read-only reports and Compare. Log in as `owner@demo.test` to see the sample owner shops. See [the spec](docs/superpowers/specs/2026-10-30-frontend-mock-design.md).

| Doc | What's in it |
|-----|--------------|
| [PLAN.md](PLAN.md) | Architecture, stack, milestones, data flow, free-tier budget |
| [RISKS.md](RISKS.md) | 31 risks with detection and mitigation |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | Logging, error, retry, health and testing contracts |
| [ERROR_LOG.md](ERROR_LOG.md) | Every dev incident: root cause and fix |

## Architecture (short version)

```
Offline (laptop + Colab) ──► Supabase Postgres + pgvector ◄── Next.js API routes (Vercel) ◄── Browser
        │                                                        │
        └── fine-tuned models ──► HF Hub ──► FastAPI on Modal ◄┘ (embeddings + live predictions)
```

The dashboard reads only precomputed data, so it never waits on a model. Full diagram and reasoning: [PLAN.md §1](PLAN.md#1-architecture).

## Repository layout

| Path | What | Tooling |
|------|------|---------|
| `pipeline/` | Data cleaning, EDA, training, topic modeling, ABSA, DB loading | Python 3.12, uv |
| `inference/` | FastAPI inference service, deployed to Modal (serverless, scales to zero) | Python 3.12, uv |
| `web/` | Next.js dashboard + API routes (BFF), deployed on Vercel | Node 22+, pnpm |
| `db/` | SQL migrations (M7) | Postgres + pgvector |
| `data/` | Local datasets (**gitignored**) | — |

## Setup (Windows, macOS, Linux)

**Prerequisites:** [uv](https://docs.astral.sh/uv/), Node.js 22+, pnpm 10 (`npm i -g pnpm`), git, and optionally [gitleaks](https://github.com/gitleaks/gitleaks) for the pre-commit hook.

```bash
git clone <repo-url> review-intel && cd review-intel
uvx pre-commit install            # secret scan + large-file guard on every commit
cp .env.example .env              # fill in values (never commit .env)

# Python pipeline
cd pipeline && uv sync && uv run pytest && cd ..

# Inference service
cd inference && uv sync && uv run pytest
INFERENCE_API_KEY=local-dev-key-123 uv run uvicorn app.main:get_app --factory --port 7860
# → http://localhost:7860/health

# Web app (new terminal)
cd web && pnpm install && pnpm test
INFERENCE_URL=http://127.0.0.1:7860 pnpm dev
# → http://localhost:3000 and http://localhost:3000/api/health
```

> **Windows note:** keep the repo **outside OneDrive** (e.g. `C:\dev\`). Syncing `node_modules`/`.venv` causes file-lock errors.

## Run all checks (same as CI)

```bash
(cd pipeline  && uv run ruff check . && uv run pytest)
(cd inference && uv run ruff check . && uv run pytest)
(cd web       && pnpm lint && pnpm typecheck && pnpm test && pnpm build)
```

## Frontend preview (mock data)

`cd web && pnpm dev`, then open http://localhost:3000. Every screen currently runs on seeded mock data from
`web/src/lib/data/mock/`. Pages only use the `DataSource` interface in `web/src/lib/data/index.ts`, so later
parts swap in the real backend by changing one line.

## Re-running the ML notebooks

From `pipeline/`, with the data downloaded (notebook 01 does that; it needs your own Kaggle token in `~/.kaggle`):

| Notebook | Runs on | Notes |
|----------|---------|-------|
| `01_data` | laptop | downloads Yelp and Amazon, builds `data/interim/reviews.parquet` (150k reviews) |
| `02_baseline` | laptop, ~5 min | TF-IDF + logistic regression |
| `03_distilbert` | laptop, seconds | **first** run `uv run python scripts/kaggle_train.py full` (~50 min on a free Kaggle T4; needs a phone-verified Kaggle account). The notebook evaluates the downloaded results. The script refuses to retrain if results exist; add `--force` to retrain. |
| `04_aspects` | laptop, ~5 min | builds the aspect catalogues in `pipeline/catalogues/` and checks aspect sentiment |
| `05_shop_report` | laptop, ~10 min | the full report for three example shops |

Run one with `uv run jupyter nbconvert --to notebook --execute --inplace notebooks/<name>.ipynb`.

### Publishing safely

This repo is public, and the Yelp and Amazon licences don't allow republishing review text. A re-run notebook shows example reviews in its outputs, so before committing run `uv run python scripts/strip_review_text.py` (from `pipeline/`). It replaces those outputs with a short note. `tests/test_no_review_text.py` fails if any are left. The aspect-sentiment check labels are committed without the clauses they judge; the full file stays local in `data/processed/absa_pairs_with_text.csv`.

## Results

Sentiment on 14,996 held-out test reviews from shops never seen in training (restaurants, grocery, appliances).
Details: `pipeline/notebooks/02_baseline.ipynb` and `03_distilbert.ipynb`.

| Model | Macro F1 (test) | Neg F1 | Neu F1 | Pos F1 | Notes |
|-------|-----------------|--------|--------|--------|-------|
| TF-IDF + LogReg (baseline) | 0.732 | 0.812 | 0.445 | 0.941 | accuracy 87.2%; laptop CPU |
| DistilBERT (fine-tuned) | **0.761** | **0.837** | **0.492** | **0.954** | accuracy 88.7%; 47 free GPU-minutes on Kaggle (T4) |
| DistilBERT, never saw appliances | 0.699 (appliances only) | — | — | — | baseline trained *with* appliances: 0.688 |

| Component | Metric | Value |
|-----------|--------|-------|
| ABSA (200 hand-labeled pairs, labelled by Claude) | Accuracy / Macro F1 | 72.5% / 0.724 (neutral F1 0.60) |
| RAG (20-question eval) | Citation validity / faithfulness / refusals | — (M10) |

## Screenshots

_Placeholders, added in M9–M11._

- `docs/screenshots/overview.png`
- `docs/screenshots/topics.png`
- `docs/screenshots/aspects.png`
- `docs/screenshots/chat.png`

## Limitations

_Expanded as the project progresses._

- Sentiment labels are derived from star ratings (1–2 neg, 3 neu, 4–5 pos), which are noisy labels: a 5-star review can describe a broken item.
- Chat and drill-down search a ~50k-review sample (free database tier). Dashboard aggregates cover all ~150k.
- The free inference host sleeps when idle, so the first chat or "Try it" request may take ~30–90 s while it wakes up.
- Non-commercial academic demo. Data: [Amazon Reviews 2023](https://amazon-reviews-2023.github.io/) (McAuley Lab).
