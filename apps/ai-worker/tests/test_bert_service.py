from app.services.bert_service import _heuristic, predict
from app.core.config import cfg


def test_heuristic_simple():
    data = ["Xin chao", "đồ ngu quá", "Cảnh báo lần cuối"]
    out = _heuristic(data)
    assert out[0]["label"] == "safe"
    assert out[1]["label"] == "block"
    assert out[2]["label"] == "warn"


def test_threshold_env_override(monkeypatch):
    # Ensure thresholds from env are used
    monkeypatch.setenv("PHOBERT_BLOCK_THRESHOLD", "0.9")
    monkeypatch.setenv("PHOBERT_WARN_THRESHOLD", "0.8")
    # reload config module to pick up env changes
    import importlib
    import app.core.config as cmod
    importlib.reload(cmod)
    assert float(cmod.cfg.PHOBERT_BLOCK_THRESHOLD) == 0.9
    assert float(cmod.cfg.PHOBERT_WARN_THRESHOLD) == 0.8
