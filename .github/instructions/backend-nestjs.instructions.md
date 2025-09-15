---
applyTo: "apps/gateway-nest/**/*"
---

# Backend NestJS Gateway – Instructions

## 1. Vai trò & Mục tiêu
- **Lớp Gateway** đầu tiên: **xác thực**, **rate-limit**, **ghi DB**, **push real-time** về React.
- **Không xử lý AI** – chỉ **forward audio bytes** → FastAPI & **broadcast** kết quả.
- **Chịu tải cao** (1-3k connection) → dùng **Express adapter** (mặc định Nest 11), **Pino logger**, có thể scale bằng **PM2 cluster** hoặc container.

## 2. Tech version
- Node 22 LTS
- NestJS 11
- @nestjs/platform-express latest
- @nestjs/swagger latest
- nestjs-zod latest
- Prisma 6
- @clerk/backend v2.x (server-side verification)
- @nestjs/throttler v6 (array form config, ttl in ms)
- Pino (nestjs-pino)
- prom-client (metrics), helmet, cookie-parser, socket.io
x`
## 3. Folder detail
apps/gateway-nestjs/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ common/
│  │  ├─ filters/sentry-exception.filter.ts
│  │  ├─ guards/              # auth guards, incl. Clerk guard
│  │  ├─ interceptors/
│  │  ├─ pipes/
│  │  └─ prisma/
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ detections/
│  │  ├─ health/
│  │  ├─ metrics/
│  │  ├─ sessions/
│  │  ├─ stats/
│  │  └─ ws/
│  └─ prisma/                # Prisma schema & migrations
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ test/                     # e2e/*.ts + jest-e2e.json
├─ public/openapi.json       # generated
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

Ghi chú Auth
- Backend xác thực Bearer/cookie, verify bằng `@clerk/backend` v2 với `verifyToken`.
- Ưu tiên `CLERK_JWT_KEY` (PEM public key). Fallback `CLERK_SECRET_KEY` khi cần.
- Sau verify: attach `req.user` qua guard để dùng trong controller/gateway.

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
```

## 7) Pattern: DTO — Repository — Model (kiểu mỗi module trong NestJS)

Mục đích: chuẩn hóa cách tổ chức code trong `modules/*` để dễ maintain, test và tái sử dụng.

Nguyên tắc chung
- Model (Prisma/Zod): định nghĩa schema (một nguồn truth) nằm trong `modules/<name>/auth.model.ts` hoặc dùng `packages/schemas` nếu dùng chung.
- DTO: sử dụng `nestjs-zod` hoặc `class-validator` tuỳ context; đặt trong `modules/<name>/dto/*.ts`. DTO dành cho input (request) và response schema cho API.
- Repository: encapsulate tất cả tương tác với DB (Prisma). Đặt `modules/<name>/repository/<name>.repo.ts`. Không tự động register repository làm global provider — repository là implementation detail, service sẽ `new Repository(prisma)` hoặc bạn có thể provide factory nếu cần DI.
- Service: orchestration business logic, gọi Repository, external API (Clerk), và trả dữ liệu đã convert sang DTO-friendly shapes (dates → ISO string).
- Controller: chỉ orchestration HTTP → gọi Service; không gọi repository trực tiếp.

Thư mục mẫu (per module)
```
modules/
  auth/
    auth.controller.ts
    auth.service.ts
    auth.model.ts        # zod schemas hoặc types
    dto/
      auth.dto.ts       # createZodDto classes
    repository/
      auth.repo.ts      # class AuthRepository { constructor(prisma) ... }
    __tests__/
      auth.service.spec.ts
      auth.controller.spec.ts
```

Quy tắc chi tiết
- DTO chỉ cho input/output API; convert Date -> string trong repository/service trước khi trả.
- Repository không nên chứa logic business (hysteresis, rate-limit, token logic...). Chỉ CRUD / queries / transactions.
- Repository không bắt buộc phải được `@Injectable()` hay đăng ký trong `@Module.providers` nếu bạn tạo nó trực tiếp trong Service (pattern lựa chọn của repo này). Nếu muốn DI hóa repository, export provider từ module tương ứng.
- Service chịu trách nhiệm: validation business-level (beyond DTO), orchestration giữa repository và bên thứ ba (Clerk), tạo internal tokens, và trả data phù hợp với DTO.
- Controller chỉ: authenticate/authorize (guards), nhận request, gọi service, trả response chuẩn `{ success, data }`.

Tiêu chuẩn code & ví dụ ngắn (TypeScript/NestJS)
- `auth.model.ts` (Zod source-of-truth):
  - Ex: export const UserSchema = z.object({ id: z.string(), email: z.string().email(), createdAt: z.date() })
  - Export types: export type UserType = z.infer<typeof UserSchema>

- `dto/auth.dto.ts` (createZodDto):
  - export class RegisterResponseDto extends createZodDto(RegisterResponseSchema) {}
  - Use DTOs only in controller signatures and for request validation pipes

- `repository/auth.repo.ts`:
  - class AuthRepository { constructor(private prisma: PrismaService) {} async createUser(data){ return prisma.user.create(...); } }
  - Convert DB Date -> ISO string here or in service (choose one place consistently)

- `service/auth.service.ts`:
  - Inject `PrismaService` and `ClerkIntegrationService`.
  - Instantiate `AuthRepository` using `new AuthRepository(this.prisma)` (or inject it if provided).
  - Orchestrate verifyToken → getOrCreateUser → create access token

Testing guidance
- Unit tests: mock `PrismaService` and `ClerkIntegrationService` in `auth.service.spec.ts` and test orchestration.
- Controller tests: mock `AuthService` (as shown in repo tests) and assert HTTP behavior.
- Integration/E2E: use testcontainers Postgres to run DB migrations and test end-to-end flows.

Observability & hardening
- Metrics: `prom-client` default metrics at `/metrics` (with `@SkipThrottle`).
- Health: `/health`, readiness `/ready` (no DB touch if `SKIP_DB=1`).
- Sentry: optional init via `SENTRY_DSN`; global `SentryExceptionFilter` captures exceptions.
- Throttling: `@nestjs/throttler` v6 with array config (ttl in ms). Global guard via `APP_GUARD`.

When to change pattern
- Nếu repository cần be injected across modules or you need multiple implementations, register repository as provider in module and export.
- Nếu you want compile-time strict Prisma delegates, prefer using `PrismaClient` types and `prisma generate` flow; otherwise a minimal typed delegate in repo is acceptable.

Document the contract
- For each module add a small contract comment header in `auth.service.ts` with: Input, Output, Edge cases (see repo-wide comment header standard).

Ví dụ comment header (copy vào service file)
```ts
/**
 * Mục đích: exchange Clerk token → internal access token
 * Input:  Clerk JWT từ frontend
 * Output: { accessToken, user }
 * Edge:   invalid token → throw UnauthorizedException
 */
```

Kết luận
- Tuân theo pattern này giúp code rõ ràng, dễ test và maintain. Luôn giữ Zod schemas trong `modules/*/auth.model.ts` hoặc `packages/schemas` để tránh mismatch giữa FE/Nest/Python.

