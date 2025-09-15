def transcribe_bytes(data: bytes) -> dict:
    # Stub: giả lập transcript ngắn để test
    length = len(data)
    text = "xin chao" if length > 0 else ""
    return {"text": text, "segments": [{"start": 0.0, "end": 0.5, "text": text}]}
