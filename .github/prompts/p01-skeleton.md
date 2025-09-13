# P01 – Skeleton & Health Check

Mục tiêu: repo chạy được, CI xanh, health check 3 service

## Step nhỏ
1. Tạo đúng folder tree như trên.
2. Viết README.md hướng dẫn pnpm install & pip install.
3. Tạo docker-compose.dev.yml → chỉ postgres + adminer.
4. Viết health check:
   - NestJS GET /health → {status:"ok", service:"gateway"}
   - FastAPI GET /health → {status:"ok", service:"asr"}
   - React fetch /health → hiện status.
5. GitHub Actions: lint + test + build (chỉ fail khi test đỏ).
6. Push → CI xanh.

## Test accept
- docker compose -f infra/docker-compose.dev.yml up -d → postgres chạy
- pnpm dev (3 terminal) → 3 health = ok
- CI pass