def test_health_needs_no_auth_and_follows_contract(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in {"ok", "degraded", "down"}
    assert body["service"] == "inference"
    assert body["version"] == "testsha"
    assert isinstance(body["uptime_s"], (int, float))
    assert isinstance(body["checks"], dict)


def test_request_id_is_echoed_when_provided(client):
    r = client.get("/health", headers={"x-request-id": "abc-123"})
    assert r.headers["x-request-id"] == "abc-123"


def test_request_id_is_generated_when_missing(client):
    r = client.get("/health")
    assert len(r.headers["x-request-id"]) >= 16
