from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .lifespan import lifespan
from .routers.asr import router as asr_router
from .routers.moderation import router as mod_router


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

    app.include_router(asr_router)
    app.include_router(mod_router)
    return app


app = create_app()
