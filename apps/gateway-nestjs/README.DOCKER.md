# Docker image for gateway-nestjs

Build:

```bash
cd apps/gateway-nestjs
docker build -t gateway-nestjs:latest .
```

Run (dev):

```bash
docker run --rm -e DATABASE_URL=postgres://vsg:vsg@host.docker.internal:5432/vsg -p 3001:3001 gateway-nestjs:latest
```

Notes:
- Ensure `DATABASE_URL` and `JWT_SECRET` and `CLERK_...` env vars are provided for production.
- For CI OpenAPI generation set `SKIP_DB=1` before running `ts-node scripts/generate-openapi.ts`.
 
Recommended runtime env vars (example):

```
DATABASE_URL=postgres://vsg:vsg@db:5432/vsg
JWT_SECRET=your_jwt_secret
SENTRY_DSN=
# Prisma connection pooling (read by service for documentation; configure via DATABASE_URL or platform)
PRISMA_POOL_MIN=1
PRISMA_POOL_MAX=10
# Optional: disable throttler in CI/local runs
DISABLE_THROTTLER=1
```
