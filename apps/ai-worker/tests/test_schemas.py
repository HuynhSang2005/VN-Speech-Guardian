from app.schemas.asr_schema import ASRResponse, ASRFinal
from app.schemas.moderation_schema import ModerationResponse, ModerationResult


def test_schema_models_construct():
    asr = ASRResponse(final=ASRFinal(text="hi"))
    assert asr.final and asr.final.text == "hi"
    mod = ModerationResponse(results=[ModerationResult(label="safe", score=0.99)])
    assert mod.results[0].label == "safe"
