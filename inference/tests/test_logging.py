import logging

from app.main import create_app
from app.settings import Settings
from tests.conftest import TEST_KEY


def test_log_level_setting_survives_app_creation():
    # Regression: register_error_handlers() used to call get_logger() with the
    # default level, resetting LOG_LEVEL back to info (ERROR_LOG 2026-10-14).
    create_app(Settings(inference_api_key=TEST_KEY, log_level="debug"))
    assert logging.getLogger("inference").level == logging.DEBUG
