# Review Intel: inference service

FastAPI service for the Customer Review Intelligence Tool, deployed to **Modal** (serverless, scales to zero). It's called server-to-server by the Next.js app; browsers never call it directly.

| Endpoint | Auth | Status |
|----------|------|--------|
| `GET /health` | none | live |
| `POST /embed` | `x-api-key` | M8 |
| `POST /predict/sentiment` | `x-api-key` | M8 |
| `POST /predict/absa` | `x-api-key` | M8 |

## Local run

```bash
uv sync
INFERENCE_API_KEY=local-dev-key-123 uv run uvicorn app.main:get_app --factory --port 7860
uv run pytest
```

## Deploy to Modal

One-time setup:
1. `uv run --group deploy modal token new`. This opens a browser to sign in.
2. In the Modal dashboard, go to **Secrets → Create → Custom**, name it `review-intel-inference`, and add the key `INFERENCE_API_KEY`.

Deploy:

```bash
uv run --group deploy modal deploy modal_app.py
# → https://<workspace>--review-intel-inference.modal.run/health
```

`modal_app.py` builds the image with `uv_sync` from this folder's `uv.lock`, so production runs exactly the locked versions. The `Dockerfile` is kept as a portable fallback (RISKS R31) and is built and smoke-tested in CI.
