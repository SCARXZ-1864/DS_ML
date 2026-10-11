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

### 2026-10-12 — CI secret-scan job failed on the first push
- **Milestone:** M0
- **Error:** `gitleaks/gitleaks-action@v2` → `ERROR: Unexpected exit code [1]` (CI run 38174301119). The other 4 jobs passed.
- **Root cause:** not a real leak: `gitleaks git` over the same 8 commits locally reports "no leaks found". Not the org-licence requirement either, since the repo owner is a User account. The failure is in the action wrapper. Its most likely cause is the documented push-event behaviour of scanning `before..after`, where `before` is `0000000` on a new branch's first push. That can't be confirmed without authenticated log access.
- **Fix:** replaced the wrapper with the pinned gitleaks CLI (v8.30.1, the same as local), running the identical full-history command `gitleaks git --redact --verbose .`.
- **Files changed:** `.github/workflows/ci.yml`
- **Verified by:** the local full-history scan, and the CI run after this commit (see the commit message / Actions tab)
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
