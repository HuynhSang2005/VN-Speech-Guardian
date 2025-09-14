# PHASE 1 – NESTJS GATEWAY 

| Task    | Mô tả chi tiết                                                                                                     | Check |
| ------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| **P01** | Tạo **NestJS project** trong `apps/api`, cài đặt đầy đủ dependencies (swagger, prisma, clerk, pino, jest) | ✅     |
| **P02** | Viết **Prisma schema** (user, session, transcript, detection) → chạy `npm run db:migrate-dev`                      | ✅     |
| **P03** | Tạo **ClerkGuard** – verify JWT, attach `req.user`                                                                 | ✅     |
| **P04** | Tạo **REST** `/api/auth/clerk` – exchange Clerk JWT → internal accessToken                                         | ✅     |
| **P05** | Tạo **REST** `/api/sessions` – CRUD, phân trang, validate Zod                                                      | ☐     |
| **P06** | Tạo **REST** `/api/sessions/:id/transcripts` – list transcript                                                     | ☐     |
| **P07** | Tạo **REST** `/api/stats/overview` – dashboard metric                                                              | ☐     |
| **P08** | Tạo **WebSocket Gateway** `/audio` – forward ArrayBuffer → FastAPI, emit kết quả                                   | ☐     |
| **P09** | Sinh **DTO** từ Zod bằng `nestjs-zod` → tự động có OpenAPI                                                         | ☐     |
| **P10** | Viết **unit test** Jest – mock Prisma, coverage > 70 %                                                             | ☐     |
| **P11** | Viết **e2e test** – Supertest, testcontainer Postgres                                                              | ☐     |
| **P12** | Viết **Dockerfile** multi-stage (build → runner)                                                                   | ☐     |
