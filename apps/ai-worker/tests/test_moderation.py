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


def test_readyz_not_ready(tmp_path):
    # Ensure no model is loaded and directory doesn't exist
    os.environ["PHOBERT_CHECKPOINT_DIR"] = str(tmp_path / "missing")
    os.environ["PHOBERT_ONNX_DIR"] = ""
    os.environ["AI_LOAD_MODELS"] = "false"
    app = create_app()
    client = TestClient(app)
    r = client.get("/readyz")
    assert r.status_code == 200
    data = r.json()
    assert data["phobert_loaded"] is False
    assert data["phobert_dir"] is False
    assert data["status"] in ("ok", "starting")


def test_readyz_ready_with_dir(tmp_path):
    # Create a fake directory to simulate presence of checkpoint
    fake = tmp_path / "bert-finetuned"
    fake.mkdir(parents=True, exist_ok=True)
    os.environ["PHOBERT_CHECKPOINT_DIR"] = str(fake)
    os.environ["AI_LOAD_MODELS"] = "false"
    app = create_app()
    client = TestClient(app)
    r = client.get("/readyz")
    assert r.status_code == 200
    data = r.json()
    assert data["phobert_dir"] is True
