from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from ..core.security import verify_api_key
from ..services.bert_service import predict


class ModerationInput(BaseModel):
    inputs: list[str] = Field(min_length=1)


router = APIRouter(tags=["moderation"])


@router.post("/moderation")
async def moderation(body: ModerationInput, request: Request, _=Depends(verify_api_key)):
    # Lấy model phobert từ app.state nếu đã nạp qua lifespan
    models = getattr(request.app.state, "models", {}) if hasattr(request.app.state, "models") else {}
    phobert_model = models.get("phobert", None) if isinstance(models, dict) else None
    results = predict(body.inputs, phobert=phobert_model)
    return {"results": results}
