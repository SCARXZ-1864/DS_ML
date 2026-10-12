# Customer Review Intelligence Tool

A web app that analyzes ~150k Amazon product reviews and shows a business:

1. **Overall sentiment** and how it changes over time
2. **Main topics** customers talk about, discovered automatically (plus a "top complaints" view)
3. **Aspect-based sentiment**, e.g. *battery: negative, screen: positive*
4. **A chat box** that answers plain-English questions with **citations to real reviews** (RAG)

> **Status:** 🚧 Milestone **M0, Foundations** (see [PLAN.md](PLAN.md) §4)

| Doc | What's in it |
|-----|--------------|
| [PLAN.md](PLAN.md) | Architecture, stack, milestones, data flow, free-tier budget |
| [RISKS.md](RISKS.md) | 30 risks with detection and mitigation |
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

## Results

_Filled in from M3 onwards._

| Model | Macro F1 (test) | Neg F1 | Neu F1 | Pos F1 | Notes |
|-------|-----------------|--------|--------|--------|-------|
| TF-IDF + LogReg (baseline) | — | — | — | — | M3 |
| DistilBERT (fine-tuned) | — | — | — | — | M4 |

| Component | Metric | Value |
|-----------|--------|-------|
| ABSA (200 hand-labeled pairs) | Accuracy / Macro F1 | — (M6) |
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
