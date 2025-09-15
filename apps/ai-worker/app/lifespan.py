from contextlib import asynccontextmanager
from fastapi import FastAPI
from .core.config import cfg


def _load_models():  # pragma: no cover - nặng, không chạy trong unit test
    whisper_model = None
    phobert = None
    try:
        from faster_whisper import WhisperModel  # type: ignore

        whisper_model = WhisperModel(
            cfg.ASR_NAME,
            device=cfg.ASR_DEVICE,
            compute_type=cfg.ASR_COMPUTE_TYPE,
        )
    except Exception:
        whisper_model = None

    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore

        tokenizer = AutoTokenizer.from_pretrained(cfg.PHOBERT_DIR, local_files_only=True)
        model = AutoModelForSequenceClassification.from_pretrained(cfg.PHOBERT_DIR, local_files_only=True)
        model.eval()
        phobert = {"tokenizer": tokenizer, "model": model}
    except Exception:
        phobert = None
    return whisper_model, phobert


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nạp model thật nếu được bật qua env để giữ test nhanh
    whisper_model = None
    phobert = None
    if cfg.AI_LOAD_MODELS:
        whisper_model, phobert = _load_models()

    app.state.models = {"whisper": whisper_model, "phobert": phobert}
    yield
    # cleanup nếu cần
