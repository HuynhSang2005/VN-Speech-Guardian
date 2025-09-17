# AI Worker - VN Speech Guardian

Ứng dụng FastAPI nhỏ chuyên phục vụ các tác vụ AI cho dự án VN-Speech-Guardian:
- ASR (faster-whisper) streaming
- Moderation (PhoBERT fine-tuned / ONNX runtime)

Mục tiêu:
- Dễ chạy local cho dev mới
- Hỗ trợ inference CPU nhanh (ONNX) và fallback heuristic
- Dễ mở rộng và deploy bằng Docker

Thư mục quan trọng:
- `app/` - mã nguồn FastAPI
- `app/models/` - nơi chứa tokenizer / model checkpoints (chỉ giữ `phobert-hsd` trong repo)
- `app/datasets/` - dataset mẫu (ViHSD)
- `tools/` - scripts: train, export_onnx, benchmarks, e2e tests
- `docs/` - tài liệu dev & vận hành

Xem thêm hướng dẫn chi tiết trong `apps/ai-worker/docs/`.
# AI Worker (FastAPI)

Endpoints:
- GET /healthz
- GET /readyz
- POST /asr/stream (application/octet-stream)
- POST /moderation

Env:
- GATEWAY_API_KEY (default: dev-secret)
- ASR_MODEL_NAME (default: small), ASR_LANGUAGE (vi)
- ASR_DEVICE (cpu|auto), ASR_COMPUTE_TYPE (int8|float32), ASR_SAMPLE_RATE (16000)
- PHOBERT_CHECKPOINT_DIR (default: ./models-and-dataset/phobert-base)
- AI_LOAD_MODELS (default: false) -> set to true to load real models on startup

Run locally:
1) Create venv and install requirements
2) uvicorn app.main:app --reload --port 8001

Tests:
- pytest (coverage >=85%)
Lint:
- ruff check apps/ai-worker/app
- ruff format apps/ai-worker/app (optional)

---

ASR streaming contract (Forward protocol)

- Endpoint: POST /asr/stream
- Content-Type: application/octet-stream
- Required headers:
	- x-session-id: string
- Optional headers:
	- x-chunk-seq: number (ordering hint)
	- x-final: boolean (mark last chunk)
- Body: raw PCM16LE 16kHz mono bytes
- Success response (200):
	{
		"status": "ok",
		"partial": { "text": "..." } | "final": { "text": "...", "words": [] },
		"detections": [ { "label":"OFFENSIVE", "score":0.92, "startMs":0, "endMs":0, "snippet":"..." } ]
	}
- Errors:
	- 400: missing x-session-id, empty body, or malformed PCM16LE
	- 429: too many chunks (per-session rate limit); tune via ASR_MIN_INTERVAL_MS
	- 401: invalid x-api-key

Notes:
- Set ASR_MIN_INTERVAL_MS to control per-session cadence; 0 disables it.
- Set ASR_RUN_MOD=true to include moderation detections inline.
- Language and beam size are controlled by ASR_LANGUAGE and ASR_BEAM_SIZE.
```markdown
# AI Worker - VN Speech Guardian

Ứng dụng FastAPI (ai-worker) chịu trách nhiệm cho các tác vụ AI tách biệt khỏi Gateway:
- ASR (speech-to-text) real-time bằng `faster-whisper`
- Moderation (phân loại câu bằng PhoBERT / ONNXRuntime)

Mục tiêu:
- Chạy nhanh trên CPU (ONNX) cho inference tại runtime
- Có fallback heuristic khi model không có
- Dễ chạy local và dễ đóng gói Docker

Thư mục chính:
- `app/` – mã nguồn FastAPI
- `app/models/` – tokenizer và checkpoints (repo giữ `phobert-hsd` để dev nhanh)
- `tools/` – scripts: train, export_onnx, smoke tests, benchmarks
- `docs/` – tài liệu cài đặt, huấn luyện và vận hành

Xem chi tiết trong `apps/ai-worker/docs/` (DEV_SETUP.md, API_SCHEMA.md, FINETUNE_PHOBERT.md, USAGE.md)

Quick start (dev)
1) Tạo venv và cài dependencies

PowerShell:

```powershell
cd apps/ai-worker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Bash (Linux / macOS):

```bash
cd apps/ai-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Chạy server dev

```powershell
python -m uvicorn app.main:create_app --host 0.0.0.0 --port 8001 --reload
```

3) Tests & lint

```powershell
python -m pytest --cov=. --cov-report=term-missing
ruff check app || true
```

ASR contract (tóm tắt)
- POST `/asr/stream` `application/octet-stream` (body: PCM16LE 16kHz mono)
- Headers: `x-session-id` (bắt buộc), `x-chunk-seq` (tuỳ), `x-final` (tuỳ), `x-api-key` (bảo mật)
- Response: JSON với `partial` hoặc `final` transcript và `detections` (mảng)

Moderation
- POST `/moderation` với body `{ "inputs": ["câu 1", "câu 2"] }`
- Response: `{ "results": [ {"label":"safe|warn|block","score":0.98} ] }`

ONNX & production notes
- Để dùng ONNXRuntime cho PhoBERT (CPU), export model sang ONNX và đặt `PHOBERT_ONNX_DIR` trỏ tới thư mục chứa `model.onnx`.
- Đặt env `USE_ONNXRUNTIME=true` và `AI_LOAD_MODELS=true` trước khi khởi động để service load ONNX session.

LLưu ý về model files
- Không commit các file `model.onnx` lớn vào git. Dùng Git LFS, artifacts server, hoặc lưu ngoài repo.

Tham khảo docs trong `apps/ai-worker/docs/` để biết các lệnh export, huấn luyện, và cấu hình chi tiết.

```
