from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from ..core.security import verify_api_key
from ..services.bert_service import predict


class ModerationInput(BaseModel):
    inputs: list[str] = Field(min_length=1)


router = APIRouter(tags=["moderation"])


@router.post("/moderation")
def moderation(body: ModerationInput, _=Depends(verify_api_key)):
    results = predict(body.inputs)
    return {"results": results}
