# Hugging Face Space (sdk: docker). HF runs containers as uid 1000 and routes to app_port 7860.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /usr/local/bin/uv

RUN useradd -m -u 1000 user
WORKDIR /app

# Install deps first (cached layer); app code changes don't reinstall them.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# M8: model weights get downloaded here at build time (scripts/download_models.py)
# so cold starts load from local disk (RISKS R11, R14).

COPY app ./app
RUN chown -R user:user /app
USER user
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 7860
# --no-access-log: our middleware already writes a structured request_completed line.
CMD ["uvicorn", "app.main:get_app", "--factory", "--host", "0.0.0.0", "--port", "7860", "--no-access-log"]
