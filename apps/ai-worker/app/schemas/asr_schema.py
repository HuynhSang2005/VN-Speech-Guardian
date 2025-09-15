from pydantic import BaseModel


class ASRPartial(BaseModel):
    text: str


class ASRFinal(BaseModel):
    text: str
    words: list[str] = []


class ASRResponse(BaseModel):
    status: str = "ok"
    partial: ASRPartial | None = None
    final: ASRFinal | None = None
    detections: list[dict] = []
