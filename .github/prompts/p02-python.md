# PHASE 2 – FASTAPI AI WORKER

| Task    | Mô tả chi tiết                                                                                                | Check |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| **P13** | Tạo FastAPI project trong `apps/ai-worker`, cài deps (fastapi, "uvicorn[standard]", faster-whisper, transformers, torch, pytest, httpx, anyio, optimum[onnxruntime], onnxruntime, onnx) | ☑     |
| **P14** | Viết **lifespan.py** – load Whisper (`ASR_MODEL_NAME=small`) + PhoBERT từ `PHOBERT_CHECKPOINT_DIR` (HF) hoặc `PHOBERT_ONNX_DIR` (ORT nếu `USE_ONNXRUNTIME=true`) | ☑     |
| **P15** | Cấu hình env `.env`: `PHOBERT_CHECKPOINT_DIR=./models/phobert-hsd`, `PHOBERT_ONNX_DIR=./models/bert-finetuned-onnx`, `USE_ONNXRUNTIME=true`, `ASR_MODEL_NAME=small`, `ASR_LANGUAGE=vi`, `GATEWAY_API_KEY=dev-secret`, `AI_LOAD_MODELS=true` | ☑     |
| **P16** | Tạo **REST** `POST /asr/stream` nhận `application/octet-stream` (PCM16LE 16kHz mono) và trả `status/partial/final/detections` | ☑     |
| **P17** | Tạo **REST health** `/healthz` và `/readyz` (check model loaded, dir exists) | ☑     |
| **P18** | Viết **pytest** – mock models, test `/healthz`, `/moderation`, `/asr/stream` (tiny bytes), coverage > 85% | ☑     |
| **P19** | Viết **Dockerfile** multi-stage; mount/copy `app/models/*` vào image (phobert-hsd + bert-finetuned-onnx); build với `docker compose up --build` | ☑     |
| **P20** | Viết **tools/export_onnx_phobert.py** – export HF checkpoint (phobert-hsd) sang ONNX (opset 17) để tối ưu inference | ☑     |
| **P21** | Viết **tools/sanity_check_phobert.py** – test load HF model và predict mẫu để verify checkpoint | ☑     |
| **P22** | Viết **tools/smoke_ort_infer.py** – test direct ORT inference với ONNX model, CLI --onnx-dir | ☑     |
| **P23** | Viết **tools/e2e_moderation_ort.py** – E2E test FastAPI với ORT path, CLI --onnx-dir | ☑     |
| **P24** | Cập nhật **docker-compose.yml** – thêm service ai-worker với env ORT, volumes bind models, healthcheck /readyz | ☑     |
| **P25** | Chạy export ONNX từ phobert-hsd, smoke/E2E ORT, pytest full suite để validate end-to-end | ☑     |
| **P26** | Tích hợp **bert_service.py** – ưu tiên id2label từ model.config, fallback env, hỗ trợ ORT/HF | ☑     |
