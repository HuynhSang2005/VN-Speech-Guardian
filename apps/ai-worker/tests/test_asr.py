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
        content=data,
        headers={"Content-Type": "application/octet-stream", "x-session-id": "s1", "x-api-key": "dev-secret"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "ok"
    # default without x-final should be partial
    assert body.get("partial", {}).get("text")


def test_asr_stream_missing_session():
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    client = TestClient(create_app())
    resp = client.post(
        "/asr/stream",
        data=b"123",
        headers={"Content-Type": "application/octet-stream", "x-api-key": "dev-secret"},
    )
    assert resp.status_code == 400


def test_asr_stream_rate_limit_and_final():
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    os.environ["ASR_MIN_INTERVAL_MS"] = "1000"
    app = create_app()
    client = TestClient(app)
    try:
        r1 = client.post(
            "/asr/stream",
            content=b"\x00\x01",
            headers={"Content-Type": "application/octet-stream", "x-session-id": "s2", "x-api-key": "dev-secret", "x-final": "true"},
        )
        assert r1.status_code == 200
        assert r1.json().get("final", {}).get("text")
        r2 = client.post(
            "/asr/stream",
            content=b"\x00\x01",
            headers={"Content-Type": "application/octet-stream", "x-session-id": "s2", "x-api-key": "dev-secret"},
        )
        assert r2.status_code == 429
    finally:
        os.environ.pop("ASR_MIN_INTERVAL_MS", None)


def test_asr_stream_detections_via_mod():
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    os.environ["ASR_RUN_MOD"] = "true"
    app = create_app()
    client = TestClient(app)
    try:
        r = client.post(
            "/asr/stream",
            content=b"\x00\x01\x02\x03",
            headers={"Content-Type": "application/octet-stream", "x-session-id": "s3", "x-api-key": "dev-secret", "x-final": "true"},
        )
        assert r.status_code == 200
        js = r.json()
        assert isinstance(js.get("detections", []), list)
        for d in js.get("detections", []):
            assert 0.0 <= float(d.get("score", 0.0)) <= 1.0
    finally:
        os.environ.pop("ASR_RUN_MOD", None)
