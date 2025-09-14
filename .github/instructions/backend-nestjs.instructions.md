---
applyTo: "apps/gateway-nest/**/*"
---

# Backend NestJS Gateway – Instructions

## 1. Vai trò & Mục tiêu
- **Lớp Gateway** đầu tiên: **xác thực**, **rate-limit**, **ghi DB**, **push real-time** về React.
- **Không xử lý AI** – chỉ **forward audio bytes** → FastAPI & **broadcast** kết quả.
- **Chịu tải cao** (1-3k connection) → dùng **Fastify adapter**, **Pino logger**, **cluster PM2**.

## 2.  Tech version
- Node latest  LTS 
- NestJS latest 
- @nestjs/platform-express latest 
- @nestjs/swagger latest 
- nestjs-zod latest 
- Prisma latest 
- @clerk/clerk-sdk-node latest 
- Pino latest 

## 3. Folder detail
apps/gateway-nestjs/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ common/
│  │  ├─ guards/clerk.guard.ts
│  │  ├─ interceptors/logging.interceptor.ts
│  │  └─ pipes/zod-validation.pipe.ts
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.service.ts
│  │  │  └─ dto/clerk-login.dto.ts
│  │  ├─ sessions/
│  │  │  ├─ sessions.controller.ts
│  │  │  ├─ sessions.service.ts
│  │  │  ├─ sessions.repository.ts
│  │  │  ├─ dto/create-session.dto.ts
│  │  │  └─ entities/session.entity.ts
│  │  ├─ transcripts/
│  │  ├─ detections/
│  │  ├─ stats/
│  │  └─ ws/
│  │     └─ audio.gateway.ts
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  └─ dto/              # generated
├─ test/
└─ package.json

## 4. API contract – **REST + WebSocket**
### REST (OpenAPI tự gen)
| Method | Endpoint | Description | Response 200 |
|---|---|---|---|
| POST | `/api/auth/clerk` | Exchange Clerk JWT | `{ success: true, data: { accessToken, user } }` |
| GET | `/api/sessions` | List phân trang | `{ success: true, data: { sessions[], total } }` |
| GET | `/api/sessions/:id/transcripts` | Transcript của session | `{ success: true, data: { transcripts[] } }` |
| GET | `/api/stats/overview` | Dashboard metric | `{ success: true, data: { sessions, minutes, toxicPercent } }` |

### WebSocket (socket.io)
- Namespace: `/audio`
- Guard: `ClerkAuthGuard` → attach `client.user`
- Client → Server:
  - `audio` – `AudioChunkDto` (binary)
  - `stop` – `{}`
- Server → Client:
  - `partial` – `{ text, words }`
  - `final` – `{ text, words }`
  - `detection` – `{ label, score, snippet, startMs, endMs }`
  - `error` – `{ code, message }`

## 5) Logger – **structured JSON**
- Request: `logger.info({ reqId, method, url, userId })`
- Response: `logger.info({ reqId, statusCode, duration })`
- Error: `logger.error({ reqId, err: error.stack })`

## 6) Throw lỗi – **chuẩn REST**
```ts
throw new HttpException(
  { success: false, error: { code: 'VSG-002', message: 'Chunk quá lớn' } },
  400,
);
```

## Research tip
- Liên tục research internet khi code.
- Khi cần verify JWT Clerk → search "nestjs clerk jwt site:github.com"
- Khi cần optimize WS buffer → search "socket.io highWaterMark site:github.com"
- Paste link vào comment trên đoạn code.
```
