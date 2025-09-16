import os, time
from fastapi.testclient import TestClient
from app.main import create_app


def test_asr_stream_two_chunks_partial_then_final():
    # Ensure API key and reasonable rate limit for test cadence
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    os.environ["ASR_MIN_INTERVAL_MS"] = "0"  # disable to avoid 429 between quick posts
    app = create_app()
    client = TestClient(app)

    # 1) Send first chunk without x-final -> expect partial
    r1 = client.post(
        "/asr/stream",
        content=b"\x00\x01\x02\x03\x04\x05",
        headers={
            "Content-Type": "application/octet-stream",
            "x-session-id": "sess-stream-1",
            "x-chunk-seq": "1",
            "x-api-key": "dev-secret",
        },
    )
    assert r1.status_code == 200, r1.text
    j1 = r1.json()
    assert j1["status"] == "ok"
    assert "partial" in j1 and "final" not in j1
    assert isinstance(j1.get("detections", []), list)

    # 2) Send final chunk with x-final -> expect final
    r2 = client.post(
        "/asr/stream",
        content=b"\x10\x11\x12\x13",
        headers={
            "Content-Type": "application/octet-stream",
            "x-session-id": "sess-stream-1",
            "x-chunk-seq": "2",
            "x-final": "true",
            "x-api-key": "dev-secret",
        },
    )
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["status"] == "ok"
    assert "final" in j2 and "partial" not in j2
    assert isinstance(j2.get("detections", []), list)
