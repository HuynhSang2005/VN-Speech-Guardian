from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from .lifespan import lifespan
from .routers.asr import router as asr_router
from .routers.moderation import router as mod_router
from .core.config import cfg
from pathlib import Path
import os
import logging
import time

# Thiết lập logging cơ bản (dùng cho dev). Thông điệp bằng tiếng Việt để dev VN dễ hiểu.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai-worker")


def create_app() -> FastAPI:
    logger.info("Khởi tạo ứng dụng VN Speech Guardian AI (MVP)")
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

    # Middleware: logging các request và thu thập metrics nếu có
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()
        try:
            response = await call_next(request)
            status = response.status_code
        except Exception as exc:  # let exception handler manage the response
            status = 500
            raise
        finally:
            elapsed = time.time() - start
            logger.info(f"Yêu cầu {request.method} {request.url.path} -> {status} (thời gian: {elapsed:.3f}s)")
            # Nếu metrics được bật trong app.state, cập nhật
            metrics = getattr(app.state, "metrics", None)
            if metrics:
                try:
                    metrics["request_count"].labels(method=request.method, path=request.url.path, status=str(status)).inc()
                    metrics["request_latency"].labels(method=request.method, path=request.url.path).observe(elapsed)
                except Exception:
                    logger.debug("Không thể cập nhật metrics")
        return response

    # Global exception handler: log chi tiết bằng tiếng Việt
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Lỗi không mong muốn khi xử lý {request.method} {request.url.path}: {exc}")
        metrics = getattr(app.state, "metrics", None)
        if metrics:
            try:
                metrics["exceptions_count"].inc()
            except Exception:
                pass
        return JSONResponse(status_code=500, content={"detail": "Lỗi nội bộ máy chủ. Vui lòng liên hệ admin."})

    # /metrics: xuất Prometheus metrics nếu thư viện có sẵn và metrics được khởi tạo
    @app.get("/metrics")
    async def metrics_endpoint():
        metrics = getattr(app.state, "metrics", None)
        if not metrics:
            return PlainTextResponse("Metrics chưa được bật trên service này.", status_code=501)
        try:
            # import lazy để tránh bắt buộc dependency khi chạy tests nhẹ
            from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

            return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
        except Exception as e:
            logger.exception("Không thể sinh metrics Prometheus: %s", e)
            return PlainTextResponse("Lỗi khi sinh metrics", status_code=500)

    app.include_router(asr_router)
    app.include_router(mod_router)
    # Khởi tạo các metric cơ bản (nếu prometheus_client có sẵn). Việc này làm lazy import.
    try:
        from prometheus_client import Counter, Histogram

        app.state.metrics = {
            "request_count": Counter("vsg_request_count", "Số lượng request", ["method", "path", "status"]),
            "request_latency": Histogram("vsg_request_latency_seconds", "Thời gian xử lý request", ["method", "path"]),
            "exceptions_count": Counter("vsg_exceptions_total", "Số lỗi không mong muốn"),
        }
        logger.info("Metrics Prometheus đã khởi tạo")
    except Exception:
        app.state.metrics = None
        logger.info("Prometheus metrics không khả dụng (package có thể chưa được cài). Tiếp tục khởi chạy mà không có metrics")
    return app


app = create_app()
