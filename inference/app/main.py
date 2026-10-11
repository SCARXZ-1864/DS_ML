"""FastAPI entrypoint. Model endpoints (/embed, /predict/*) arrive in M8."""

from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, Request

from app.errors import register_error_handlers
from app.logging import get_logger, request_id_var
from app.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()  # raises at boot if env is incomplete
    log = get_logger(settings.log_level)
    started = time.monotonic()

    app = FastAPI(title="Review Intel Inference", version=settings.git_sha)
    app.state.settings = settings
    register_error_handlers(app)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = rid
        token = request_id_var.set(rid)
        t0 = time.perf_counter()
        try:
            response = await call_next(request)
            response.headers["x-request-id"] = rid
            log.info(
                "request_completed",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=round((time.perf_counter() - t0) * 1000, 1),
            )
            return response
        finally:
            request_id_var.reset(token)

    @app.get("/health")
    def health() -> dict:
        return {
            "status": "ok",
            "service": "inference",
            "version": settings.git_sha,
            "uptime_s": round(time.monotonic() - started, 1),
            "checks": {"models": "not_loaded"},  # real model state lands in M8
        }

    log.info("app_started", version=settings.git_sha)
    return app


def get_app() -> FastAPI:
    """Factory for uvicorn: `uvicorn app.main:get_app --factory`."""
    return create_app()
