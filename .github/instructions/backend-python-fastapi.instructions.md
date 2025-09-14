## B. BACKEND-PYTHON-FASTAPI.INSTRUCTIONS  

---
applyTo: "apps/ai-worker/**/*"
---

# Backend Python FastAPI AI – Instructions

## 1. Vai trò & Mục tiêu
- **Dịch vụ AI độc lập**: **VAD → STT → Moderation**, **không lưu audio**, **chỉ trả kết quả**.
- **Load model 1 lần** trong lifespan – **không gọi Internet trong runtime**.
- **Chấp nhận** 1-3 kết nối WebSocket đồng thời → **CPU tối đa 70 %**.

## 2. Tech version – **ổn định**
- Python 3.11.9
- fastapi 0.114.0
- uvicorn 0.30.6
- python-socketio 5.11.1
- faster-whisper 1.0.3
- transformers 4.40.0 (load PhoBERT PyTorch)
- onnxruntime **KHÔNG cần** – dùng transformers luôn
- pytest 8.3.3
- ruff 0.6.5

## 3. Folder detail

```bash
apps/ai-worker/
├─ src/
│  ├─ main.py
│  ├─ lifespan.py
│  ├─ streaming.py
│  ├─ asr_engine.py
│  ├─ moderation.py
│  ├─ vad.py
│  └─ utils/
├─ tests/
├─ models/             # whisper-base + phobert-base (PyTorch)
├─ requirements.txt
└─ Dockerfile

```


## 4. API contract – **WebSocket native**
- Path: `ws://localhost:8001/ws`
- Client gửi: `AudioChunk` (Pydantic, bytes)
- Server emit:
  - `{ "type": "partial", "text": "..." }`
  - `{ "type": "final", "text": "...", "words": [...] }`
  - `{ "type": "detection", "label": "OFFENSIVE", "score": 0.87, "snippet": "..." }`
- Lỗi: `{ "type": "error", "code": "VSG-ASR-001", "message": "..." }`

## 5. Logger – **structlog JSON**
- Mỗi message có `request_id`, `user_id`
- Format: `{"event": "detection", "label": "OFFENSIVE", "score": 0.87, "user_id": "usr_123"}`

## 6.Throw lỗi – **WebSocket native**
```python
raise WebSocketException(code=1008, reason="VSG-ASR-002|Audio quá dài")
```

## 7. Research tip – **liên tục**
- Liên tục research internet khi code.
- Khi cần tăng TPS → search "faster-whisper beam size site:github.com"
- Paste link vào comment trên đoạn code.
```
