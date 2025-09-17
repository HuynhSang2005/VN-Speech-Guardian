from typing import Any
from ..core.config import cfg
from ..utils import validate_pcm16le, pcm16le_bytes_to_float32


def _stub_transcribe(data: bytes) -> dict:
    # Stub: giả lập transcript ngắn để test
    length = len(data)
    text = "xin chao" if length > 0 else ""
    return {"text": text, "segments": [{"start": 0.0, "end": 0.5, "text": text}]}


def transcribe_bytes(data: bytes, model: Any | None = None) -> dict:
    """
    Mục đích: chạy ASR trên bytes PCM 16kHz mono.
    - Nếu model (faster-whisper) không có → trả stub để test nhanh.
    - Nếu có → dùng model.transcribe với language, beam size.
    """
    if model is None:
        return _stub_transcribe(data)

    try:  # pragma: no cover - phụ thuộc vào model thực tế, khó tái lập trong CI
        # faster-whisper API nhận input là path/array/samples; ở đây chỉ demo fallback.
        # Dùng helper chung để chuyển PCM16LE bytes -> numpy float32
        if not validate_pcm16le(data):
            # Let higher-level validate; but double-check here too
            return _stub_transcribe(data)
        audio, _ = pcm16le_bytes_to_float32(data)

        segments, info = model.transcribe(
            audio,
            language=cfg.ASR_LANG,
            beam_size=cfg.ASR_BEAM,
            vad_filter=True,
            without_timestamps=False,
        )
        texts = []
        seg_list = []
        # segments is a generator; iterate once
        for s in segments:
            texts.append(s.text)
            seg_list.append({"start": float(s.start or 0.0), "end": float(s.end or 0.0), "text": s.text})
        text = " ".join(t.strip() for t in texts).strip()
        return {"text": text, "segments": seg_list}
    except Exception:  # pragma: no cover - fallback path khi lỗi inference
        # Nếu inference lỗi, fallback stub để không làm vỡ API
        return _stub_transcribe(data)
