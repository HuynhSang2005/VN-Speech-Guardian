# PHASE 2 – FASTAPI AI WORKER

| Task    | Mô tả chi tiết                                                                                                | Check |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| **P13** | Tạo FastAPI project trong `apps/ai-worker`, cài dependencies (fastapi, uvicorn, faster-whisper, pytest, ruff) | ☐     |
| **P14** | Viết **lifespan.py** – load **Whisper base.int8** + **PhoBERT-ViHSD ONNX quantized** (đã download ở bước trên)             | ☐     |
| **P15** | Chạy script download-offline.sh 1 lần → có whisper-base + phobert-base + ViHSD csv (tùy) – KHÔNG export ONNX                                                     | ☐     |
| **P16** | Tạo **WebSocket** `/ws` – nhận bytes, trả `partial`, `final`, `detection`                                                  | ☐     |
| **P17** | Tạo **REST health** `/health`                  | ☐     |
| **P18** | Viết **pytest** – mock model, coverage > 70 %                                                                              | ☐     |
| **P19** | Viết **Dockerfile** multi-stage (copy models/)                                                                             | ☐     |
