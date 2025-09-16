from fastapi import APIRouter, Header, HTTPException, Request, Depends
from ..core.security import verify_api_key
from ..services.asr_service import transcribe_bytes
from ..schemas.asr_schema import ASRResponse
from ..core.config import cfg
from ..services.bert_service import predict as predict_mod
import time
import numpy as np  # type: ignore

router = APIRouter(tags=["asr"])


@router.post("/asr/stream", response_model=ASRResponse, response_model_exclude_none=True)
async def asr_stream(
    request: Request,
    x_session_id: str | None = Header(None),
    x_chunk_seq: int | None = Header(None),
    x_final: bool | None = Header(None),
    _=Depends(verify_api_key),
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="missing x-session-id")

    # Simple per-session rate limit (in-memory)
    import os
    try:
        min_interval = int(os.getenv("ASR_MIN_INTERVAL_MS", str(cfg.ASR_MIN_INTERVAL_MS)))
    except Exception:
        min_interval = cfg.ASR_MIN_INTERVAL_MS
    if min_interval > 0:
        now_ms = int(time.time() * 1000)
        if not hasattr(request.app.state, "_asr_rl"):  # pragma: no cover - trivial state init
            request.app.state._asr_rl = {}
        last = request.app.state._asr_rl.get(x_session_id)
        if last and now_ms - last < min_interval:
            raise HTTPException(status_code=429, detail="too many chunks")
        request.app.state._asr_rl[x_session_id] = now_ms

    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="empty body")

    # Validate PCM16LE length (multiple of 2 bytes)
    if len(data) % 2 != 0:
        raise HTTPException(status_code=400, detail="malformed PCM16LE")

    # Lấy model whisper nếu đã nạp (AI_LOAD_MODELS=true)
    model = getattr(request.app.state, "models", {}).get("whisper", None) if hasattr(request.app.state, "models") else None
    res = transcribe_bytes(data, model=model)

    # Optional moderation integrated in ASR response
    detections = []
    if cfg.ASR_RUN_MOD:
        text_for_mod = res.get("text", "").strip()
        if text_for_mod:
            phobert = getattr(request.app.state, "models", {}).get("phobert") if hasattr(request.app.state, "models") else None
            mod_out = predict_mod([text_for_mod], phobert)
            # Map to forward-protocol detections (use entire chunk time if available)
            # We don't have exact ms here; set None or 0; gateway will apply hysteresis over snippets.
            for d in mod_out:
                detections.append({
                    "label": d.get("label", "safe"),
                    "score": float(d.get("score", 0.0)),
                    "startMs": 0,
                    "endMs": 0,
                    "snippet": text_for_mod[:100],
                })

    payload: dict = {"status": "ok", "detections": detections}
    # If final flag provided/true → pack into final; else partial (for future UI)
    if x_final:
        payload["final"] = {"text": res.get("text", ""), "words": []}
    else:
        payload["partial"] = {"text": res.get("text", "")}
    return payload
