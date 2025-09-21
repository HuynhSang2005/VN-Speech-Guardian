## 0) Meta & Mục tiêu dự án
| Key | Value |
|---|---|
| **Tên repo** | `vn-speech-guardian` |
| **Mục tiêu** | **Speech-to-Text tiếng Việt** + **phát hiện từ xấu real-time**, **offline**, **CPU consumer**. |
| **Scale** | MVP **1-3 phiên đồng thời**, kiến trúc **micro-hybrid** (NestJS gateway + FastAPI AI), dễ **container/k8s** sau. |
| **Ngôn ngữ code** | **Tiếng Việt** cho comment & logic, **EN** khi copy từ thư viện. |
| **Test-first** | **đỏ → xanh → refactor → commit**; **phải pass CI rồi mới git comment đến git push main** (lint + unit + e2e + build). |
| **Package manager** | **npm** (workspace root), **không dùng yarn/pnpm**. |

---

## 1) Folder Structure – **chuẩn monorepo npm**
```
vn-speech-guardian/
├─ .github/
│  ├─ copilot-instructions.md             # file này
│  ├─ instructions/                       # path-specific
│  └─ prompts/                            # task nhỏ
├─ apps/
│  ├─ gateway-nestjs/                                # NestJS Gateway
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ common/
│  │  │  │  ├─ filters/
│  │  │  │  ├─ guards/
│  │  │  │  ├─ interceptors/
│  │  │  │  ├─ pipes/
│  │  │  │  └─ prisma/
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ detections/
│  │  │  │  ├─ health/
│  │  │  │  ├─ metrics/
│  │  │  │  ├─ sessions/
│  │  │  │  ├─ stats/
│  │  │  │  └─ ws/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  └─ migrations/
│  │  ├─ public/
│  │  │  └─ openapi.json
│  │  ├─ test/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.build.json
│  │  └─ Dockerfile
│  │
│  ├─ ai-worker/                           # FastAPI AI
│  │  ├─ app/
│  │  │  ├─ __init__.py
│  │  │  ├─ main.py                # entrypoint FastAPI app
│  │  │  ├─ lifespan.py            # event startup/shutdown nạp model
│  │  │  ├─ routers/
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ asr.py             # routes cho speech to text
│  │  │  │  └─ moderation.py      # routes cho phân loại/kiểm duyệt
│  │  │  ├─ schemas/
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ asr_schema.py
│  │  │  │  └─ moderation_schema.py
│  │  │  ├─ services/
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ asr_service.py     # wrapper faster-whisper
│  │  │  │  └─ bert_service.py    # wrapper phoBERT-base
│  │  │  ├─ models/
│  │  │  │  ├─ README.md          # hướng dẫn tải về và sử dụng
│  │  │  │  ├─ speech_to_text/    # symbolic link hoặc meta về faster-whisper
│  │  │  │  └─ bert/              # symbolic link hoặc meta về phoBERT-base
│  │  │  ├─ datasets/
│  │  │  │  ├─ README.md          # hướng dẫn tải ViHSD
│  │  │  │  └─ viHSD/             # dataset mẫu hoặc symbolic link
│  │  │  ├─ utils/
│  │  │  │  └─ utils.py
│  │  │  └─ core/
│  │  │     ├─ config.py
│  │  │     └─ security.py
│  │  ├─ tests/
│  │  │  ├─ __init__.py
│  │  │  ├─ test_asr.py
│  │  │  └─ test_moderation.py
│  │  ├─ requirements.txt
│  │  ├─ pytest.ini
│  │  ├─ Dockerfile
│  │  ├─ README.md
│  │  └─ .env
│  │
│  └─ web/                                # React + Vite + TS
│     ├─ src/
│     │  ├─ main.tsx
│     │  ├─ router.tsx
│     │  ├─ pages/
│     │  ├─ components/ui/   # Radix UI
│     │  ├─ hooks/
│     │  ├─ worklets/
│     │  ├─ services/
│     │  └─ env.ts
│     ├─ tests/
│     ├─ package.json
│     ├─ vite.config.ts
│     ├─ tsconfig.json
│     └─ Dockerfile
├─ packages/
│  ├─ schemas/              # Zod source-of-truth
│  │  ├─ src/
│  │  │  ├─ audio.ts
│  │  │  ├─ session.ts
│  │  │  └─ detection.ts
│  │  └─ package.json
│  └─ eslint/
├─ tooling/
│  ├─ docker/
│  │  ├─ docker-compose.dev.yml
│  │  └─ docker-compose.yml
│  └─ scripts/
│     ├─ dev.sh
│     ├─ gen-nest-dto.ts
│     └─ gen-pydantic.sh
├─ .env.example
├─ package.json              # root npm workspace
├─ turbo.json
└─ README.md
```

