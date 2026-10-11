import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings

TEST_KEY = "test-key-not-a-secret"


@pytest.fixture
def settings() -> Settings:
    return Settings(inference_api_key=TEST_KEY, git_sha="testsha")


@pytest.fixture
def app(settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    # raise_server_exceptions=False so we can assert on the 500 response body
    return TestClient(app, raise_server_exceptions=False)
