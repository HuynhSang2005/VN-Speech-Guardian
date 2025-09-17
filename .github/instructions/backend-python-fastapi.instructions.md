---
applyTo: "apps/ai-worker/**/*"
---


# Backend Python FastAPI AI – Instructions (cập nhật)
**Mục tiêu:** FastAPI cung cấp hai endpoint chính (ASR streaming + Moderation). Tài liệu này mô tả cách cài đặt, biến môi trường, hai luồng inference (PyTorch / ONNXRuntime), và cách tích hợp an toàn với Gateway.

---

## 1) Phạm vi MVP

- Suy luận online (no job queue). Huấn luyện/fine-tune PhoBERT làm offline.
- Triển khai CPU-first; GPU tùy chọn khi cần.

---

## 2) Cài đặt nhanh (dev)

```powershell
# Windows PowerShell / pwsh
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -U pip
pip install -U fastapi "uvicorn[standard]" python-multipart orjson
pip install -U faster-whisper ffmpeg-python
pip install -U transformers
# optional for ONNX export/runtime
pip install -U onnx onnxruntime-optimum optimum
```

Yêu cầu: `ffmpeg` có trong PATH.

---

## 3) Biến môi trường (.env) — mẫu

```
APP_HOST=0.0.0.0
APP_PORT=8001
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GATEWAY_API_KEY=dev-secret

# ASR
ASR_MODEL_NAME=small
ASR_DEVICE=cpu
ASR_LANGUAGE=vi
ASR_BEAM_SIZE=5

# PhoBERT
PHOBERT_CHECKPOINT_DIR=./models-and-dataset/phobert-base
PHOBERT_ONNX_DIR=./app/models/bert-finetuned-onnx
USE_ONNXRUNTIME=true
PHOBERT_BLOCK_THRESHOLD=0.85
PHOBERT_WARN_THRESHOLD=0.6
MOD_LABELS_JSON={"safe":0,"warn":1,"block":2}
TEXT_MAX_LEN=256
```

Giải thích nhanh:
- `USE_ONNXRUNTIME`: bật ONNXRuntime nếu có `PHOBERT_ONNX_DIR/model.onnx`.
- `PHOBERT_BLOCK_THRESHOLD`, `PHOBERT_WARN_THRESHOLD`: thresholds (0..1) để map softmax → label; tune dễ bằng env.

---

## 4) Cấu trúc & files quan trọng (repo)

```
apps/ai-worker/
  app/
    core/config.py       # đọc env, thresholds, API_KEY
    lifespan.py          # load model(s) on startup
    routers/asr.py
    routers/moderation.py
    services/asr_service.py
    services/bert_service.py
    models/bert-finetuned-onnx/  # optional: nếu có ONNX
  tools/
    export_onnx_phobert.py
    smoke_ort_infer.py
  tests/
```

---

## 5) Hợp đồng API (tóm tắt)

Health
- `GET /healthz` → `{ "status": "ok" }` hoặc `/readyz` để check model readiness.

ASR
- `POST /asr/stream` (application/octet-stream)
- Headers: `x-session-id` (bắt buộc), `x-chunk-seq?`, `x-final?`, `x-api-key` (bắt buộc)

Moderation
- `POST /moderation` (application/json)
- Headers: `x-api-key` (bắt buộc)
- Body: `{ "inputs": ["...","..."] }`

Response mẫu moderation:

```json
{ "results": [ {"label":"safe","score":0.98} ] }
```

---

## 6) Mẫu mã / snippets (quick)

`app/core/config.py` (tóm tắt): đọc `GATEWAY_API_KEY`, `PHOBERT_*` và thresholds.

`app/services/bert_service.py` (behavior):
- Khi `USE_ONNXRUNTIME` và `PHOBERT_ONNX_DIR/model.onnx` tồn tại → khởi tạo ONNX InferenceSession
- Ngược lại load PyTorch checkpoint từ `PHOBERT_CHECKPOINT_DIR`
- Sau predict, áp dụng `PHOBERT_BLOCK_THRESHOLD`/`PHOBERT_WARN_THRESHOLD` để map probs → `block|warn|safe`
- Có fallback `_heuristic()` (keyword overrides) khi model không khả dụng

`app/routers/moderation.py` bảo vệ bằng dependency `auth(x_api_key: str | None = Header(None))` so sánh với `cfg.API_KEY`.

---

## 7) Tools & scripts

- `tools/export_onnx_phobert.py` — exporter HF checkpoint → ONNX
- `tools/smoke_ort_infer.py` — smoke-test ONNXRuntime
- `scripts/setup_ai_worker.ps1` & `scripts/setup_ai_worker.sh` — thiết lập môi trường dev

---

## 8) Tích hợp với Gateway

- Gateway: set env `AI_SERVICE_BASE_URL` và `GATEWAY_API_KEY`.
- Khi gọi AI Worker, Gateway phải gửi header `x-api-key: <GATEWAY_API_KEY>`.
- Nếu cần logging/audit, forward `x-user-id` hoặc `x-request-id` (không dùng để xác thực).

---

## 9) Chạy thử & smoke tests

Ví dụ local:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8001
# ASR (test):
curl -H "x-api-key: dev-secret" --data-binary @sample.raw -H "Content-Type: application/octet-stream" http://localhost:8001/asr/stream
# Moderation:
curl -H "x-api-key: dev-secret" -H "Content-Type: application/json" -d '{"inputs":["câu lịch sự","câu tiêu cực"]}' http://localhost:8001/moderation
```

---

## 10) Vận hành & troubleshooting

- Nếu model chưa sẵn sàng, `/readyz` báo phobert_loaded=false và `/moderation` trả 503.
- Nếu ONNX lỗi: log rõ ràng, fallback sang PyTorch nếu có.
- Kiểm tra `tools/smoke_ort_infer.py` để xác định ONNXRuntime compatibility.

---

Ghi chú: giữ file này tiếng Việt để dễ bảo trì cho team VN.