---

## 2) Tech Stack – **version mới ổn định**

| Vị trí | Package | Version | Mục đích |
|---|---|---|---|
| **Root** | npm | 11.5.2 | workspace |
| | turbo | 2.5.6 | cache task |
| | Node | 22 LTS trở lên | runtime |
| **api (NestJS)** | `@nestjs/core` | v11 | framework |
| | `@nestjs/platform-express` | Latest | HTTP & WS |
| | `@nestjs/swagger` | Latest | OpenAPI |
| | `nestjs-zod` | Latest | Zod → DTO |
| | `prisma` | v6 | ORM |
| | `@clerk/backend` | v2.x | verify JWT |
| | `@nestjs/throttler` | v6 | rate-limit |
| | `pino-pretty` | Latest | log JSON |
| | `jest` | Latest | unit |
| **ai-worker (FastAPI)** | `fastapi` | Latest Version | async API |
| | `uvicorn` | Latest Version | server |
| | `faster-whisper` | Latest Version | STT |
| | `onnxruntime` | Latest Version | inference |
| | `pydantic` | Latest Version | validate |
| | `pytest` | Latest Version | test |
| **web (React)** | `react` | Latest Version | UI |
| | `vite` | Latest Version | dev & build |
| | `typescript` | Latest Version | type |
| | `tailwindcss` | Latest Version | style |
| | `@radix-ui/react-*` | Latest Version | headless UI |
| | `@tanstack/react-query` | Latest Version | fetch |
| | `socket.io-client` |Latest Version | WS |
| | `vitest` | Latest Version | unit |
| **shared** | `zod` | Latest Version | schema |
| **DB** | postgres | 16-alpine | docker |

---

## 3) Ngữ cảnh – **AI Agent cần biết**

| Service | Nhiệm vụ | Lý do chọn tech |
|---|---|---|
| **NestJS Gateway** | - Auth (Clerk JWT), REST, WS fallback, rate-limit, dashboard, DB<br>- Chịu **tải cao** (1-3k connection) | Node event-loop + pm2 phù hợp **I/O nặng**, **không block** AI |
| **FastAPI AI** | - VAD → ASR → Moderation (CPU-heavy)<br>- Emit kết quả về Nest | Python ecosystem **AI tốt nhất**, **ít connection** → dùng **CPU riêng** |

Lưu ý AI worker
- Dùng models local trong repo: `models-and-dataset/phobert-base/` và `models-and-dataset/ViHSD/ViHSD.csv` (fine-tune offline nếu cần).
- Whisper dùng `faster-whisper` cài qua pip; mặc định `ASR_MODEL_NAME=small`, `ASR_LANGUAGE=vi`.
- Endpoint ưu tiên binary-efficient: `POST /asr/stream` nhận `application/octet-stream` theo Forward protocol ở mục 9.

### Cập nhật quan trọng (ONNX / thresholds / vận hành)

- Fast inference cho PhoBERT trên CPU ưu tiên ONNXRuntime khi có `app/models/bert-finetuned-onnx/model.onnx`.
- Biến môi trường để cấu hình mapping & runtime:
	- `PHOBERT_CHECKPOINT_DIR` (torch checkpoint hoặc hf folder)
	- `PHOBERT_ONNX_DIR` (nơi lưu `model.onnx` nếu xuất ONNX)
	- `USE_ONNXRUNTIME` (true/false) — nếu true thì ưu tiên ONNXRuntime
	- `PHOBERT_BLOCK_THRESHOLD`, `PHOBERT_WARN_THRESHOLD` — thresholds (0..1) để map softmax → safe/warn/block
	- `GATEWAY_API_KEY` — secret giữa Gateway và AI Worker (x-api-key)

Ví dụ chạy export & smoke-test đã được chuẩn hóa trong `apps/ai-worker/tools/`:
- `tools/export_onnx_phobert.py` — exporter từ checkpoint HF → ONNX
- `tools/smoke_ort_infer.py` — kiểm tra inference ONNX nhanh

