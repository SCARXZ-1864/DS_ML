"""JSON-lines logger for the inference service (contract: docs/ENGINEERING.md §2).

The middleware stores the current request id in a ContextVar, so every log
line written while handling a request carries it automatically.
"""

from __future__ import annotations

import json
import logging
import re
import sys
import traceback
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

SERVICE = "inference"
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

_SECRET_KEY = re.compile(r"key|secret|token|password|authorization", re.IGNORECASE)


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(UTC).isoformat(timespec="milliseconds"),
            "level": "warn" if record.levelname == "WARNING" else record.levelname.lower(),
            "service": SERVICE,
            "event": record.getMessage(),
        }
        if rid := request_id_var.get():
            payload["request_id"] = rid
        fields = getattr(record, "fields", {})
        payload.update({k: "[REDACTED]" if _SECRET_KEY.search(k) else v for k, v in fields.items()})
        if record.exc_info:
            exc_type = record.exc_info[0]
            payload["error_type"] = exc_type.__name__ if exc_type else None
            payload["traceback"] = "".join(traceback.format_exception(*record.exc_info))
        return json.dumps(payload, default=str)


class EventLogger:
    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def _log(self, level: int, event: str, exc_info: bool = False, **fields: Any) -> None:
        self._logger.log(level, event, exc_info=exc_info, extra={"fields": fields})

    def info(self, event: str, **fields: Any) -> None:
        self._log(logging.INFO, event, **fields)

    def warning(self, event: str, **fields: Any) -> None:
        self._log(logging.WARNING, event, **fields)

    def error(self, event: str, **fields: Any) -> None:
        self._log(logging.ERROR, event, **fields)

    def exception(self, event: str, **fields: Any) -> None:
        self._log(logging.ERROR, event, exc_info=True, **fields)


def get_logger(level: str = "info") -> EventLogger:
    logger = logging.getLogger("inference")
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
        logger.propagate = False
    logger.setLevel(level.upper())
    return EventLogger(logger)
