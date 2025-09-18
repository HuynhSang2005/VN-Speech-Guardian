from contextlib import asynccontextmanager
from fastapi import FastAPI
from .core.config import cfg
from pathlib import Path


def _load_models():  # pragma: no cover - nặng, không chạy trong unit test
    whisper_model = None
    phobert = None
    try:
        import logging
        logger = logging.getLogger("ai-worker.lifespan")
        logger.info("Bắt đầu nạp Whisper model (nếu có)")
        from faster_whisper import WhisperModel  # type: ignore

        whisper_model = WhisperModel(
            cfg.ASR_NAME,
            device=cfg.ASR_DEVICE,
            compute_type=cfg.ASR_COMPUTE_TYPE,
        )
        logger.info("Whisper model nạp xong")
    except Exception:
        whisper_model = None

    # PhoBERT: Prefer ONNXRuntime if enabled and model exists, else fall back to HF PyTorch
    try:
        logger.info("Bắt đầu nạp PhoBERT (onnx ưu tiên nếu bật)")
        if cfg.USE_ONNXRUNTIME and cfg.PHOBERT_ONNX_DIR and Path(cfg.PHOBERT_ONNX_DIR).exists():
            import onnxruntime as ort  # type: ignore
            from transformers import AutoTokenizer  # type: ignore

            tokenizer = AutoTokenizer.from_pretrained(cfg.PHOBERT_ONNX_DIR, local_files_only=True)
            session = ort.InferenceSession(str(Path(cfg.PHOBERT_ONNX_DIR) / "model.onnx"), providers=["CPUExecutionProvider"])  # noqa: E501
            phobert = {"tokenizer": tokenizer, "onnx_session": session}
            logger.info("PhoBERT (ONNX) nạp xong")
        else:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore

            tokenizer = AutoTokenizer.from_pretrained(cfg.PHOBERT_DIR, local_files_only=True)
            model = AutoModelForSequenceClassification.from_pretrained(cfg.PHOBERT_DIR, local_files_only=True)
            model.eval()
            phobert = {"tokenizer": tokenizer, "model": model}
            logger.info("PhoBERT (PyTorch HF) nạp xong")
    except Exception:
        logger.exception("Lỗi khi nạp PhoBERT")
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