Lưu ý Git LFS: mô hình lớn (nếu có) phải đưa vào LFS hoặc host bên ngoài; repo không nên chứa checkpoint >100MB.

---

## 4) Hiệu suất target – **real-time**

| Kịch bản | CPU i5-13th | Latency | RAM |
|---|---|---|---|
| Whisper base.int8 | ~30 % | **final 1.0-1.5 s** | ~600 MB |
| PhoBERT ONNX | +5 % | **≤10 ms** / window | ~300 MB |
| **Tổng 1 phiên** | ≤40 % | **p95 final <2 s** | ~1 GB |
| **3 phiên** | ≤70 % | **p95 final <2.2 s** | ~2.2 GB |

---

## 5) Quy ước code – **dev Việt Nam**

### Comment header mẫu
```typescript
/**
 * Mục đích: chuyển tiếp audio chunk từ client → FastAI
 * Input:  ArrayBuffer PCM 16 kHz mono
 * Output: {seq} để client đo lag
 * Edge:   nếu FastAPI disconnect → retry 3 lần rồi ném WsException
 */
```

### Logic khó
```typescript
// VI: tránh nhấp nháy detection – dùng hysteresis 2→toxic, 3→clean
if (toxicCount >= 2 && !isToxic) isToxic = true;
if (cleanCount >= 3 && isToxic) isToxic = false;
```

### Research internet – **liên tục**
- Khi cần optimize whisper → search `"faster-whisper beam size latency site:github.com"`
- Khi cần quantize PhoBERT → search `"optimum onnx quantization phobert site:huggingface.co"`
- **Paste link** vào comment trên đoạn code.

---

## 9) Forward protocol (Gateway → FastAPI AI) — implementation notes

Khi triển khai FastAPI AI, cần tuân theo giao thức binary-efficient sau để giảm overhead so với JSON/base64 và dễ đạt độ trễ thấp:

- Endpoint: POST /asr/stream (ví dụ) hoặc /asr/chunk
- Content-Type: application/octet-stream
- Headers:
	- x-session-id: string  # session id từ Gateway (sessionId)
	- x-chunk-seq: number? # (tuỳ chọn) sequence number cho chunk ordering
	- x-final: boolean?    # (tuỳ chọn) đánh dấu chunk cuối

- Body: raw bytes (PCM16LE 16kHz mono) — Gateway sẽ gửi Buffer thẳng (không base64).

- Response (success 200): application/json
	{
		"status": "ok",
		"partial": { "text": "..." },     // tuỳ theo streaming
		"final": { "text": "...", "words": [...] },
		"detections": [ { "label":"OFFENSIVE", "score":0.92, "startMs":100, "endMs":800, "snippet":"..." } ]
	}

- Error handling:
	- 400: bad request (malformed audio / unsupported sample rate)
	- 429: backpressure / rate limit
	- 500: internal error — Gateway nên retry 0..3 lần với exponential backoff (100ms → 300ms → 1s) trước khi emit `error` event cho client.

- Performance & chunking:
	- Gateway gửi chunks nhỏ (20–100 ms frames aggregated into ~200–1000 ms payloads) to reduce network overhead and allow low-latency partials.
	- FastAPI nên hỗ trợ streaming POST (chunked transfer) hoặc accept repeated POSTs. Nếu dùng streaming, FastAPI endpoint có thể read raw body in async loop.

- Contract guarantees:
	- Gateway gửi PCM16LE 16kHz mono. Nếu FastAPI supports other sample rates, convert centrally and document in README.
	- Response must include explicit `final` payloads and `detections` array (can be empty) so Gateway áp dụng hysteresis logic.

- Implementation tips (FastAPI):
	- Use `async def` with `await request.body()` for small requests, or `await request.stream()` / `async for chunk in request.stream()` for streaming.
	- Validate headers early and return 400 if sessionId missing.
	- Keep inference CPU-bound isolated (worker thread/process) and return partials asap.
	- Endpoint example (pseudo):

```py
from fastapi import FastAPI, Request, Header, HTTPException

@app.post('/asr/stream')
async def asr_stream(request: Request, x_session_id: str | None = Header(None)):
		if not x_session_id:
				raise HTTPException(400, 'missing x-session-id')
		# read bytes (or stream) and process
		data = await request.body()
		# run VAD → ASR → moderation → return json
		return { 'status':'ok', 'final': {'text': '...'}, 'detections': [] }
```

