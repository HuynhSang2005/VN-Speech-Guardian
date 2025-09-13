
### `.github/instructions/ai-service.instructions.md`
```markdown
---
applyTo: "apps/asr-fastapi/**/*"
---

# FastAPI AI Service Guidelines

## 1. File naming
- router:          streaming.py
- business:        vad.py, asr_engine.py, moderation.py
- test:            tests/unit/test_*.py

## 2. Logic rules
- Mọi model load 1 lần trong lifespan – không load lại mỗi request
- Whisper: beam=1, best_of=1, temperature=0, compute_type=int8
- Moderation: window 2 s, step 0.5 s, dedupe hash, hysteresis 2→toxic, 3→clean
- Không lưu audio thô – chỉ trả text + timestamps

## 3. Code mẫu
```python
# vi: cắt đoạn speech bằng Silero VAD
def aggregate_chunks(
    pcm16: np.ndarray,
    sample_rate: int = 16_000,
    min_speech_ms: float = 800,
) -> List[SpeechSegment]:
    ...
```
## 4. Test
- pytest asyncio, dùng fixture model session scope
- e2e: WAV mẫu 5 s → assert final text & detection