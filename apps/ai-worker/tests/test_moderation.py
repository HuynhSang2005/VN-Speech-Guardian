import os
from fastapi.testclient import TestClient
from app.main import create_app


def test_moderation_ok():
    os.environ["GATEWAY_API_KEY"] = "dev-secret"
    app = create_app()
    client = TestClient(app)
    body = {"inputs": ["xin chao", "đồ ngu quá"]}
    resp = client.post("/moderation", json=body, headers={"x-api-key": "dev-secret"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 2
    labels = [r["label"] for r in data["results"]]
    assert "safe" in labels and "block" in labels


def test_moderation_unauthorized():
    client = TestClient(create_app())
    resp = client.post("/moderation", json={"inputs": ["hi"]})
    assert resp.status_code == 401
