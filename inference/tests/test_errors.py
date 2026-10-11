import pytest
from fastapi import Depends
from pydantic import BaseModel, Field
from pydantic_settings import SettingsConfigDict

from app.security import require_api_key
from app.settings import Settings
from tests.conftest import TEST_KEY


class Echo(BaseModel):
    text: str = Field(min_length=1, max_length=10)


@pytest.fixture
def client_with_routes(app, client):
    @app.post("/_test/echo", dependencies=[Depends(require_api_key)])
    def echo(body: Echo):
        return {"text": body.text}

    @app.get("/_test/boom")
    def boom():
        raise RuntimeError("secret internal detail")

    return client


def test_missing_api_key_is_unauthorized(client_with_routes):
    r = client_with_routes.post("/_test/echo", json={"text": "hi"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"


def test_wrong_api_key_is_unauthorized(client_with_routes):
    r = client_with_routes.post("/_test/echo", json={"text": "hi"}, headers={"x-api-key": "nope"})
    assert r.status_code == 401


def test_valid_api_key_passes(client_with_routes):
    r = client_with_routes.post("/_test/echo", json={"text": "hi"}, headers={"x-api-key": TEST_KEY})
    assert r.status_code == 200
    assert r.json() == {"text": "hi"}


def test_validation_error_follows_contract(client_with_routes):
    r = client_with_routes.post(
        "/_test/echo",
        json={"text": "this is far too long"},
        headers={"x-api-key": TEST_KEY, "x-request-id": "req-1"},
    )
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "VALIDATION_ERROR"
    assert err["request_id"] == "req-1"
    assert "text" in err["message"]


def test_unhandled_error_hides_internals(client_with_routes):
    r = client_with_routes.get("/_test/boom")
    assert r.status_code == 500
    err = r.json()["error"]
    assert err["code"] == "INTERNAL_ERROR"
    assert "secret internal detail" not in r.text


def test_settings_fail_fast_without_api_key(monkeypatch):
    monkeypatch.delenv("INFERENCE_API_KEY", raising=False)

    class IsolatedSettings(Settings):
        model_config = SettingsConfigDict(env_file=None)

    with pytest.raises(ValueError):
        IsolatedSettings()


def test_unknown_route_follows_contract(client):
    r = client.get("/does-not-exist", headers={"x-request-id": "req-404"})
    assert r.status_code == 404
    err = r.json()["error"]
    assert err["code"] == "NOT_FOUND"
    assert err["request_id"] == "req-404"
