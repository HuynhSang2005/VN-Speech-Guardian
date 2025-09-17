# Hướng dẫn sử dụng AI Worker

1) Biến môi trường quan trọng
- `GATEWAY_API_KEY` - API key cho gateway (mặc định `dev-secret` trong dev)
- `PHOBERT_CHECKPOINT_DIR` - nơi chứa checkpoint phobert fine-tuned (tuỳ chọn)
- `PHOBERT_ONNX_DIR` - nơi chứa ONNX model (nếu đã export)
- `USE_ONNXRUNTIME` - `true` để dùng ONNX Runtime
- `AI_LOAD_MODELS` - `true` để tự load models lúc startup

2) Endpoints chính
- `GET /readyz` - kiểm tra readiness (trả `phobert_loaded`, `phobert_dir`, ...)
- `POST /asr/stream` - gửi chunk PCM16LE 16kHz, headers:
  - `x-session-id`: session id (bắt buộc)
  - `x-chunk-seq`: sequence (tuỳ chọn)
  - `x-final`: true nếu chunk cuối
  - Body: application/octet-stream (raw PCM16LE)
  - Response: { status, partial?, final?, detections[] }
- `POST /moderation` - nhận JSON `{"inputs": ["câu 1","câu 2"]}` trả `results` array

3) Ví dụ curl (moderation)

```bash
curl -H "x-api-key: dev-secret" -H "Content-Type: application/json" \
  -d '{"inputs":["Xin chào","Đồ ngu quá"]}' http://localhost:8001/moderation
```

4) Giải thích score & tuning

- `score` là xác suất do model dự đoán (0..1). Việc mapping `score` → `label` (safe/warn/block) phụ thuộc threshold bạn chọn.
- Gợi ý thresholds (không bắt buộc):
  - score >= 0.6 → `block`
  - 0.4 <= score < 0.6 → `warn`
  - score < 0.4 → `safe`

  Bạn có thể điều chỉnh thresholds dựa trên dataset/false-positive tolerance.

5) Hysteresis (giảm nhấp nháy detection trong real-time)

- Để tránh nhấp nháy detection khi audio/ASR có lỗi, áp dụng hysteresis trên sequence event:
  - Chuyển sang `toxic` nếu `block` xuất hiện >= 2 lần liên tiếp
  - Chuyển về `clean` nếu `safe` xuất hiện >= 3 lần liên tiếp

6) Tuning env

- `ASR_BEAM_SIZE` — beam size cho faster-whisper (mặc định 5). Thấp = nhanh hơn nhưng có thể kém chính xác.
- `PHOBERT_ONNX_DIR` — đường dẫn tới ONNX model nếu dùng ORT.
- `USE_ONNXRUNTIME` — `true` để bật ONNXRuntime path.

