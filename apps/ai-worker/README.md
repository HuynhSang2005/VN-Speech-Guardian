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

Benchmarking (local, optional):
- Prepare env: copy `.env.example` to `.env` and adjust as needed
- Run: `python apps/ai-worker/tools/benchmarks.py`
- Output includes average latency for 2-chunk ASR flow and moderation.

References (streaming & tuning):
- faster-whisper README on VAD filter and compute_type int8 (CPU): https://github.com/SYSTRAN/faster-whisper#vad-filter
- Beam size note and performance comparison: https://github.com/SYSTRAN/faster-whisper#comparing-performance-against-other-implementations

Fine-tune PhoBERT

Full Vietnamese guide (recommended): apps/ai-worker/docs/TRAIN_PHOBERT.md

1) Prepare environment
	- Ensure Python 3.10+ and pip installed.
	- Install training deps (one-time):
	  - pip install -U transformers datasets scikit-learn accelerate evaluate

2) Dataset
	- CSV at apps/ai-worker/app/datasets/viHSD.csv (columns: text,label; labels in {safe,warn,block}).

3) Train (quick start)
		- Run the script with defaults:
			- python apps/ai-worker/tools/train_phobert.py
		- Or see the guide for CPU-friendly flags and tips.

	Extras:
	- Focal loss support: pass --focal-loss 1 --focal-gamma 2.0 to emphasize minority classes.
	- ONNX export helper: python apps/ai-worker/tools/export_onnx_phobert.py --src <checkpoint> --dst <onnx_dir> (requires optimum, onnxruntime).

4) Use the model in ai-worker
	- Set .env: PHOBERT_CHECKPOINT_DIR=apps/ai-worker/app/models/bert-finetuned
	- Set AI_LOAD_MODELS=true and restart ai-worker.

Optional: Export ONNX (for CPU speed/size)
 - pip install -r apps/ai-worker/requirements-onnx.txt
 - python apps/ai-worker/tools/export_onnx_phobert.py --src apps/ai-worker/app/models/bert-finetuned --dst apps/ai-worker/app/models/bert-finetuned-onnx --opset 17
 - Quick smoke (optional):
	 - python apps/ai-worker/tools/smoke_ort_infer.py
 - To serve via ORT in the app, set env:
	 - PHOBERT_ONNX_DIR=apps/ai-worker/app/models/bert-finetuned-onnx
	 - USE_ONNXRUNTIME=true
	 - AI_LOAD_MODELS=true
