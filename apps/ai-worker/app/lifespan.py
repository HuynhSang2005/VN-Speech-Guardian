from contextlib import asynccontextmanager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # TODO(P14): nạp model thật ở đây (faster-whisper, PhoBERT)
    app.state.models = {
        "whisper": None,
        "phobert": None,
    }
    yield
    # cleanup nếu cần
