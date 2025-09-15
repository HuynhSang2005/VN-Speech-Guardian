# PHASE 2 – FASTAPI AI WORKER

| Task    | Mô tả chi tiết                                                                                                | Check |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| **P13** | Tạo FastAPI project trong `apps/ai-worker`, cài deps (fastapi, "uvicorn[standard]", faster-whisper, transformers, pytest) | ☐     |
| **P14** | Viết **lifespan.py** – load Whisper (`ASR_MODEL_NAME=small`) + PhoBERT checkpoint từ `models-and-dataset/phobert-base/`     | ☐     |
| **P15** | Cấu hình env `.env`: `PHOBERT_CHECKPOINT_DIR`, `ASR_MODEL_NAME`, `ASR_LANGUAGE=vi`, `GATEWAY_API_KEY`                      | ☐     |
| **P16** | Tạo **REST** `POST /asr/stream` nhận `application/octet-stream` (PCM16LE 16kHz mono) và trả `status/partial/final/detections` | ☐   |
| **P17** | Tạo **REST health** `/healthz` và `/readyz`                                                                                | ☐     |
| **P18** | Viết **pytest** – mock models, test `/healthz`, `/moderation`, `/asr/stream` (tiny bytes), coverage > 70%                  | ☐     |
| **P19** | Viết **Dockerfile** multi-stage; mount/copy `models-and-dataset/*` vào image (tối thiểu phobert-base)                       | ☐     |
