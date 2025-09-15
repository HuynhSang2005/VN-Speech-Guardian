# PHASE 1 – NESTJS GATEWAY 

| Task    | Mô tả chi tiết                                                                                                     | Check         |
| ------- | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| **P01** | Tạo **NestJS project** trong `apps/api`, cài đặt đầy đủ dependencies (swagger, prisma, clerk, pino, jest)         | ✅             |
| **P02** | Viết **Prisma schema** (user, session, transcript, detection) → chạy `npm run db:migrate-dev`                      | ✅             |
| **P03** | Tạo **ClerkGuard** – verify JWT, attach `req.user`                                                                 | ✅             |
| **P04** | Tạo **REST** `/api/auth/clerk` – exchange Clerk JWT → internal accessToken                                         | ✅             |
| **P05** | Tạo **REST** `/api/sessions` – CRUD, phân trang, validate Zod                                                      | ✅             |
| **P06** | Tạo **REST** `/api/sessions/:id/transcripts` – list transcript                                                     | ✅             |
| **P07** | Tạo **REST** `/api/stats/overview` – dashboard metric                                                              | ✅             |
| **P08** | Tạo **WebSocket Gateway** `/audio` – forward ArrayBuffer → FastAPI, emit kết quả                                   | ✅             |
| **P09** | Sinh **DTO** từ Zod bằng `nestjs-zod` → tự động có OpenAPI                                                         | ✅             |
| **P10** | Viết **unit test** Jest – mock Prisma, coverage > 90 %                                                             | ✅             |
| **P11** | Viết **e2e test** – Supertest, testcontainer Postgres                                                              | ⧗ in-progress |
| **P12** | Hoàn chỉnh Swagger NestJs OpenAPI                                                                                  | ☐             |
| **P13** | Viết **Dockerfile** multi-stage (build → runner)                                                                   | ☐             |


> NOTE: P10 completed (gateway unit tests + coverage). Starting P11 — I'll implement e2e tests using Supertest + Testcontainers for Postgres next.

## P04 implementation notes

- Files implementing the flow:
	- `apps/gateway-nestjs/src/modules/auth/auth.controller.ts` — POST `api/auth/clerk` endpoint, accepts token in body or Authorization header and delegates to `AuthService.exchangeClerkToken`.
	- `apps/gateway-nestjs/src/modules/auth/auth.service.ts` — `exchangeClerkToken` verifies Clerk token via `ClerkIntegrationService`, syncs/creates user, signs internal JWT via `JwtService` and returns `{ accessToken, user }`.
	- `apps/gateway-nestjs/src/modules/auth/clerk-integration.service.ts` — `verifyToken` and `getOrCreateUser` helpers used by the service and guard.
	- `apps/gateway-nestjs/src/common/guards/clerk.guard.ts` — guard that verifies token and attaches `req.user` (used by `GET /api/auth/me`).

- Tests and verification:
	- Unit tests for auth controller and auth repo are present and passing: `src/modules/auth/__tests__/auth.controller.spec.ts` and `auth.repo.spec.ts` (both pass locally).
	- TypeScript typecheck (`npx tsc --noEmit`) passes after a small injection fix.

- Notes:
	- `AuthService` now injects `ClerkIntegrationService` in constructor to avoid runtime undefined errors.
	- Controller response typing updated to include `accessToken` so returned shape matches types.
