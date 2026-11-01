# ERROR_LOG.md

Every error hit during development (code, tests, builds, installs, deploys) is logged here. The process is in [docs/ENGINEERING.md §1](docs/ENGINEERING.md#1-development-error-workflow).

**Format:** newest first, one entry per incident. **Attempts** counts fix attempts; at 3 failed attempts we stop and escalate to the human.

```
### YYYY-MM-DD — <short title>
- **Milestone:** Mx
- **Error:** <exact message / key lines of the traceback>
- **Root cause:** <2–3 sentences: why it happened, not just what>
- **Fix:** <the smallest change that addresses the root cause>
- **Files changed:** <paths>
- **Verified by:** <command re-run and its result>
- **Attempts:** n
```

---

### 2026-10-14 — `LOG_LEVEL` was silently reset to `info` in the inference service
- **Milestone:** M0 (found in a full-project review)
- **Error:** no exception. Starting the app with `log_level="debug"` left the `inference` logger at `INFO` (new test: `assert logging.getLogger("inference").level == logging.DEBUG` failed).
- **Root cause:** `get_logger()` defaulted `level` to `"info"` and called `setLevel` on every call. `create_app()` set the configured level first, then `register_error_handlers()` called `get_logger()` with no argument and overwrote it. No test asserted the level.
- **Fix:** `get_logger(level=None)` sets INFO only when it first creates the handler, and changes the level only when one is passed explicitly. Added a regression test.
- **Files changed:** `inference/app/logging.py`, `inference/tests/test_logging.py`
- **Verified by:** `uv run pytest` → 11 passed (the new test failed before the fix)
- **Attempts:** 1

### 2026-10-12 — `modal setup` exited 1 after a successful login
- **Milestone:** M0
- **Error:** `'charmap' codec can't encode character '\u2192' in position 0: character maps to <undefined>`, printed *after* "Token written to C:\Users\HP/.modal.toml".
- **Root cause:** on Windows, when stdout is redirected (not a console), Python falls back to the ANSI codepage (cp1252), which has no `→`. Modal's closing message contains one, so printing it raised. The login itself had already completed.
- **Fix:** run Modal CLI commands with `PYTHONUTF8=1` (Python UTF-8 mode). No code change.
- **Files changed:** none (documented in this log; will be set in deploy commands/CI)
- **Verified by:** `PYTHONUTF8=1 uv run --group deploy modal secret list` → renders the box-drawing table without error. `~/.modal.toml` exists.
- **Attempts:** 1

### 2026-10-12 — HF Docker Spaces are no longer free (architecture change)
- **Milestone:** M0 (walking-skeleton deploy)
- **Error:** the user reported Docker SDK marked as paid at huggingface.co/new-space. HF's message reads: "Static Spaces are free for everyone, but hosting Gradio and Docker Spaces on free cpu-basic requires a PRO subscription."
- **Root cause:** an external policy change. HF moved Gradio/Docker Spaces on CPU basic behind PRO for free accounts. The plan's free-tier table (§6) predated it. The only free compute left on HF is ZeroGPU Gradio Spaces, for accounts more than 30 days old.
- **Fix:** with the user's decision, the inference host moves to **Modal** (Starter, $30/month free credits). The FastAPI code is unchanged. Added `inference/modal_app.py` (image built via `uv_sync` from `uv.lock`). Updated PLAN (§1, §2, §6, §7 #7), RISKS (R11, R14, new R31), ENGINEERING, READMEs and `.env.example`. Removed the unused `deploy_space.py`.
- **Files changed:** `inference/modal_app.py`, `inference/pyproject.toml`, `inference/uv.lock` (`deploy` group: modal), `inference/README.md`, `PLAN.md`, `RISKS.md`, `docs/ENGINEERING.md`, `README.md`, `.env.example`, `web/src/app/api/health/route.ts` (comments)
- **Verified by:** `uv run ruff check .`, `pytest` → 10 passed; `import modal_app` → App `review-intel-inference`. The live deploy is pending the user's Modal sign-in.
- **Attempts:** 1

### 2026-10-12 — CI secret-scan job failed on the first push
- **Milestone:** M0
- **Error:** `gitleaks/gitleaks-action@v2` → `ERROR: Unexpected exit code [1]` (CI run 38174301119). The other 4 jobs passed.
- **Root cause:** not a real leak: `gitleaks git` over the same 8 commits locally reports "no leaks found". Not the org-licence requirement either, since the repo owner is a User account. The failure is in the action wrapper. Its most likely cause is the documented push-event behaviour of scanning `before..after`, where `before` is `0000000` on a new branch's first push. That can't be confirmed without authenticated log access.
- **Fix:** replaced the wrapper with the pinned gitleaks CLI (v8.30.1, the same as local), running the identical full-history command `gitleaks git --redact --verbose .`.
- **Files changed:** `.github/workflows/ci.yml`
- **Verified by:** the local full-history scan, and every CI run since: the secret-scan job is green on `f4125bc`, `925a3a4` and `dbb0f14` (checked 2026-10-14)
- **Attempts:** 1

### 2026-10-11 — Health check didn't forward the request id to the Space
- **Milestone:** M0
- **Error:** no exception. A local end-to-end run showed web request `e2e-1` logged in the inference service under a different id (`592c…`).
- **Root cause:** `checkInference()` called `fetch` without an `x-request-id` header, so the Space minted its own id. This broke the correlation contract in ENGINEERING §2. The unit tests mocked `fetch` but never asserted on its headers.
- **Fix:** pass `requestId` into `checkInference` and send it as `x-request-id`. Added a regression test asserting the header.
- **Files changed:** `web/src/app/api/health/route.ts`, `web/src/app/api/health/route.test.ts`
- **Verified by:** `pnpm test` → 17 passed (the new test failed before the fix)
- **Attempts:** 1

### 2026-10-11 — `tsc` can't find `LayoutProps`
- **Milestone:** M0
- **Error:** `src/app/layout.tsx(20,50): error TS2304: Cannot find name 'LayoutProps'.`
- **Root cause:** Next.js 16 provides `LayoutProps`, `PageProps` and `RouteContext` as *generated* global types, written to `.next/types` by `next dev`, `next build` or `next typegen`. A bare `tsc` on a fresh checkout (exactly the CI situation) runs before they exist.
- **Fix:** typecheck script changed to `next typegen && tsc --noEmit`.
- **Files changed:** `web/package.json`
- **Verified by:** `pnpm typecheck` → "Types generated successfully", 0 errors
- **Attempts:** 1

### 2026-10-11 — Vite warning: ESM syntax in a file loaded as CommonJS
- **Milestone:** M0
- **Error:** `(!) Your Vite config uses features that are unsupported by configLoader: 'native' ... ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1)`
- **Root cause:** `web/package.json` has no `"type": "module"`, so a `.ts` config is treated as CommonJS while it uses `import`. That works today, but it's flagged to break in a future Vite major.
- **Fix:** renamed it to `vitest.config.mts`, which makes the module type explicit. I didn't set the env var that suppresses the warning.
- **Files changed:** `web/vitest.config.ts` → `web/vitest.config.mts`
- **Verified by:** `pnpm test` → no warning, 16 passed
- **Attempts:** 1

### 2026-10-11 — 404 responses didn't follow the error contract
- **Milestone:** M0
- **Error:** no exception. `POST /embed` on the live local server returned `{"detail":"Not Found"}` instead of `{"error":{"code":…}}`.
- **Root cause:** FastAPI raises Starlette's `HTTPException` for unknown routes and methods, and we had only registered handlers for our own `ApiError`, validation errors and bare `Exception`. The TestClient suite didn't cover unknown routes.
- **Fix:** added a `StarletteHTTPException` handler mapping 404 → `NOT_FOUND` and 405 → `METHOD_NOT_ALLOWED`, plus a regression test.
- **Files changed:** `inference/app/errors.py`, `inference/tests/test_errors.py`
- **Verified by:** `uv run pytest` → 10 passed (the new test failed before the fix)
- **Attempts:** 1

### 2026-10-11 — Bash rejected a multi-file heredoc command
- **Milestone:** M0
- **Error:** `bash: -c: line 167: unexpected EOF while looking for matching '''`
- **Root cause:** one long shell command wrote five Python files through chained heredocs. A quoting interaction inside it made bash fail at *parse* time, so **no** files were written (nothing was half-applied).
- **Fix:** process change: multi-line source files are written with the editor tool, one file per call, instead of shell heredocs.
- **Files changed:** none (re-created `inference/app/*.py` via the editor)
- **Verified by:** `uv run pytest` → 9 passed
- **Attempts:** 1

### 2026-10-11 — ruff I001: import block unsorted
- **Milestone:** M0
- **Error:** `I001 [*] Import block is un-sorted or un-formatted --> tests\test_logging.py:1:1`
- **Root cause:** a `sed` command I used to delete a helper also collapsed double blank lines, leaving one blank line between the imports and the first function, where isort-style rules expect two.
- **Fix:** `ruff check --fix` and `ruff format` (formatting only, no rule disabled).
- **Files changed:** `pipeline/tests/test_logging.py`
- **Verified by:** `uv run ruff check .` → All checks passed. `pytest` → 4 passed
- **Attempts:** 1

### 2026-10-11 — Python not found
- **Milestone:** M0 (environment check)
- **Error:** `Python was not found; run without arguments to install from the Microsoft Store...`
- **Root cause:** Python isn't installed on this machine. `python` resolves to the Windows Store "App execution alias" stub, which only prints this message.
- **Fix:** installed `uv` (winget) and a uv-managed CPython 3.12.15. All Python commands run through `uv run` inside each project's virtualenv, so the Store alias is never used.
- **Files changed:** none (environment only)
- **Verified by:** `uv python find 3.12` → `...\cpython-3.12-windows-x86_64-none\python.exe`
- **Attempts:** 1

### 2026-10-11 — Docker not available locally
- **Milestone:** M0 (environment check)
- **Error:** `docker : The term 'docker' is not recognized...`
- **Root cause:** Docker Desktop isn't installed. It's a ~2 GB install, so by the project rules it needs the user's approval.
- **Fix:** not installed. Docker images are validated by a `docker build` job in GitHub Actions CI and built by the HF Space itself. Locally, the inference service runs via `uv run uvicorn`.
- **Files changed:** `.github/workflows/ci.yml` (docker-build job)
- **Verified by:** CI docker-build job (once the GitHub repo exists)
- **Attempts:** 1

### 2026-10-30 — pre-commit trailing-whitespace hook blocked by Windows
- **Milestone:** Part 1 (frontend), committing the design spec
- **Error:** `trim trailing whitespace....Failed — [WinError 4551] An Application Control policy has blocked this file`
- **Root cause:** Windows Smart App Control blocks the unsigned launcher `trailing-whitespace-fixer.exe` that pre-commit generates in its cache (`~/.cache/pre-commit/.../Scripts/`). The hook's Python module itself runs fine (`python -m pre_commit_hooks.trailing_whitespace_fixer` → exit 0).
- **Fix:** overrode the hook's `entry` to `python -m pre_commit_hooks.trailing_whitespace_fixer`. It's the same check, run through the hook environment's Python instead of the blocked launcher. The hook is not skipped or disabled.
- **Files changed:** `.pre-commit-config.yaml`
- **Verified by:** `uvx pre-commit run trailing-whitespace --files ...` → Passed
- **Attempts:** 1

### 2026-10-30 — New code under web/src/lib/data silently ignored by git
- **Milestone:** Part 1 checkpoint 1, Task 2 (data contract)
- **Error:** `The following paths are ignored by one of your .gitignore files: web/src/lib/data`. The commit didn't happen.
- **Root cause:** `.gitignore` had `data/` without a leading slash, which matches a folder named `data` at any depth, not just the top-level datasets folder. The OneDrive mirror script had the same problem (`/XD data`), so it also skipped the folder.
- **Fix:** changed the rule to `/data/` (repo root only). The mirror script now excludes only `C:\dev\review-intel\data`.
- **Files changed:** `.gitignore`, `DS_ML_MODEL\.claude\mirror-review-intel.ps1` (outside the repo)
- **Verified by:** `git check-ignore -v web/src/lib/data/schemas.ts` → not ignored; `git check-ignore -v data/raw/x.jsonl.gz` → still ignored by `/data/`
- **Attempts:** 1

### 2026-10-31 — `pnpm build` crashed: out of memory (environment)
- **Milestone:** Part 1 checkpoint 1, verifying the next 16.4.1 / zod 4.6.7 security upgrade
- **Error:** `FATAL ERROR: Zone Allocation failed - process out of memory` during the build's type-check step, after `✓ Compiled successfully`
- **Root cause:** the machine had only 0.2 GB of 15.5 GB RAM free (many desktop apps open). The process failed while asking for about 20 MB, so this is system memory pressure, not a problem in the code or the upgrade. The standalone `pnpm typecheck` passed.
- **Fix:** none in code. Re-run `pnpm build` after freeing memory.
- **Files changed:** none
- **Verified by:** `pnpm build` passed on retry after memory was freed (2026-10-31). Also `pnpm lint`, `pnpm typecheck`, `pnpm test` (112/112) and `pnpm audit --prod` (no known vulnerabilities) all pass on the upgraded tree.
- **Attempts:** 1

### 2026-10-31 — vitest "spawn UNKNOWN" while running the test suite
- **Milestone:** Part 1 checkpoint 2, Tasks 7–8
- **Error:** `Unhandled Errors … Caused by: Error: spawn UNKNOWN (errno -4094, syscall spawn)`. All tests that started passed, but vitest exited non-zero.
- **Root cause:** vitest forks one worker process per test file and starts them in parallel (17–36 at once). On this low-memory machine, Windows refused some of those process launches.
- **Fix:** capped `maxWorkers: 4`. That was not enough at 0.3 GB free RAM, so vitest now also uses `pool: "threads"` (worker threads inside one process, so nothing new is spawned). No tests were changed or skipped.
- **Files changed:** `web/vitest.config.mts`
- **Verified by:** `pnpm exec vitest run --pool=threads` → 38 files, 188/188 passed, no errors, at 0.3 GB free RAM
- **Attempts:** 2 (Task 7's first re-run passed by chance at 1.7 GB free; Task 8 failed again, so the cause was fixed instead of retried)

### 2026-10-31 — Stale production server answered requests during the walkthrough
- **Milestone:** Part 1 checkpoint 2, Task 12 (browser walkthrough)
- **Error:** `listen EADDRINUSE: address already in use :::3000`, and every new page returned 404.
- **Root cause:** stopping the checkpoint 1 `pnpm start` background task only ended the pnpm wrapper. Its child `node … next start` (still on Next 16.4.0) kept serving the old build on port 3000 for a day.
- **Fix:** found the owner with `Get-NetTCPConnection -LocalPort 3000`, confirmed it was our own `review-intel\web` next server, and stopped it. After each walkthrough, check the port and stop any leftover server.
- **Files changed:** none (process hygiene)
- **Verified by:** all 6 shop pages returned 200 from the new build. The headless walkthrough passed with 0 console errors and 0 failed requests.
- **Attempts:** 1

### 2026-10-31 — Chrome tab stopped rendering (environment, not the app)
- **Milestone:** Part 1 checkpoint 2, Task 12
- **Error:** `Page.captureScreenshot timed out after 30000ms`. Pages stayed un-hydrated (streamed Suspense content never revealed, clicks did nothing).
- **Root cause:** the automation tab reported "visible" but produced no frames: `requestAnimationFrame` never fired. React reveals streamed boundaries on the next frame, so it never hydrated. This is consistent with the machine being near its memory limit. The app was not at fault.
- **Fix:** verified in a fresh headless browser instead (browser-automation skill). There, every page hydrated, all interactions worked, and the console had 0 errors.
- **Files changed:** none
- **Verified by:** headless walkthrough script, with all assertions true and screenshots reviewed
- **Attempts:** 2 screenshot attempts, then switched approach

### 2026-10-31 — Upload POST returned 500 in the running app while its tests passed
- **Milestone:** Part 1 checkpoint 3, Task 8 (browser check of the upload wizard)
- **Error:** `POST /api/shops/spice-koramangala/uploads 500` with `TypeError: {imported module ./src/lib/data/index.ts}.data.startUpload is not a function`.
- **Root cause:** the dev server had been running since before `startUpload` was added. Its hot reload didn't swap in the edited mock data source, so it kept the old object without the method. The code on disk was correct, and the route tests (which load it fresh) passed.
- **Fix:** restarted `pnpm dev`. Stopping the background task left the `next … start-server.js` child on port 3000 again (see the earlier incident), so that process was found with `Get-NetTCPConnection -LocalPort 3000` and stopped first.
- **Files changed:** none
- **Verified by:** the headless walkthrough uploaded a 3-row CSV through to "What changed", and `fail.csv` showed the failure state, with 0 console errors
- **Attempts:** 1

### 2026-10-31 — "Next.js encountered the unstable value `Date.now()` while prerendering" on Uploads
- **Milestone:** Part 1 checkpoint 3, Task 8
- **Error:** `Route "/shops/[shopId]/uploads": Next.js encountered the unstable value Date.now() while prerendering.`
- **Root cause:** upload progress is worked out from the current time, and with Cache Components Next tries to prerender as much of a page as it can. Reading the clock without first marking the page as per-request makes the output depend on when it was built.
- **Fix:** the page calls `await connection()` before loading uploads, which tells Next this part renders at request time.
- **Files changed:** `web/src/app/(app)/shops/[shopId]/uploads/page.tsx`
- **Verified by:** the error no longer appears in the dev server log during the walkthrough
- **Attempts:** 1

### 2026-10-31 — "Add rule" on the Alerts page did nothing
- **Milestone:** Part 1 checkpoint 3, Task 13 (walkthrough)
- **Error:** clicking "Add rule" left the rule count unchanged. The Server Action returned `id: Too small: expected string to have >=1 characters`.
- **Root cause:** a new rule is sent with an empty `id`, which means "create". `saveRule` validated it against `AlertRuleSchema`, which requires a non-empty id, so every new rule was rejected. The unit tests only covered the data layer (which accepts an empty id) and the row component, never the action with a new rule.
- **Fix:** `saveRule` validates a new rule with a placeholder id, then passes it on with the empty id. Added `alerts.actions.test.ts` (new rule added; another user can't toggle; can't edit another shop's rule id).
- **Files changed:** `web/src/app/actions/alerts.ts`, `web/src/app/actions/alerts.actions.test.ts`
- **Verified by:** the new test failed with the message above, then passed; full suite 341/341
- **Attempts:** 1

### 2026-10-31 — Changes made by Server Actions didn't show until a page reload
- **Milestone:** Part 1 checkpoint 3, Task 13 (production walkthrough)
- **Error:** after "Create link", "Mark all read" or "Add rule", the action succeeded (its message showed, and the change appeared after a reload), but the list on screen didn't update. This happened only on pages opened with a full page load; it worked after client-side navigation.
- **Root cause:** the actions called `refresh()` from `next/cache`. On a page opened with a full load under Partial Prerendering, that didn't re-fetch the streamed (per-request) part of the page. `revalidatePath` is documented to "update the UI immediately" when called in a Server Function. Confirmed by switching only the share actions and re-running the repro: 0 → 1 links without a reload.
- **Fix:** every action now calls `revalidatePath(\`/shops/${shopId}\`, "layout")` (or `revalidatePath("/", "layout")` for Settings, whose name shows in every sidebar).
- **Files changed:** `web/src/app/actions/{alerts,share,sources,shops}.ts`, the two action test mocks
- **Verified by:** the full headless walkthrough on a production build: rules 3 → 4, unread 2 → 0, links 1 → 2, with 0 console errors
- **Attempts:** 1 (hypothesis tested on one action before changing the rest)

### 2026-10-31 — Shared report showed "RESTAURANT · · READ-ONLY REPORT" (period missing)
- **Milestone:** Part 1 checkpoint 3, Task 13
- **Error:** the period label was blank on `/r/[token]`.
- **Root cause:** the server component `ReportView` imported `PERIOD_LABEL` from `LinkList.tsx`, a `"use client"` file. Across the server/client boundary, a plain object exported from a client module arrives as a client reference, not the object, so the lookup returned nothing. Unit tests can't catch this because vitest doesn't apply the server/client split.
- **Fix:** moved the labels to a plain module, `components/share/labels.ts`, which both sides import. Also moved the report to its own `(report)` route group, so the dark site header no longer sits above the light, printable report.
- **Files changed:** `web/src/components/share/{labels.ts,LinkList.tsx,ShareForm.tsx,ReportView.tsx}`, `web/src/app/(report)/r/[token]/page.tsx` (moved)
- **Verified by:** the production screenshot shows "RESTAURANT · LAST 90 DAYS · READ-ONLY REPORT" with no dark band
- **Attempts:** 1

### 2026-11-01 — Kaggle download failed: CERTIFICATE_VERIFY_FAILED
- **Milestone:** Part 2, Task 5 (downloading the Yelp files)
- **Error:** `requests.exceptions.SSLError: HTTPSConnectionPool(host='api.kaggle.com', port=443) … CERTIFICATE_VERIFY_FAILED … self-signed certificate in certificate chain`
- **Root cause:** Kaspersky Anti-Virus scans HTTPS by re-signing every site with its own root certificate. A check from this laptop showed `CN=Kaspersky Anti-Virus Personal Root Certificate` as the issuer for both api.kaggle.com and huggingface.co. Windows trusts that root, but Python's bundled certificate list (certifi) doesn't, so the Kaggle client refused the connection.
- **Fix:** added `truststore`. `use_system_certificates()` makes Python verify against the Windows certificate store, so verification stays **on** and is never disabled. The Kaggle download now uses the in-process Python API instead of the CLI subprocess, so the setting applies to it too.
- **Files changed:** `pipeline/src/review_intel/data/sources.py`, `pipeline/pyproject.toml`, `pipeline/uv.lock`
- **Verified by:** `KaggleApi().dataset_list_files(...)` succeeded with system certificates, and the downloads restarted
- **Attempts:** 1

### 2026-11-01 — Language filter dropped short and ALL-CAPS English reviews
- **Milestone:** Part 2, Task 5 (reading notebook 01's first dev run)
- **Error:** no crash. The cleaning table showed 3.8% of grocery and 2.8% of appliance reviews dropped as "non-English", against 0.04% of restaurant reviews. On 6,000 real grocery reviews, most of the flagged ones were English (short all-caps praise, two-word "delicious" notes, and a one-line complaint about fake fruit flavour called Norwegian).
- **Root cause:** `langdetect`'s single best guess is unreliable on short texts, capital letters and repeated phrases, and Amazon has many short reviews. Dropping them would skew the data towards longer, calmer reviews: a silent bias, not an error.
- **Fix:** detect on lowercase text; keep reviews under 40 characters; count a review as English if it has 2+ very common English words, or if langdetect gives English at least a 20% chance. Real flagged examples became test cases (12 new parametrized tests, including Spanish ones that must still be dropped).
- **Files changed:** `pipeline/src/review_intel/data/clean.py`, `pipeline/tests/test_clean.py`, `pipeline/pyproject.toml` (ruff: notebook style ignores)
- **Verified by:** on the same 6,000 reviews, flagged grocery dropped 2.1% → 0.07% (all Spanish); appliances 0.44% (~80% Spanish). 41/41 tests pass.
- **Attempts:** 3 (best guess on lowercase → common-word check → everyday review words)

### 2026-11-01 — Label leak: Amazon's automatic "Five Stars" titles
- **Milestone:** Part 2, Task 7 (reading notebook 02's first baseline run)
- **Error:** no crash. The baseline's strongest words included "two stars", "one star", "five stars" and "three stars".
- **Root cause:** Amazon gives a review without a title an automatic one ("Five Stars", "One Star", …). The reader joins title and text, so about 9% of appliance and 8% of grocery reviews started with their own label: the title matched the rating 99.8% of the time (8,600 reviews). Any model trained on this partly reads the answer, so its scores are inflated and it learns nothing useful from those reviews. Yelp has no titles.
- **Fix:** `iter_amazon` drops titles that are only "One Star" … "Five Stars". Star words in the customer's own text are kept. Added `test_automatic_star_titles_are_dropped_because_they_leak_the_label`. The baseline's C range now also goes up to 8, because the leaky run picked the top value, 4.
- **Files changed:** `pipeline/src/review_intel/data/sources.py`, `pipeline/src/review_intel/models/baseline.py`, `pipeline/tests/test_sources.py`, `pipeline/tests/test_baseline.py`
- **Verified by:** the test failed first, then passed; 47/47 tests. The dataset is rebuilt and notebooks 01 and 02 re-run (the leaky baseline scored macro F1 0.741).
- **Attempts:** 1

### 2026-11-01 — Modal refused GPU functions: "Please add a payment method"
- **Milestone:** Part 2, Task 8 (smoke training run)
- **Error:** `modal.exception.InvalidError: Please add a payment method to use T4 GPU functions.` This was raised when the function was created, before anything ran, so nothing was charged.
- **Root cause:** Modal's Starter plan includes $30/month of credits, but GPU functions are only enabled once the workspace has a payment method on file. The CPU-only inference service never needed one.
- **Fix:** needs the account owner: add a card in Modal (Settings → Usage and Billing), ideally with a workspace budget cap. Meanwhile, Tasks 9–11 continue on CPU where possible.
- **Files changed:** none
- **Verified by:** pending the user's billing change
- **Attempts:** 1 (an account setting, not a code problem)

### 2026-11-01 — A commit with a syntax error (escape sequences in an edit script)
- **Milestone:** Part 2, Task 11
- **Error:** `SyntaxError: unterminated string literal` in `aspects/catalogue.py`, committed in b5d7038. The same cause earlier put a backspace character into a regex (`\b` → `\x08`), so "and the" never split clauses.
- **Root cause:** I edited files with small Python scripts passed through a shell heredoc. Escapes like `"\n"` and `\b` inside those scripts' normal strings were turned into real control characters before being written. The commit went ahead because the command chain piped `pytest` into `tail`, which hid pytest's failing exit code.
- **Fix:** both lines rewritten with the file editor, which writes text exactly. Commit f30260a; 84/84 tests pass. From now on, edits containing backslash escapes go through the file editor, and test commands are not piped before `&&`.
- **Files changed:** `pipeline/src/review_intel/aspects/catalogue.py`, `pipeline/src/review_intel/aspects/absa.py`
- **Verified by:** `test_and_splits_clauses_only_when_a_new_subject_follows` (failed before the regex fix) and the full suite
- **Attempts:** 2

### 2026-11-01 — Smoke run crashed printing "✓" (Windows console encoding)
- **Milestone:** Part 2, Task 8
- **Error:** `UnicodeEncodeError: 'charmap' codec can't encode character '✓'` from Modal's progress output.
- **Root cause:** with output redirected to a log file, Python on Windows writes in the old cp1252 code page, which has no ✓ character. In a normal terminal it would have worked.
- **Fix:** `smoke_train.py` switches stdout/stderr to UTF-8 at start-up.
- **Files changed:** `pipeline/scripts/smoke_train.py`
- **Verified by:** the re-run printed "✓ Initialized" and got as far as Modal's billing check (still refused: see the entry above).
- **Attempts:** 1

### 2026-11-01 — Training code would have crashed on the GPU (caught by a CPU test)
- **Milestone:** Part 2, Task 8 (moving training to Kaggle)
- **Error:** `TypeError: TrainingArguments.__init__() got an unexpected keyword argument 'group_by_length'`, then `ImportError: Using the Trainer with PyTorch requires accelerate>=1.1.0`.
- **Root cause:** the training code had never run, because Modal refused GPUs. Transformers 5 renamed `group_by_length=True` to `train_sampling_strategy="group_by_length"`, and the laptop environment lacked `accelerate`, which only the Modal image installed.
- **Fix:** training moved into `review_intel.models.train`, which runs anywhere. A new test trains a tiny random model on the CPU in seconds; the argument was renamed and `accelerate` was added to the `ml` group.
- **Files changed:** `pipeline/src/review_intel/models/train.py`, `pipeline/src/review_intel/gpu.py`, `pipeline/tests/test_train.py`, `pipeline/pyproject.toml`
- **Verified by:** `tests/test_train.py` (3 tests) failed, then passed; full suite green
- **Attempts:** 2

### 2026-11-01 — Kaggle API surprises: 403 on dataset status, unpacked zip, 409 on notebook title
- **Milestone:** Part 2, Task 8
- **Error:** `403 Forbidden` from `GetDatasetStatus`; then `409 Conflict: The requested title "review-intel-train" is already in use by a dataset`.
- **Root cause:** (1) the dataset status endpoint refuses API tokens even for your own dataset; the upload itself had worked. (2) Kaggle unpacks uploaded zip files into folders, so the notebook's search for `review_intel.zip` would also have failed. (3) Kaggle titles are unique across datasets *and* notebooks.
- **Fix:** "ready" now means the dataset's file list includes `train.parquet`; the notebook script imports from the unpacked folder (falling back to the zip); the notebook is called `review-intel-gpu`.
- **Files changed:** `pipeline/src/review_intel/kaggle_job.py`, `pipeline/scripts/kaggle_train.py`, `pipeline/tests/test_kaggle_job.py`
- **Verified by:** dataset confirmed private with its files listed; the slug test failed, then passed; the smoke run imported the package from the unpacked folder
- **Attempts:** 3

### 2026-11-01 — Kaggle notebook ran with no internet and no GPU
- **Milestone:** Part 2, Task 8
- **Error:** `Failed to resolve 'pypi.org'` → `No matching distribution found for transformers==5.22.1`. A probe notebook then printed `torch 2.11.0+cpu` and `GPU none`, even though the settings asked for both.
- **Root cause:** Kaggle quietly turns off internet and GPUs in notebooks for accounts without a verified phone number. The weekly quota (30 h) is shown either way.
- **Fix:** needs the account owner: verify a phone number at kaggle.com → Settings → Phone verification. No code change.
- **Files changed:** none
- **Verified by:** after the user verified their phone, the probe printed `torch 2.11.0+cu128 · GPU Tesla T4 · internet ok`; the smoke run then trained (val macro F1 0.622 on 2,001 reviews, 1 epoch, 21 s) and scored all 14,996 test reviews
- **Attempts:** 2 (an account setting, not a code problem)

### 2026-11-01 — Shop report: skipped reviews shifted results; offsets pointed into text it never returned
- **Milestone:** Part 2, Task 11 (notebook 05 re-run)
- **Error:** `ValueError: zip() argument 2 is shorter than argument 1` in notebook 05's review display.
- **Root cause:** `analyze_reviews` skips empty and non-English reviews, so its results list can be shorter than the input; the notebook paired them by position. A deeper problem was behind it: the cause offsets (`start`, `end`) point into the *cleaned* text (HTML removed, spaces collapsed), which the report didn't return. Highlighting the original text would put the marks in the wrong place whenever cleaning changed anything.
- **Fix:** each review result now carries `text` (the cleaned text the offsets index), and the notebook uses it. The `id` (`r<n>` = n-th review given) stays the way to match results back to inputs.
- **Files changed:** `pipeline/src/review_intel/report.py`, `pipeline/tests/test_report.py`, notebook 05
- **Verified by:** `test_review_results_carry_the_text_their_offsets_point_into` failed (KeyError 'text'), then passed; 14/14 report tests
- **Attempts:** 1
