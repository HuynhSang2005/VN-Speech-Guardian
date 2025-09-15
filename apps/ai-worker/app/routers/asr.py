from fastapi import APIRouter, Header, HTTPException, Request, Depends
from ..core.security import verify_api_key
from ..services.asr_service import transcribe_bytes
from ..schemas.asr_schema import ASRResponse

router = APIRouter(tags=["asr"])


@router.post("/asr/stream", response_model=ASRResponse)
async def asr_stream(
    request: Request,
    x_session_id: str | None = Header(None),
    _=Depends(verify_api_key),
):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="missing x-session-id")
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail="empty body")
    # Lấy model whisper nếu đã nạp (AI_LOAD_MODELS=true)
    model = getattr(request.app.state, "models", {}).get("whisper", None) if hasattr(request.app.state, "models") else None
    res = transcribe_bytes(data, model=model)
    return {"status": "ok", "final": {"text": res["text"], "words": []}, "detections": []}
