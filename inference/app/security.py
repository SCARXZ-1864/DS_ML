"""Shared-secret auth for every endpoint except /health (RISKS R20)."""

from __future__ import annotations

import hmac

from fastapi import Request

from app.errors import ApiError


def require_api_key(request: Request) -> None:
    expected = request.app.state.settings.inference_api_key.get_secret_value()
    provided = request.headers.get("x-api-key", "")
    # compare_digest takes constant time, so response timing can't reveal how
    # much of a guessed key was correct.
    if not hmac.compare_digest(provided.encode(), expected.encode()):
        raise ApiError(401, "UNAUTHORIZED", "Missing or invalid API key.")
