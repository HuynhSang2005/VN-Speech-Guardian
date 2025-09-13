# P02 – Auth Module (NestJS)

Mục tiêu: login/register, JWT access + refresh httpOnly cookie

## Step nhỏ
1. Prisma schema model User (id,email,hash,role,createdAt).
2. Dùng Passport-JWT local + jwt strategy.
3. Endpoints:
   POST /api/auth/register {email,password}
   POST /api/auth/login    {email,password} → set refresh httpOnly cookie
   POST /api/auth/refresh  (cookie) → new accessToken
   POST /api/auth/logout   (clear cookie)
4. Guard: JwtAuthGuard cho mọi /api/*.
5. Unit test – service & controller (mock bcrypt).
6. E2E test – supertest:
   - register → login → access token → GET /api/me → 200
   - wrong password → 401

## Test accept
- login thành công → cookie refresh xuất hiện
- /api/me có token đúng → trả user
- CI xanh