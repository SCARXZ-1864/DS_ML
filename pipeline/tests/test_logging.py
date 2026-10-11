import json
import logging

from review_intel.logging import get_logger


def test_logs_are_single_line_json_with_required_fields(capsys):
    log = get_logger("test_required")
    log.info("data_loaded", rows=10)
    record = json.loads(capsys.readouterr().out.strip())
    assert record["level"] == "info"
    assert record["service"] == "pipeline"
    assert record["event"] == "data_loaded"
    assert record["rows"] == 10
    assert "ts" in record


def test_secret_like_fields_are_redacted(capsys):
    log = get_logger("test_redact")
    log.info("connecting", hf_token="hf_abc123", api_key="sk-xyz", Authorization="Bearer t", rows=1)
    record = json.loads(capsys.readouterr().out.strip())
    assert record["hf_token"] == "[REDACTED]"
    assert record["api_key"] == "[REDACTED]"
    assert record["Authorization"] == "[REDACTED]"
    assert record["rows"] == 1


def test_exceptions_include_error_type_and_traceback(capsys):
    log = get_logger("test_exc")
    try:
        raise ValueError("boom")
    except ValueError:
        log.exception("step_failed", step="clean")
    record = json.loads(capsys.readouterr().out.strip())
    assert record["level"] == "error"
    assert record["error_type"] == "ValueError"
    assert "boom" in record["traceback"]


def test_logger_does_not_duplicate_handlers(capsys):
    get_logger("test_dup")
    log = get_logger("test_dup")
    log.info("once")
    lines = [line for line in capsys.readouterr().out.splitlines() if line]
    assert len(lines) == 1
    assert logging.getLogger("review_intel.test_dup").propagate is False
