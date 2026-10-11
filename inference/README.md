---
title: Review Intel Inference
emoji: 🔎
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Review Intel: inference service

FastAPI service for the Customer Review Intelligence Tool. It's called server-to-server by the Next.js app; browsers never call it directly.

| Endpoint | Auth | Status |
|----------|------|--------|
| `GET /health` | none | live |
| `POST /embed` | `x-api-key` | M8 |
| `POST /predict/sentiment` | `x-api-key` | M8 |
| `POST /predict/absa` | `x-api-key` | M8 |

Required secret: `INFERENCE_API_KEY` (set in Space settings → Variables and secrets).

## Local run

```bash
uv sync
INFERENCE_API_KEY=local-dev-key-123 uv run uvicorn app.main:get_app --factory --port 7860
uv run pytest
```
