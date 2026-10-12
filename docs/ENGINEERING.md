# Engineering conventions

These are the rules that let the project **diagnose its own failures**, during development and in production. Every service follows the same contracts, so a failure looks the same wherever it happens.

---

## 1. Development error workflow

When any command fails (code, test, build, install, deploy):

1. **Capture**: keep the full output (traceback, build log), not a paraphrase.
2. **Diagnose before touching code**: write the root cause in 2–3 sentences. A root cause explains *why* ("the CPU torch wheel index wasn't used, so pip resolved a CUDA build"), not just *what* ("install failed").
3. **Smallest fix**: change only what the root cause requires. **Never** silence errors (`except: pass`, `// @ts-ignore`, `--no-verify`), delete or skip tests, or loosen assertions to get green.
4. **Verify**: re-run the exact command that failed, plus the relevant test suite.
5. **Log it** in [ERROR_LOG.md](../ERROR_LOG.md): date, error, root cause, fix, files changed, verification, attempt count.
6. **3-strike rule**: if the same error survives 3 fix attempts, stop and ask the human. A loop of guesses is a sign the mental model is wrong.

---

## 2. Structured logging (both services)

One JSON object per line, written to stdout (Vercel and Modal both capture stdout).

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `ts` | ISO-8601 string | yes | Timestamp (UTC) |
| `level` | `debug`/`info`/`warn`/`error` | yes | |
| `service` | `web` / `inference` / `pipeline` | yes | Which component logged it |
| `event` | snake_case string | yes | A stable name such as `request_completed` or `embed_retry`. **Search by this** |
| `request_id` | string | when in a request | Correlates one user action across services |
| `duration_ms` | number | for timed events | |
| `error_code` | string | on errors | From the table in §3 |
| *(others)* | any | no | Context: route, status, attempt, model… |

**Why JSON?** Plain text logs are for humans. JSON logs are for humans *and* queries. In Vercel's log viewer you can filter `event = "embed_retry"` and see every cold-start retry at once.

**Never log:** secrets, API keys, full review text from users, or raw IPs (hash them). The logger redacts keys whose names match `/key|secret|token|password|authorization/i`, and a unit test proves it.

### Request ID propagation

- The Next.js route reads `x-request-id` from the incoming request, or generates a UUID.
- It sends `x-request-id` on every outbound call to the inference service.
- The inference service middleware reads it (or generates one) and echoes it in the response header.
- Error responses include `request_id`, so a user can report "it failed, id abc123" and we can find both sides' logs.

---

## 3. Error response contract

Every API error, in both services, has this shape:

```json
{ "error": { "code": "COLD_START", "message": "Model is waking up, please retry shortly.", "request_id": "…" } }
```

| `code` | HTTP | Retryable? | Meaning |
|--------|------|------------|---------|
| `VALIDATION_ERROR` | 400/422 | no | Bad input. The message says which field and why |
| `UNAUTHORIZED` | 401 | no | Missing or invalid API key (inference service) |
| `RATE_LIMITED` | 429 | after `retry_after` | Our own per-IP or daily cap |
| `COLD_START` | 503 | **yes** | The inference container is cold-starting (timeout, 502/503, or a non-JSON body) |
| `UPSTREAM_ERROR` | 502 | yes (limited) | A dependency (DB, LLM, inference) returned 5xx |
| `UPSTREAM_TIMEOUT` | 504 | yes (limited) | A dependency exceeded its timeout |
| `QUOTA_EXHAUSTED` | 429 | no (until tomorrow) | The global daily LLM cap was reached |
| `INTERNAL_ERROR` | 500 | no | A bug on our side, logged at `error` with a stack |

Users never see stack traces. Logs always have them.

---

## 4. Retry policy

- **Retry only retryable errors:** network errors, timeouts, 429, 502, 503, 504. **Never retry 4xx validation or auth errors**, because retrying a bad request just repeats the failure faster.
- **Exponential backoff with full jitter:** `delay = random(0, min(cap, base × 2^attempt))`.
  - Jitter stops many clients from retrying in sync (the "thundering herd").
  - A `Retry-After` header, if present, overrides the computed delay.
- **Every retry loop has a total deadline**, not just a retry count, so it fits inside the Vercel function's time limit.

| Call | Per-attempt timeout | Attempts | Base / cap | Total budget |
|------|---------------------|----------|------------|--------------|
| Inference `/embed`, `/predict` | 8 s | 4 | 1 s / 8 s | 45 s |
| LLM | 30 s | 3 | 1 s / 8 s | 60 s |
| Supabase | 5 s | 2 | 0.3 s / 1 s | 8 s |

---

## 5. Health contract

`GET /health` (inference) and `GET /api/health` (web) return:

```json
{
  "status": "ok | degraded | down",
  "service": "inference | web",
  "version": "git sha",
  "uptime_s": 123,
  "checks": { "db": "ok", "inference": "waking", "llm": "configured" }
}
```

- Health endpoints need **no auth** and **no expensive work**. They report cached model-load state rather than running a model.
- The web health route checks dependencies **in parallel**, with a 3 s timeout each.
- UI status badge mapping: `ok` → green "All systems operational"; `inference: waking` → amber "Model is waking up"; `degraded` → amber; `down` → red.

---

## 6. Input validation

- **Python:** Pydantic models on every request body, with explicit `max_length` on strings and lists.
- **TypeScript:** a zod schema on every route, parsed *before* any other work. Failures return `VALIDATION_ERROR` with field paths.
- **Environment:** both services validate env vars at startup and **crash immediately with a clear message** if something is missing. A missing key should fail at boot, not on the first user request.

---

## 7. Testing gates

| Gate | Command | Runs |
|------|---------|------|
| Python pipeline | `uv run ruff check . && uv run pytest` (in `pipeline/`) | pre-push, CI |
| Inference | `uv run ruff check . && uv run pytest` (in `inference/`) | pre-push, CI |
| Web | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (in `web/`) | pre-push, CI |
| Secrets | `gitleaks` | pre-commit, CI |
| Docker | `docker build inference/` | CI only (no local Docker) |

**Deploy jobs depend on all CI jobs passing.** A red build can't reach production.

---

## 8. Git conventions

- Small commits, each doing one thing, in imperative mood with a type prefix:
  - `feat(web): add health route`
  - `fix(inference): use CPU torch index`
  - `docs: …`, `test: …`, `chore: …`, `ci: …`
- Never commit: `.env*` (except `.env.example`), `data/`, model weights, notebook outputs.
- The pre-commit hooks (gitleaks, large-file check, whitespace) are installed with `uvx pre-commit install`.
