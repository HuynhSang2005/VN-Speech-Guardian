from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .lifespan import lifespan
from .routers.asr import router as asr_router
from .routers.moderation import router as mod_router
from .core.config import cfg
from pathlib import Path
import os


def create_app() -> FastAPI:
    app = FastAPI(title="VN Speech Guardian AI (MVP)", lifespan=lifespan)
    # CORS cho dev
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    @app.get("/readyz")
    async def readyz():
        # Check PhoBERT readiness
        phobert_dir = os.getenv("PHOBERT_CHECKPOINT_DIR", cfg.PHOBERT_DIR)
        onnx_dir = os.getenv("PHOBERT_ONNX_DIR", cfg.PHOBERT_ONNX_DIR)
        phobert_dir_ok = bool(phobert_dir) and Path(phobert_dir).exists()
        onnx_dir_ok = bool(onnx_dir) and Path(onnx_dir).exists()
        models = getattr(app.state, "models", {}) if hasattr(app.state, "models") else {}
        phobert_loaded = False
        if isinstance(models, dict):
            m = models.get("phobert")
            if isinstance(m, dict) and (m.get("model") is not None or m.get("onnx_session") is not None):
                phobert_loaded = True
        return {
            "status": "ok" if (phobert_loaded or phobert_dir_ok or onnx_dir_ok) else "starting",
            "phobert_dir": phobert_dir_ok,
            "phobert_onnx_dir": onnx_dir_ok,
            "phobert_loaded": phobert_loaded,
        }

    app.include_router(asr_router)
    app.include_router(mod_router)
    return app


app = create_app()
