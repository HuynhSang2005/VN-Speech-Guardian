
# ai-service.instructions.md

**Mục tiêu:** Hướng dẫn chi tiết cho dev/DevOps về cách chuẩn bị dữ liệu, fine‑tune PhoBERT offline, export sang ONNX (tùy chọn) và cách deploy / tích hợp suy luận trong `apps/ai-worker` (FastAPI).

Các điểm cập nhật quan trọng:
- Hỗ trợ hai đường suy luận: PyTorch (checkpoint) hoặc ONNXRuntime (`model.onnx`). ONNX ưu tiên cho CPU production.
- Có sẵn script export (tools/export_onnx_phobert.py) và smoke-test (tools/smoke_ort_infer.py).

---

## 1) Chuẩn dữ liệu

- Bắt buộc các cột: `text`, `label`
- Nhãn dùng map: `{"safe":0,"warn":1,"block":2}`

Ví dụ CSV (2 cột):

```csv
text,label
"Xin chào bạn",safe
"Nội dung dễ gây tổn thương",warn
"Rất tục tĩu",block
```

---

## 2) Fine‑tune PhoBERT (offline)

Bạn có thể dùng checkpoint có sẵn để chạy inference nhanh. Nếu cần cải thiện chất lượng, fine‑tune offline bằng HuggingFace Trainer. Mã ví dụ (ngắn gọn):

```python
# ... giống phần trước, dùng Trainer để fine-tune, save vào OUTDIR
```

Chạy (env Unix/Windows tương tự):

```bash
pip install -U transformers datasets scikit-learn accelerate evaluate
python train_phobert.py
# OUTDIR sẽ chứa config.json, tokenizer.*, pytorch_model.bin...
```

---

## 3) Export ONNX (tùy chọn, khuyến nghị cho CPU)

- Script `apps/ai-worker/tools/export_onnx_phobert.py` đã được chuẩn hóa để xuất model sang ONNX (torch checkpoint → model.onnx).
- Sau khi export, đặt ONNX vào `apps/ai-worker/app/models/bert-finetuned-onnx/` (chứa `model.onnx` và tokenizer files).
- Kiểm tra bằng `apps/ai-worker/tools/smoke_ort_infer.py`.

Lưu ý: ONNX export có thể yêu cầu `optimum` hoặc `onnxruntime-tools` tùy phiên bản; check script để biết các tuỳ chọn.

---

## 4) Cấu hình runtime (env vars)

Thêm vào `.env` / config runtime:

```
APP_HOST=0.0.0.0
APP_PORT=8001
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GATEWAY_API_KEY=dev-secret

# Whisper
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

- `USE_ONNXRUNTIME`: nếu `true` và `PHOBERT_ONNX_DIR/model.onnx` tồn tại thì service dùng ONNXRuntime.
- `PHOBERT_BLOCK_THRESHOLD`, `PHOBERT_WARN_THRESHOLD`: thresholds để mapping probability → label; dễ tune qua env.

---

## 5) Tích hợp với Gateway

- Gateway phải set header `x-api-key: <GATEWAY_API_KEY>` cho mọi request tới AI Worker.
- Gateway có thể forward `x-user-id` / `x-request-id` cho mục đích logging/audit; AI Worker không dùng những header này để xác thực.

Ví dụ gọi moderation từ Gateway (Node.js / axios):

```ts
const AI_BASE = process.env.AI_SERVICE_BASE_URL;
const KEY = process.env.GATEWAY_API_KEY;
await axios.post(`${AI_BASE}/moderation`, { inputs }, { headers: { 'x-api-key': KEY }});
```

---

## 6) Tools & scripts

- `apps/ai-worker/tools/export_onnx_phobert.py` — export checkpoint → ONNX
- `apps/ai-worker/tools/smoke_ort_infer.py` — quick smoke test ONNXRuntime
- `scripts/setup_ai_worker.ps1` & `scripts/setup_ai_worker.sh` — thiết lập môi trường dev (venv + pip install)

---

## 7) Vận hành và Troubleshooting

- Nếu model chưa sẵn sàng, `/readyz` hoặc `/healthz` sẽ báo `phobert_loaded=false` và `/moderation` trả 503.
- Nếu ONNX export lỗi, fallback sang PyTorch nếu `PHOBERT_CHECKPOINT_DIR` tồn tại.
- Đặt models >100MB vào Git LFS hoặc host bên ngoài.

---

Ghi chú: giữ tài liệu này tiếng Việt để dev team VN dễ đọc; nếu cần phiên bản tiếng Anh, tôi có thể xuất sang `docs/EN/`.
