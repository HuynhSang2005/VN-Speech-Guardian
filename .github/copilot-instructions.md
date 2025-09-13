## 0) Meta & Mục tiêu dự án
- **Tên repo**: `vn-speech-guardian`
- **Mục tiêu**: **Speech-to-Text tiếng Việt** + **phát hiện từ xấu real-time** hoàn toàn **offline** trên **CPU consumer**.
- **Scale**: MVP **1-3 phiên đồng thời**, kiến trúc **micro-hybrid** (NestJS gateway + FastAPI AI), dễ **scale lên container/k8s** sau này.
- **Ngôn ngữ code**: **tiếng Việt (không dấu)** cho comment & logic, **EN** khi copy từ thư viện.
- **Test-first**: **đỏ → xanh → refactor → commit**; **mọi PR phải pass CI** (lint + unit + e2e + build).

---

## 1) Folder Structure – **chuẩn monorepo pnpm**
```
vn-speech-guardian/
├─ .github/
│  ├─ copilot-instructions.md             # file này
│  ├─ workflows/ci.yml
│  ├─ instructions/                       # path-specific
│  │  ├─ backend.instructions.md
│  │  ├─ frontend.instructions.md
│  │  ├─ ai-service.instructions.md
│  │  ├─ db.instructions.md
│  │  └─ shared.instructions.md
│  └─ prompts/                            # task nhỏ
│     ├─ p01-skeleton.md
│     ├─ p02-auth.md
│     ├─ p03-ws-gateway.md
│     ├─ p04-asr-offline.md
│     ├─ p05-moderation.md
│     ├─ p06-react-live.md
│     ├─ p07-dashboard.md
│     ├─ p08-load-test.md
│     └─ p09-dockerize.md
├─ apps/
│  ├─ gateway-nest/                       # NestJS – gateway, auth, REST, WS, DB
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ app.module.ts
│  │  │  ├─ config/                       # Joi/Zod env
│  │  │  ├─ common/                       # guards, interceptors, pipes, utils
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ sessions/
│  │  │  │  ├─ transcripts/
│  │  │  │  ├─ detections/
│  │  │  │  ├─ stats/                     # dashboard REST
│  │  │  │  └─ ws/                          # AudioGateway
│  │  │  └─ prisma/
│  │  │     ├─ schema.prisma
│  │  │     ├─ seed.ts
│  │  │     └─ migrations/
│  │  ├─ test/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ jest.config.ts
│  │  └─ Dockerfile
│  │
│  ├─ asr-fastapi/                         # FastAPI – AI only
│  │  ├─ src/
│  │  │  ├─ main.py
│  │  │  ├─ config.py
│  │  │  ├─ lifespan.py                    # load model 1 lần
│  │  │  ├─ vad.py
│  │  │  ├─ asr_engine.py
│  │  │  ├─ moderation.py
│  │  │  ├─ streaming.py                   # WS router
│  │  │  └─ utils/
│  │  ├─ tests/
│  │  ├─ models/                            # whisper & phobert
│  │  ├─ requirements.txt
│  │  ├─ pytest.ini
│  │  └─ Dockerfile
│  │
│  └─ ui/                                    # React + Vite + TS
│     ├─ public/
│     ├─ src/
│     │  ├─ pages/
│     │  │  ├─ LivePage.tsx
│     │  │  └─ DashboardPage.tsx
│     │  ├─ components/
│     │  ├─ hooks/
│     │  ├─ services/
│     │  ├─ routes.tsx
│     │  └─ styles/
│     ├─ tests/
│     ├─ package.json
│     ├─ vite.config.ts
│     ├─ tsconfig.json
│     └─ Dockerfile
├─ packages/
│  └─ shared-protocol/
│     ├─ src/
│     │  ├─ ws-payloads.ts
│     │  ├─ rest-schemas.ts
│     │  └─ index.ts
│     ├─ python/
│     │  └─ models.py
│     ├─ package.json
│     └─ tsconfig.json
├─ infra/
│  ├─ docker-compose.dev.yml      # postgres + adminer
│  ├─ docker-compose.yml          # prod full
│  └─ nginx.conf
├─ scripts/
│  ├─ dev.sh
│  ├─ test.sh
│  ├─ lint.sh
│  └─ load-test.js
├─ .env.example
├─ pnpm-workspace.yaml
└─ README.md
```

