import os
from fastapi.testclient import TestClient
from app.main import create_app


def test_readyz_missing_dir(tmp_path):
    os.environ["PHOBERT_CHECKPOINT_DIR"] = str(tmp_path / "nope")
    os.environ["PHOBERT_ONNX_DIR"] = ""
    os.environ["AI_LOAD_MODELS"] = "false"
    app = create_app()
    client = TestClient(app)
    r = client.get("/readyz")
    assert r.status_code == 200
    data = r.json()
    assert data["phobert_dir"] is False
    assert data["phobert_loaded"] in (False, True)


def test_readyz_loaded_flag(tmp_path):
    # Simulate loaded model by injecting into app.state
    os.environ["AI_LOAD_MODELS"] = "false"
    app = create_app()
    app.state.models = {"phobert": {"tokenizer": object(), "model": object()}}
    client = TestClient(app)
    r = client.get("/readyz")
    assert r.status_code == 200
    data = r.json()
    assert data["phobert_loaded"] is True