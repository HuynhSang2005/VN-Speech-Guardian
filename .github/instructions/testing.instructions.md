## Testing & Lint – Instructions
 
 ## Tech version
- 1. Unit
Nest: npm run test:unit (Jest) – mock Prisma
AI: npm run test:ai (pytest) – mock model
FE: npm run test:fe (Vitest) – RTL
- 2. E2E
Nest: npm run test:e2e – Supertest + testcontainer Postgres
FE: npm run test:e2e:fe – Playwright (headless)
- 3. Coverage target
≥ 70 % cho mỗi service
Không merge PR nếu < 70 %
- 4. Lint
Nest & FE: eslint + prettier
AI: ruff format && ruff check