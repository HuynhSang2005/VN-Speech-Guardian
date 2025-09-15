import os
from fastapi.testclient import TestClient
from app.main import create_app


def test_healthz():
    client = TestClient(create_app())
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_asr_stream_ok():
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    app = create_app()
    client = TestClient(app)
    data = b"\x00\x01\x02\x03"
    resp = client.post(
        "/asr/stream",
        data=data,
        headers={"Content-Type": "application/octet-stream", "x-session-id": "s1", "x-api-key": "dev-secret"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "ok"
    assert body["final"]["text"]


def test_asr_stream_missing_session():
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    client = TestClient(create_app())
    resp = client.post(
        "/asr/stream",
        data=b"123",
        headers={"Content-Type": "application/octet-stream", "x-api-key": "dev-secret"},
    )
    assert resp.status_code == 400
