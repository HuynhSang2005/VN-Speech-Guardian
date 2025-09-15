---
applyTo: "apps/ai-worker/**/*"
---

# Backend Python FastAPI AI – Instructions
**Mục tiêu:** FastAPI tối giản cung cấp 2 endpoint:

* `POST /asr/stream` nhận bytes `application/octet-stream` (PCM16LE 16kHz mono), trả transcript bằng Whisper.
* `POST /moderation` nhận mảng câu, trả nhãn từ PhoBERT đã fine-tune.

**Kết nối:** FE → NestJS Gateway → FastAPI. Gateway gọi HTTP. Bảo vệ bằng header `x-api-key`.

---

## 1) Phạm vi MVP

* Chỉ suy luận online. Huấn luyện PhoBERT làm **offline** trước.
* CPU mặc định. GPU tùy chọn.
* Không có queue hoặc job scheduler.

---

## 2) Cài đặt nhanh

```bash
pip install -U fastapi "uvicorn[standard]" python-multipart orjson
pip install -U faster-whisper ffmpeg-python
pip install -U "torch==2.3.1+cpu" -f https://download.pytorch.org/whl/torch_stable.html
pip install -U transformers
```

Yêu cầu `ffmpeg` có trong hệ thống.

---

## 3) Biến môi trường (.env)

```
APP_HOST=0.0.0.0
APP_PORT=8001
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
GATEWAY_API_KEY=dev-secret

# Whisper
ASR_MODEL_NAME=small          # small|medium|large-v3
ASR_DEVICE=cpu                # cpu|cuda
ASR_LANGUAGE=vi
ASR_BEAM_SIZE=5

# PhoBERT
PHOBERT_CHECKPOINT_DIR=./models/phobert-mvp   # thư mục đã fine-tune
MOD_LABELS_JSON={"safe":0,"warn":1,"block":2}
TEXT_MAX_LEN=256
```

---

## 4) Cấu trúc thư mục tối thiểu (khớp repo)

```
apps/ai-worker/
  app/
    __init__.py
    main.py
    lifespan.py
    routers/
      __init__.py
      asr.py
      moderation.py
    schemas/
      __init__.py
      asr_schema.py
      moderation_schema.py
    services/
      __init__.py
      asr_service.py
      bert_service.py
    models/
      README.md
      speech_to_text/
      bert/
    datasets/
      README.md
      viHSD/
    utils/
      utils.py
    core/
      config.py
      security.py
  tests/
    __init__.py
    test_asr.py
    test_moderation.py
  requirements.txt
  pytest.ini
  Dockerfile
  README.md
  .env
```

---

## 5) Hợp đồng API

### 5.1 Health

* `GET /healthz` → `{ "status": "ok" }`

### 5.2 ASR (binary-efficient)

* `POST /asr/stream` (`application/octet-stream`)
* Headers: `x-session-id`, `x-chunk-seq?`, `x-final?`
* Trả:

```json
{
  "status": "ok",
  "partial": { "text": "..." },
  "final": { "text": "...", "words": [] },
  "detections": []
}
```

### 5.3 Moderation

* `POST /moderation` (`application/json`)

```json
{ "inputs": ["câu 1", "câu 2"] }
```

* Trả:

```json
{
  "results": [
    {"label":"safe","score":0.98},
    {"label":"block","score":0.91}
  ]
}
```

---

## 6) Mẫu mã tối thiểu

`app/core/config.py`

```python
import os, json
class Cfg:
  APP_HOST = os.getenv("APP_HOST","0.0.0.0")
  APP_PORT = int(os.getenv("APP_PORT","8001"))
  ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS","*").split(",")
  API_KEY = os.getenv("GATEWAY_API_KEY","dev-secret")
  ASR_NAME = os.getenv("ASR_MODEL_NAME","small")
  ASR_DEVICE = os.getenv("ASR_DEVICE","cpu")
  ASR_LANG = os.getenv("ASR_LANGUAGE","vi")
  ASR_BEAM = int(os.getenv("ASR_BEAM_SIZE","5"))
  PHOBERT_DIR = os.getenv("PHOBERT_CHECKPOINT_DIR","./models-and-dataset/phobert-base")
  LABEL_MAP = json.loads(os.getenv("MOD_LABELS_JSON",'{"safe":0,"warn":1,"block":2}'))
  TEXT_MAX_LEN = int(os.getenv("TEXT_MAX_LEN","256"))
cfg = Cfg()
```