---

## 2) Tech Stack chi tiết

### Backend – **NestJS Gateway** (chịu tải cao, real-time)
| Package | Version | Mục đích |
|---|---|---|
| `@nestjs/core` | 10.x | framework |
| `@nestjs/platform-fastify` | 10.x | nhanh hơn Express |
| `@nestjs/websockets` + `socket.io` | 4.7 | WS fallback |
| `@nestjs/passport` + `passport-jwt` | 10.x | JWT httpOnly cookie |
| `bcrypt` | 5.x | hash password |
| `prisma` + `@prisma/client` | 5.x | ORM type-safe |
| `joi` / `zod` | 3.x | config & DTO validation |
| `pino-pretty` | 10.x | structured log |
| `jest` + `supertest` | 29.x | unit + e2e |
| `pm2` | 5.x | cluster mode (scale sau) |

### AI Service – **FastAPI** (chỉ AI, nặng compute)
| Package | Version | Mục đích |
|---|---|---|
| `fastapi` | 0.110 | async API |
| `uvicorn` | 0.27 | server |
| `faster-whisper` | 0.10 | STT offline |
| `transformers` | 4.40 | PhoBERT |
| `torch` | 2.2 CPU | backend |
| `silero-vad` | onnx | cắt speech |
| `pytest` + `pytest-asyncio` | 8.x | test |

### Frontend – **React + Vite + TS**
| Package | Version | Mục đích |
|---|---|---|
| `react` | 18.x | UI |
| `vite` | 5.x | dev server |
| `typescript` | 5.x | type |
| `tailwindcss` | 3.4 | styling |
| `@tanstack/react-query` | 5.x | fetch & cache |
| `socket.io-client` | 4.7 | real-time |
| `recharts` | 2.12 | chart dashboard |
| `vitest` | 1.x | unit test |
| `@playwright/test` | 1.x | e2e |

### Shared
| Package | Mục đích |
|---|---|
| `zod` | schema TS |
| `pydantic` v2 | schema Python |

---

## 3) Vai trò rõ ràng – **ai làm gì?**

| Service | Nhiệm vụ | Lý do chọn tech |
|---|---|---|
| **NestJS Gateway** | - WS fallback, auth, rate-limit, REST dashboard, ghi DB<br>- Chịu **tải cao** (1-3k connection) | Node event-loop + cluster(pm2) phù hợp **I/O nặng**, **không block** AI |
| **FastAPI AI** | - VAD → ASR → Moderation (heavy CPU)<br>- Emit kết quả về Nest | Python ecosystem **AI tốt nhất**, **async** nhưng **ít connection** → dùng **CPU riêng** |

---

## 4) Hiệu suất & độ trễ – **target real-time**

| Kịch bản | CPU i5-12th | Latency | RAM 1 phiên |
|---|---|---|---|
| **Whisper base.int8** | ~30 % | **final 1.0-1.5 s** (câu 1-2 s) | ~600 MB |
| **PhoBERT window** | +5 % | **≤10 ms** / window | ~300 MB |
| **Tổng 1 phiên** | ≤40 % | **p95 final <2 s** | ~1 GB |
| **3 phiên song song** | ≤70 % | **p95 final <2.2 s** | ~2.2 GB |

> Khi vượt >3 phiên: **giảm xuống whisper tiny** hoặc **dùng GPU**, **thêm máy** (scale ngang).

---

## 5) Logic & Quy ước code – **dev Việt Nam**

### File naming
- **Nest**: `tên.controller.ts`, `tên.service.ts`, `tên.repository.ts`
- **FastAPI**: `tên.py` (snake_case)
- **React**: `TênComponent.tsx`, `useTênHook.ts`

### Comment header mẫu
```typescript
/**
 * Mục đích: chuyển tiếp audio chunk từ client → FastAI
 * Input:  base64 PCM 16 kHz mono
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

---

## 6) Workflow – **daily**

1. **Copilot đọc** `.github/instructions/<module>.instructions.md`
2. Làm **1 prompt** trong `.github/prompts/pXX-*.md` (đã break nhỏ)
3. **Test local**: `pnpm test:unit` + `pytest` + `pnpm test:e2e`
4. **Push PR** → CI xanh → merge

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