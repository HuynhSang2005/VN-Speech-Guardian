from pydantic import BaseModel


class ModerationInput(BaseModel):
    inputs: list[str]


class ModerationResult(BaseModel):
    label: str
    score: float


class ModerationResponse(BaseModel):
    results: list[ModerationResult]