`app/models/whisper.py`

```python
from faster_whisper import WhisperModel
from app.core.config import cfg
model = WhisperModel(cfg.ASR_NAME, device=cfg.ASR_DEVICE)

def transcribe_bytes(data:bytes):
  # Gợi ý: ghi tạm ra file rồi dùng model.transcribe(path) để đơn giản MVP
  import tempfile, pathlib
  with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
    tmp.write(data)
    tmp.flush()
    path = tmp.name
  try:
    segs, info = model.transcribe(path, language=cfg.ASR_LANG, beam_size=cfg.ASR_BEAM)
    out = []
    for s in segs:
      out.append({"start": s.start, "end": s.end, "text": s.text.strip()})
    return {"text":" ".join(x["text"] for x in out).strip(), "segments": out}
  finally:
    pathlib.Path(path).unlink(missing_ok=True)
```

`app/models/phobert.py`

```python
import torch, torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from app.core.config import cfg
tokenizer = AutoTokenizer.from_pretrained(cfg.PHOBERT_DIR)
model = AutoModelForSequenceClassification.from_pretrained(cfg.PHOBERT_DIR).eval()
id2label = {v:k for k,v in cfg.LABEL_MAP.items()}

@torch.inference_mode()
def predict(batch:list[str]):
  enc = tokenizer(batch, padding=True, truncation=True, max_length=cfg.TEXT_MAX_LEN, return_tensors="pt")
  logits = model(**enc).logits
  probs = F.softmax(logits, dim=-1).cpu().tolist()
  res=[]
  for p in probs:
    idx = int(max(range(len(p)), key=lambda i:p[i]))
    res.append({"label": id2label[idx], "score": float(p[idx])})
  return res
```

`app/api/asr.py`

```python
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from app.models.whisper import transcribe_bytes
from app.core.config import cfg
import tempfile, pathlib, shutil

router = APIRouter()

def auth(x_api_key:str|None=Header(None)):
  if x_api_key != cfg.API_KEY: raise HTTPException(401, "invalid api key")

@router.post("/asr/stream")
async def asr_stream(request: Request, x_session_id: str | None = Header(None), _=Depends(auth)):
  if not x_session_id:
    raise HTTPException(400, "missing x-session-id")
  data = await request.body()
  result = transcribe_bytes(data)
  return {"status":"ok", "final": {"text": result["text"], "words": []}, "detections": []}
```

`app/api/moderation.py`

```python
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from app.models.phobert import predict
from app.core.config import cfg
from pathlib import Path

router = APIRouter()

def auth(x_api_key:str|None=Header(None)):
  if x_api_key != cfg.API_KEY: raise HTTPException(401, "invalid api key")

class Inp(BaseModel):
  inputs: list[str]

@router.post("/moderation")
def mod(body: Inp, _=Depends(auth)):
  if not Path(cfg.PHOBERT_DIR).exists():
    raise HTTPException(503, "model not ready")
  return {"results": predict(body.inputs)}
```

`app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.asr import router as asr_router
from app.api.moderation import router as mod_router
from app.core.config import cfg

app = FastAPI(title="VN Speech Guardian AI (MVP)")
app.add_middleware(CORSMiddleware, allow_origins=cfg.ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/healthz")
def healthz(): return {"status":"ok"}

app.include_router(asr_router)
app.include_router(mod_router)
```

---

## 7) Tích hợp NestJS Gateway

* Base URL: `AI_SERVICE_BASE_URL=http://localhost:8001`
* Header: `x-api-key: <GATEWAY_API_KEY>`
* Axios ví dụ:

```ts
// ASR
const form = new FormData();
form.append("file", fs.createReadStream(audioPath));
const r1 = await this.http.post(`${AI}/asr`, form, { headers: { "x-api-key": KEY, ...form.getHeaders() } });

// Moderation
const r2 = await this.http.post(`${AI}/moderation`, { inputs }, { headers: { "x-api-key": KEY } });
```

---

## 8) Chạy thử

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
# ASR
curl -H "x-api-key: dev-secret" -F "file=@sample.wav" http://localhost:8001/asr
# Moderation
curl -H "x-api-key: dev-secret" -H "Content-Type: application/json" \
  -d '{"inputs":["câu lịch sự","câu tiêu cực"]}' http://localhost:8001/moderation
```

---