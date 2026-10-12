# RISKS.md — Customer Review Intelligence Tool

> Status: **DRAFT, awaiting review** (Phase 2). Written 2026-10-11 against the approved PLAN.md.
> This is a living document. When a risk materializes, its incident goes in ERROR_LOG.md and the entry here gets updated.

## How to read this

- **Likelihood** is how probable it is that we hit the problem during this project: **L**ow / **M**edium / **H**igh.
- **Impact** is how bad it is if we do. **L**ow means an annoyance or a small rework. **M**edium means a milestone slips or a feature degrades. **H**igh means a broken deploy, a wrong result shown to users, a cost incurred or a security breach.
- **Detect** answers "how will we *know*?" That matters as much as the fix: an undetected risk is the dangerous kind.
- **Mitigate** is what we build or do in advance. **Fallback** is what we do if it happens anyway.
- **When** is the milestone where the mitigation gets built.

The teaching idea is that every mitigation below is either **a check that fails loudly** (tests, size guards, schema validation) or **a design choice that limits blast radius** (precompute, BFF, fallbacks). We prefer those over "be careful".

---

## Priority summary

Sorted by likelihood × impact. These are the ones to watch most.

| ID | Risk | L | I | When |
|----|------|---|---|------|
| R01 | Dataset too large for laptop RAM | H | M | M1 |
| R02 | Class imbalance hides poor minority-class performance | H | H | M2–M4 |
| R14 | Inference cold starts (Modal scale-to-zero) break live features | H | M | M8–M10 |
| R17 | RAG hallucination / fabricated citations | H | H | M10 |
| R18 | Prompt injection via review text | M | H | M10 |
| R22 | Secrets committed to git or exposed to the browser | M | H | M0 |
| R12 | Supabase DB exceeds the 500 MB free limit | M | H | M7 |
| R06 | Colab GPU unavailable or session dies mid-training | H | M | M4–M6 |
| R16 | LLM rate limits / cost / abuse of the public chat | M | H | M10 |
| R25 | Dependency conflicts (torch/transformers/numpy, Colab vs local) | H | M | M0–M8 |
| R03 | Data leakage across train/val/test | M | H | M1 |
| R04 | Label noise: stars ≠ text sentiment | H | M | M2–M4 |
| R10 | ABSA misses aspects or misclassifies on our domain | M | M | M6 |
| R15 | Vercel function timeouts | M | M | M9–M10 |
| R27 | OneDrive / Windows path and lock issues | H | L | M0 |
| R11 | Model and image too large for the inference container | M | M | M8 |
| R31 | Free hosting tier withdrawn (already happened with HF Spaces) | M | H | M0 |

All risks are detailed below, grouped by area.

---

## A. Data

### R01 — Dataset size vs. laptop memory
- **L/I:** H / M
- **What:** the `Cell_Phones_and_Accessories` category is millions of reviews and several GB of compressed JSONL. `pd.read_json(...)` on the whole file can exhaust RAM, and Windows will page or crash.
- **Detect:** the loader logs row count and process RSS every N rows. A run that exceeds a configured RSS budget (e.g. 4 GB) aborts with a clear message instead of thrashing.
- **Mitigate:** stream-parse line by line (gzip + `orjson`) and **reservoir/stratified sample during the stream**, so we never hold more than the sample. Store Parquet with explicit dtypes (category for ids, int8 for rating). Iterate on a 20k dev subset first (PLAN §7).
- **Fallback:** switch the sampling step to Polars lazy scanning or DuckDB over the JSONL, both of which spill to disk.

### R02 — Class imbalance
- **L/I:** H / H
- **What:** Amazon ratings are heavily skewed to 5 stars, typically around 70–80% positive, ~10% neutral and ~15% negative. Accuracy looks great while the neutral and negative classes, which are the ones a business cares about, are poor.
- **Detect:** EDA reports the class distribution. The primary metric is **macro F1** (accuracy is never the headline). We always report per-class recall and confusion matrices.
- **Mitigate:**
  - stratified splits;
  - `class_weight="balanced"` for logistic regression;
  - class-weighted cross-entropy for DistilBERT, compared against an unweighted run;
  - optional threshold tuning on validation only.
