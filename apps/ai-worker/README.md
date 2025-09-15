# AI Worker (FastAPI)

Endpoints:
- GET /healthz
- POST /asr/stream (application/octet-stream)
- POST /moderation

Env:
- GATEWAY_API_KEY (default: dev-secret)
- ASR_MODEL_NAME (default: small), ASR_LANGUAGE (vi)
- PHOBERT_CHECKPOINT_DIR (default: ./models-and-dataset/phobert-base)

Run locally:
1) Create venv and install requirements
2) uvicorn app.main:app --reload --port 8001

Tests:
- pytest (coverage >=85%)
