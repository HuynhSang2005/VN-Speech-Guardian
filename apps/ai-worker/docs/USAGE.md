# Hướng dẫn sử dụng AI Worker (ngắn gọn)

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