- **Fallback:** downsample the majority class in *train only* (never in test), or collapse to binary sentiment as a secondary reported task if neutral stays below ~0.5 F1. The README will explain why.

### R03 — Data leakage across splits
- **L/I:** M / H
- **What:** duplicate or near-duplicate reviews (copy-paste reviews, the same text across product variants), or many reviews of the same product, end up in both train and test and inflate the scores.
- **Detect:** a pytest asserts there's **zero exact-text overlap** between splits and **zero shared `parent_asin` groups**. A near-duplicate check uses MinHash or normalized-text hashing.
- **Mitigate:** deduplicate before splitting, split by product group (`GroupShuffleSplit`), fix and record the seed, and freeze the test split once (stored ids file).
- **Fallback:** if leakage is found after training, re-split and retrain. Results stay invalid until we do.

### R04 — Label noise: star rating ≠ text sentiment
- **L/I:** H / M
- **What:** "5 stars, item arrived broken" or "3 stars, love it". Stars are weak labels, and the neutral class is especially fuzzy.
- **Detect:** EDA samples disagreements, such as 5-star reviews containing strong negative words. M4 error analysis categorizes 30 misclassified reviews.
- **Mitigate:** state the limitation in the README. Show *both* the star trend and the model trend in the app. Use error analysis to separate model errors from label errors.
- **Fallback:** hand-label a small (~300) "gold" test set to estimate the true error rate.

### R05 — Dataset licence and PII
- **L/I:** M / M
- **What:** Amazon Reviews 2023 is released for research. Publicly displaying review snippets and redistributing the data have different implications, and reviews may contain names, emails or phone numbers.
- **Detect:** a data card records the licence and source. A regex scan for emails and phone numbers runs in the cleaning step, with counts logged.
- **Mitigate:**
  - Never redistribute the dataset: no HF dataset upload, and `data/` is gitignored.
  - Cite the source in the app footer.
  - Mask emails and phone numbers in the serving corpus.
  - Label the app a non-commercial academic demo.
- **Fallback:** shrink displayed snippets to short excerpts with a link to source attribution.

---

## B. Training and models

### R06 — Colab GPU limits
- **L/I:** H / M
- **What:** no T4 is available, the session disconnects at the idle or ~12 h cap, or the quota is exhausted mid-run.
- **Detect:** the notebook's first cell asserts that a GPU is present and prints `nvidia-smi`. The training loop logs to a file on Drive.
- **Mitigate:** checkpoint to Google Drive every epoch and make the scripts resumable (`resume_from_checkpoint`). Use fp16, max_len 256, and dynamic padding sorted by length. Batch inference (embeddings, ABSA) writes output in shards so it can resume.
- **Fallback:** Kaggle notebooks (~30 GPU-h/week). Last resort: a reduced training set (50k) on CPU overnight for DistilBERT.

### R07 — Overfitting and over-optimistic evaluation
- **L/I:** M / H
- **What:** tuning hyperparameters or thresholds on the test set, or reporting the best of many runs.
- **Detect:** code review rule: the test set is loaded in exactly one function (`evaluate_final`), and a test asserts it isn't touched during training.
- **Mitigate:** val for all tuning, test once per final model, and fixed seeds. Report mean ± std over 3 seeds if Colab time allows.

### R08 — Neutral class stays weak
- **L/I:** H / L
- **What:** even with weighting, neutral F1 stays around 0.4–0.55, which drags macro F1 down.
- **Detect:** per-class metrics.
- **Mitigate:** this is expected and worth documenting honestly. Report a binary variant as well. It's a finding, not a failure.