Ghi chú bổ sung:
- Gateway chịu trách nhiệm gửi header `x-api-key` (value từ `GATEWAY_API_KEY`) cho mọi request giữa dịch vụ.
- Khi cần auditing, Gateway có thể forward `x-user-id` hoặc `x-request-id` (AI Worker chỉ log nhưng không xử lý auth từ các header này).

---


## 6) Workflow – **daily**

1. **Copilot đọc** `.github/instructions/<module>.instructions.md`
2. Làm **1 prompt** trong `.github/prompts/phase-*/pXX-*.md` (đã break nhỏ)
3. **Test local**: `npm run test:unit` + `pytest` + `npm run test:e2e`
4. **git Push** → CI xanh → git comment -> git push main.

---

## 7) Scale roadmap – **không đụng code business**

| Giai đoạn | Thay đổi | Hành động |
|---|---|---|
| **5-10 user** | hiện tại | `pm2 start ecosystem.config.js` (cluster Node) |
| **>10 user** | container hoá | thêm `Dockerfile` Nest & FastAPI → `docker-compose.yml` |
| **>100 user** | horizontal | k8s, Redis adapter socket.io, Postgres pool lớn |
| **>1k user** | GPU/TPU | đổi whisper **large-v3** + ONNX-GPU, queue job |

---

## 8) UI/UX Design Specifications – **AI Design Tool Integration**

### Interface Requirements cho Speech Guardian
| Trang | Mô tả UI/UX | AI Tool Prompt |
|---|---|---|
| **/live** | **Full-screen immersive** - Dark theme, central circular visualizer (300px), gradient start/stop button, real-time transcript panel với detection highlights | `Create modern speech interface: dark theme #1F2937, circular waveform #10B981, gradient button #3B82F6→#1D4ED8, scrolling transcript with highlights` |
| **/dashboard** | **Admin-style analytics** - Light theme, sidebar nav (250px), 3-card metrics row, 2x2 chart grid, recent activity list | `Design clean analytics dashboard: light #FAFAFA, sidebar nav, metrics cards with trends, charts grid (line/donut/heatmap/table)` |
| **/sessions** | **Data table interface** - Clean white, advanced filtering header, sortable columns, severity badges, pagination, full-screen modal | `Create data table: white background, filter controls, sortable columns, action buttons, modal overlay for details` |
| **/login** | **Centered auth card** - Clerk integration, brand area với tagline "Protecting Vietnamese Speech", gradient background | `Design auth interface: centered card, logo area, Clerk components, subtle gradient background` |

### Design Tokens cho AI Generation
```css
/* Màu sắc chính */
--primary: #3B82F6;     /* Blue - primary actions */
--success: #10B981;     /* Green - safe content */  
--warning: #F59E0B;     /* Orange - medium alerts */
--danger: #EF4444;      /* Red - harmful content */
--background: #FAFAFA;  /* Light gray background */
--surface: #FFFFFF;     /* White cards */
--dark: #1F2937;        /* Dark theme background */

/* Typography */
--font-family: 'Inter', sans-serif;
--heading: 1.5rem;      /* Page titles */
--subheading: 1.125rem; /* Section titles */
--body: 1rem;           /* Regular text */
--caption: 0.875rem;    /* Small text */

/* Spacing Scale */
--space-xs: 0.5rem;     /* 8px - tight spacing */
--space-sm: 1rem;       /* 16px - normal spacing */
--space-md: 1.5rem;     /* 24px - section spacing */
--space-lg: 2rem;       /* 32px - page margins */
--space-xl: 3rem;       /* 48px - large gaps */
```

### Component AI Prompts
**Sử dụng với Cursor/GitHub Copilot để generate components:**
```typescript
// PROMPT: Generate React button with variants primary/secondary/danger, sizes sm/md/lg, states hover/active/disabled
// PROMPT: Create Radix Dialog composition với dark/light theme support, animations, proper a11y
// PROMPT: Build audio visualizer component với circular waveform animation, real-time data binding
// PROMPT: Design metric card component with trend arrows, loading states, hover animations
```

---

## 9) Tóm tắt 1 dòng
**Copilot làm theo path-specific + prompt nhỏ → test xanh → MVP hoàn chỉnh – architecture + UI/UX đã chuẩn scale.**
```

