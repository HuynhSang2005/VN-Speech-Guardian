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
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ sessions/
│  │  │  │  ├─ transcripts/
│  │  │  │  ├─ detections/
│  │  │  │  ├─ stats/
│  │  │  │  └─ ws/
│  │  │  ├─ prisma/
│  │  │  └─ dto/              # generated
│  │  ├─ test/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ jest.config.ts
│  │  └─ Dockerfile
│  │
│  ├─ ai-worker/                           # FastAPI AI
│  │  ├─ src/
│  │  │  ├─ main.py
│  │  │  ├─ lifespan.py
│  │  │  ├─ streaming.py
│  │  │  ├─ asr_engine.py
│  │  │  ├─ moderation.py
│  │  │  ├─ vad.py
│  │  │  └─ utils/
│  │  ├─ tests/
│  │  ├─ models/            
│  │  ├─ requirements.txt
│  │  ├─ pytest.ini
│  │  └─ Dockerfile
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
| **api (NestJS Latest Version)** | `@nestjs/core` | Latest Version| framework |
| | `@nestjs/platform-express` | Latest Version | HTTP & WS |
| | `@nestjs/swagger` | Latest Version | OpenAPI |
| | `nestjs-zod` | Latest Version | Zod → DTO |
| | `prisma` | Latest Version | ORM |
| | `@clerk/clerk-sdk-node` | Latest Version | verify JWT |
| | `pino-pretty` | Latest Version | log JSON |
| | `jest` | Latest Version | unit |
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

## 8) Tóm tắt 1 dòng
**Copilot làm theo path-specific + prompt nhỏ → test xanh → MVP hoàn chỉnh – architecture đã chuẩn scale.**
```