### R09 — BERTopic produces unstable or junk topics
- **L/I:** M / M
- **What:** UMAP/HDBSCAN are stochastic, so topics change between runs. A huge outlier topic (-1) appears, along with topics like "the, it, phone".
- **Detect:** we track the outlier %, review the top-n keywords and representative docs, and run a stability check (rerun with a different seed and compare topic overlap).
- **Mitigate:**
  - Fixed `random_state` in UMAP.
  - A stopword-aware `CountVectorizer`.
  - `min_topic_size` tuning and `reduce_outliers`.
  - Domain stopwords such as "phone" and "case".
  - Save the fitted model and its assignments, so the app shows one frozen run.
- **Fallback:** merge or label topics manually, and drop junk topics from the UI with an "Other" bucket.

### R10 — ABSA domain mismatch and aspect coverage
- **L/I:** M / M
- **What:** the lexicon misses phrasings ("dies by noon" means battery). The DeBERTa model was trained on restaurant/laptop data and may mislabel phone-accessory language. Sentences mentioning two aspects get confused.
- **Detect:** the 200-pair hand-labeled validation set (M6). We also log coverage, meaning the % of reviews with ≥1 aspect detected.
- **Mitigate:** seed the synonyms from BERTopic keywords and n-grams, classify at sentence level (not whole review), keep a confidence threshold, and send low-confidence predictions to "neutral/uncertain".
- **Fallback:** the LLM-JSON extractor on the validation set for comparison. If it's much better, use it for a capped subset (e.g. the serving corpus only), but only with your OK given the rate limits.

### R11 — Model and image size vs. inference hosting
- **L/I:** M / M
- **What:** a CUDA torch wheel (~2+ GB) gets pulled in by accident and Docker builds time out or bloat. Loading three models raises RAM and cold-start time.
- **Detect:** M8 records image size and model load time. CI fails if `torch` resolves to a CUDA build in `inference/`.
- **Mitigate:**
  - CPU-only torch index URL.
  - `python:3.12-slim` base image.
  - Models downloaded at build time into the image.
  - ABSA loaded lazily.
  - `torch.set_num_threads(2)` to match the 2 vCPUs.
- **Fallback:** ONNX export plus dynamic int8 quantization for DistilBERT/DeBERTa, which cuts size about 2–4× and speeds up CPU inference.

---

## C. Data store

### R12 — Supabase exceeds the 500 MB free limit
- **L/I:** M / H
- **What:** vectors, HNSW and GIN indexes, plus long texts, blow past the budget. The project goes read-only or gets restricted.
- **Detect:** the loader queries `pg_database_size()` after every load and **fails if it's above 400 MB**. The M7 DoD requires ≤ 350 MB.
- **Mitigate:** a ~50k serving corpus, `halfvec(384)`, text truncated to 2,000 chars, aggregates instead of raw rows for analytics, and no duplicate copies of the data (no staging tables left behind).
- **Fallback:** cut the serving corpus to 30k, drop the tsvector column in favour of an expression index, or use IVFFlat instead of HNSW (smaller index).

### R13 — Supabase pauses after inactivity
- **L/I:** M / M
- **What:** the free project pauses after about 7 days without activity, and the app then shows errors to a recruiter who clicks the link weeks later.
- **Detect:** `/api/health` reports DB status. The daily cron logs keep-alive results.
- **Mitigate:** a daily Vercel Cron does a real query. The UI shows "Database unavailable" instead of a crash.
- **Fallback:** a manual restore from the Supabase dashboard (documented in the README).

---

## D. Serving and runtime

### R14 — Inference cold starts
- **L/I:** H / M
- **What:** Modal scales to zero after `scaledown_window` (5 min) idle. The next request waits for a container boot plus model load (~10–30 s, more once models are large). Requests queue during the boot, so the symptom is a timeout rather than a 503.
- **Detect:** the inference client classifies failures (timeout, 502/503, non-JSON body) as `COLD_START`, as distinct from `BAD_REQUEST` and `SERVER_ERROR`. `/api/health` surfaces the "waking" state.
- **Mitigate:**
  - The dashboard is independent of the inference service (design).
  - Exponential backoff with jitter: about 4 attempts over roughly 45 s.
  - The UI says "Model is waking up, retrying…".
  - Chat falls back to keyword search.
  - A daily keep-alive ping, plus a page-load warm-up ping fired when the chat or Try-it page opens.
