"""Structured JSON logging shared by all pipeline scripts.

One JSON object per line on stdout, following the contract in
docs/ENGINEERING.md §2. Usage:

    log = get_logger(__name__)
    log.info("data_loaded", rows=150_000, path=str(path))
"""

from __future__ import annotations

import json
import logging
import re
import sys
import traceback
from datetime import UTC, datetime
from typing import Any

SERVICE = "pipeline"
_SECRET_KEY = re.compile(r"key|secret|token|password|authorization", re.IGNORECASE)
_REDACTED = "[REDACTED]"


def _redact(fields: dict[str, Any]) -> dict[str, Any]:
    return {k: (_REDACTED if _SECRET_KEY.search(k) else v) for k, v in fields.items()}


class _StdoutHandler(logging.Handler):
    """Writes to whatever sys.stdout is at emit time (keeps pytest capture working)."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            sys.stdout.write(self.format(record) + "\n")
            sys.stdout.flush()
        except Exception:  # pragma: no cover - logging must never crash the caller
            self.handleError(record)


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "level": "warn" if record.levelname == "WARNING" else record.levelname.lower(),
            "service": SERVICE,
            "event": record.getMessage(),
            "logger": record.name,
        }
        payload.update(_redact(getattr(record, "fields", {})))
        if record.exc_info:
            exc_type = record.exc_info[0]
            payload["error_type"] = exc_type.__name__ if exc_type else None
            payload["traceback"] = "".join(traceback.format_exception(*record.exc_info))
        return json.dumps(payload, default=str)


class EventLogger:
    """Thin wrapper so call sites read `log.info("event", key=value)`."""

    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def _log(self, level: int, event: str, exc_info: bool = False, **fields: Any) -> None:
        self._logger.log(level, event, exc_info=exc_info, extra={"fields": fields})

    def debug(self, event: str, **fields: Any) -> None:
        self._log(logging.DEBUG, event, **fields)

    def info(self, event: str, **fields: Any) -> None:
        self._log(logging.INFO, event, **fields)

    def warning(self, event: str, **fields: Any) -> None:
        self._log(logging.WARNING, event, **fields)

    def error(self, event: str, **fields: Any) -> None:
        self._log(logging.ERROR, event, **fields)

    def exception(self, event: str, **fields: Any) -> None:
        """Log at error level with the current exception's traceback."""
        self._log(logging.ERROR, event, exc_info=True, **fields)


def get_logger(name: str, level: int = logging.INFO) -> EventLogger:
    logger = logging.getLogger(f"review_intel.{name}")
    if not logger.handlers:
        handler = _StdoutHandler()
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    return EventLogger(logger)