- **Fallback:** if cold starts are still painful, document it, or consider a paid always-on tier (only with your approval).

### R15 — Vercel function timeouts
- **L/I:** M / M
- **What:** chat = embed (possible cold start) + DB + LLM generation, which can exceed the function's max duration. The user sees a generic 504.
- **Detect:** route logs record per-stage timing (embed_ms, db_ms, llm_ms). Vitest covers the timeout paths with fake timers.
- **Mitigate:**
  - **Stream** the response, which sends bytes early.
  - Explicit per-call timeouts that are lower than the function limit.
  - An overall request deadline budget.
  - `maxDuration` set in route config to the plan's allowed max.
  - The cold-start retry budget is capped so it fits inside the deadline.
- **Fallback:** return a partial answer with keyword retrieval, or a clean "please retry" error with the request_id.

### R16 — LLM rate limits, cost and abuse
- **L/I:** M / H
- **What:** the free-tier per-minute or per-day caps produce 429s. A bot hammers the public chat. If we ever switch to a paid provider, an abusive loop costs real money.
- **Detect:** we log token usage per request and count 429s. The global daily counter is visible in `/api/health` (e.g. `chat_quota_remaining`).
- **Mitigate:**
  - A Postgres-backed per-IP limit (hashed IP, e.g. 10 per hour).
  - A **global daily cap** below the provider limit.
  - Max question length of 500 chars.
  - max_tokens on output.
  - Retry with backoff only on 429/5xx, honouring `Retry-After`.
  - No retries on 4xx.
  - Any paid key gets a hard spend limit set in the provider console.
- **Fallback:** a friendly "daily demo limit reached" message, and the retrieved reviews are shown without an LLM summary, so the feature still delivers value.

### R17 — RAG hallucination and fabricated citations
- **L/I:** H / H
- **What:** the LLM states things no review says, cites review ids that weren't retrieved, invents statistics, or answers confidently when retrieval found nothing relevant.
- **Detect:**
  - Server-side check that cited ids ⊆ retrieved ids, with violations logged and counted.
  - The M10 eval set includes 5 unanswerable questions, and we require refusal.
  - Manual faithfulness scoring.
- **Mitigate:**
  - A strict system prompt: answer only from the provided reviews and stats, cite `[R<id>]` for every claim, and say "the reviews don't cover this" otherwise.
  - Numbers come only from the stats block.
  - A minimum retrieval-similarity threshold; below it we skip the LLM and say nothing relevant was found.
  - Low temperature.
  - The UI shows the cited reviews next to the answer so users can verify.
- **Fallback:** if faithfulness is poor, switch to a more instruction-following model in the eval A/B (with your approval if it's paid), or reduce chat to a "summarize these retrieved reviews" mode.

### R18 — Prompt injection via review text
- **L/I:** M / H
- **What:** reviews are user-generated text that we paste into the LLM prompt. A review saying "Ignore previous instructions and…" can steer the answer. The user's question can also attempt injection.
- **Detect:** the eval set includes injected reviews and injection questions. We log answers that contain no citations.
- **Mitigate:**
  - Reviews wrapped in clearly delimited data blocks.
  - A system prompt that says review content is data, never instructions.
  - The LLM has **no tools and no secrets in context**, so the worst case is a bad answer, not an action.
  - Output is rendered as plain text or sanitized markdown (no raw HTML).
- **Fallback:** filter reviews with instruction-like patterns out of the serving corpus.

### R19 — CORS errors
- **L/I:** L / M (low because of the BFF design)
- **What:** the browser blocks cross-origin calls.
- **Detect:** browser console errors, and the smoke test runs from a real origin.
- **Mitigate:** the browser only calls same-origin `/api/*`. Server-to-server calls (Vercel→Modal, Vercel→Supabase) aren't subject to CORS. The inference service sets CORS to deny browser origins entirely, since browsers should never call it.
- **Fallback:** an explicit allowlist of the Vercel domain on the inference service, never `*`.

### R20 — Public inference endpoint abuse
- **L/I:** M / M
- **What:** the Modal endpoint URL is public. Anyone can hit `/predict` and tie up its 2 vCPUs.
- **Detect:** Modal logs show requests without a valid key.
- **Mitigate:** an `x-api-key` header is required on everything except `/health` (the key lives only in the Vercel and Modal secret stores). Max input length and max batch size are enforced by Pydantic.

### R21 — Embedding mismatch between batch and query time
- **L/I:** M / H (a silent failure: search "works" but returns poor results)
- **What:** reviews are embedded offline with one model version or normalization setting, and queries are embedded in the inference service with a different one. bge models also expect a query instruction prefix.
- **Detect:** a pytest in `inference/` embeds a fixed sentence and compares it to a stored reference vector from the pipeline (cosine > 0.999). The model id and revision are stored in a DB metadata table and checked by `/api/health`.
- **Mitigate:** pin the **same model revision (commit hash)** in both places, use one shared `normalize_embeddings=True` setting, and document the query prefix in one place.

---

## E. Security and operations

### R22 — Secrets leakage
- **L/I:** M / H
- **What:**
  - A `.env` gets committed.
  - The Supabase service-role key reaches the browser through a `NEXT_PUBLIC_` prefix or a client component import.
  - Keys get printed in logs or notebook outputs.
  - HF or Colab notebooks get pushed with tokens inside.
- **Detect:**
  - **gitleaks** in a pre-commit hook and in CI.
  - `server-only` imports in `db.ts` and `llm.ts`, so a client import fails the build.
  - A CI grep that fails if any `NEXT_PUBLIC_` var name contains KEY, SECRET or TOKEN.
  - A logger redaction test.
- **Mitigate:**
  - `.env*` gitignored except `.env.example`.
  - Secrets live only in the Vercel, HF and GitHub secret stores.
  - Notebooks read tokens via `google.colab.userdata` or `getpass` and are committed with outputs cleared (`nbstripout`).
  - Supabase RLS on with no public policies, so even a leaked anon key reads nothing.
- **Fallback (if a leak happens):** **rotate the key immediately** (deleting the commit is not enough, because git history and forks keep it) and log an incident in ERROR_LOG.md.

### R23 — Large files committed to git
- **L/I:** M / M
- **What:** parquet, `.npy` or model checkpoints get committed, the repo grows to GBs, and GitHub rejects files over 100 MB.
- **Detect:** a pre-commit `check-added-large-files` hook (max 5 MB).
- **Mitigate:** `data/`, `models/` and `*.safetensors` are gitignored. Models live on the HF Hub, and only metrics JSON and figures are committed.

### R24 — Free-tier terms change or limits are smaller than assumed
- **L/I:** M / M
- **What:** PLAN §6 numbers come from memory, and providers change free tiers.
- **Detect:** M0 task: verify each limit against the live pricing pages and record any differences in PLAN §6.
- **Mitigate:** the design keeps ~30%+ headroom on every limit. The LLM is behind a provider abstraction, so switching is a config change.

### R25 — Dependency conflicts
- **L/I:** H / M
- **What:** torch / transformers / numpy (1.x vs 2.x) / bertopic / umap / hdbscan version clashes. Colab's preinstalled versions differ from the local lockfile. `hdbscan` has build issues on Windows.
- **Detect:** CI installs from the lockfile on a clean runner. Each notebook prints its key package versions in its first cell.
- **Mitigate:**
  - Separate lockfiles for `pipeline/` and `inference/`; the inference service doesn't need bertopic, umap or sklearn.
  - On Colab, install pinned versions from the pipeline's exported requirements.
  - Prefer prebuilt wheels: hdbscan wheels exist for 3.12, otherwise use the HDBSCAN built into scikit-learn.
- **Fallback:** run the topic modeling step only on Colab/Linux if Windows wheels fail.

### R26 — Hard-to-diagnose failures across services
- **L/I:** M / M
- **What:** "chat doesn't work" could be Vercel, Modal, Supabase or the LLM.
- **Detect and mitigate:**
  - A request_id is generated in Next.js, sent as `x-request-id` and logged on both sides.
  - Structured JSON logs carry a stage name and duration.
  - `/api/health` aggregates per-dependency status.
  - Error responses include the request_id so users can report it.
  - This is the Phase 3 self-diagnosis design.

### R27 — OneDrive and Windows environment issues
- **L/I:** H / L
- **What:**
  - OneDrive locks or syncs `node_modules`, `.venv`, `.git` and data.
  - Long-path limits on Windows.
  - CRLF line endings break the Dockerfile and shell scripts in the Linux container.
  - The Windows Store `python` alias shadows a real install (already observed).
- **Detect:** install and build errors (EPERM, EBUSY) and `file` checks.
- **Mitigate:**
  - Move the repo to `C:\dev\review-intel` (decision #3).
  - `.gitattributes` with `* text=auto eol=lf` for `*.sh` and `Dockerfile`.
  - Install Python via uv, and disable the Store alias.
  - Enable git `core.longpaths`.

### R28 — Vercel Hobby is non-commercial only
- **L/I:** L / M
- **What:** the Hobby plan forbids commercial use.
- **Mitigate:** this is a portfolio demo with no ads or payments, which the README states. Revisit if the project is ever used for a real business.

---

### R31 — Free hosting tiers get withdrawn mid-project (it already happened)
- **L/I:** M / H
- **What:** a provider changes its free tier. **This already materialized on 2026-10-12:** HF made Docker/Gradio Spaces PRO-only for new free accounts, and we moved inference to Modal. Modal's $30/month credit could change in the same way, or usage could exceed it.
- **Detect:** a spend alert in the Modal dashboard (e.g. at $10). `/api/health` reports the inference service as `down` if the account is suspended. A monthly check of the pricing pages.
- **Mitigate:** the inference service is a plain FastAPI app with a portable **Dockerfile** (still built and smoke-tested in CI), so moving hosts means a new deploy target, not a rewrite. `scaledown_window` and `min_containers=0` keep spend near zero.
- **Fallback:** a Supabase Edge Function's built-in `gte-small` for query embeddings, plus the LLM for "Try it" (the "no inference server" option from the 2026-10-12 decision).

---

## F. Project risk

### R29 — Scope creep and time overrun
- **L/I:** M / M
- **What:** 4 ML components + RAG + 3 services is a lot, and polishing one step (e.g. BERTopic) eats the schedule.
- **Detect:** each milestone has a DoD. If a milestone runs more than about 2× its expected effort, I raise it with you.
- **Mitigate:** reach "good enough to meet the DoD" first and polish in M11. Optional items in PLAN (seed averaging, LLM-ABSA comparison, ONNX) are clearly marked optional.

### R30 — Notebook rot and irreproducibility
- **L/I:** M / M
- **What:** notebooks only run in a particular order, or depend on state that was never saved.
- **Mitigate:** the logic lives in `pipeline/src` (tested), and notebooks call it and visualize. A DoD requires "runs top to bottom in a clean kernel". Seeds and the model revision are recorded in the metrics JSON.

---

## Review checklist for you

- [ ] Any risk you think is mis-rated (likelihood or impact)?
- [ ] Any risk missing for your situation (e.g. deadline, laptop specs, Google account limits)?
- [ ] Are you OK with the default caps: **10 chats/hour per IP, 300/day global, 500-char questions**?
- [ ] Are you OK with hand-labeling help on ~200 ABSA pairs and an optional ~300-review gold set (R04, R10)?

After your review → **Phase 3**: I set up the self-diagnosing workflow (ERROR_LOG.md format, logging/retry/health conventions), then M0.
