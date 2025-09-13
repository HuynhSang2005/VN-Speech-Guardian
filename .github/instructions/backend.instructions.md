---
applyTo: "apps/gateway-nest/**/*"
---

# NestJS Backend Guidelines

## 1. Module structure
modules/
  auth/
  sessions/
  transcripts/
  detections/
  stats/
  ws/

## 2. File naming
- controller:  feature.controller.ts
- service:     feature.service.ts
- repository:  feature.repository.ts (dùng Prisma)
- dto:         feature.dto.ts (Zod schema từ shared-protocol)
- unit test:   feature.service.spec.ts
- e2e test:    feature.e2e-spec.ts

## 3. Logic rules
- Mọi hàm public phải có JSDoc: Mục đích, Input, Output, Edge cases
- Không throw lỗi nội bại, chỉ dùng HttpException (Nest) có mã rõ ràng
- Transaction: dùng Prisma $transaction
- Cache stats: dùng Map (memory) – sau nâng Redis

## 4. Ví dụ code mẫu
```ts
// vi: lấy danh sách phiên của user có phân trang
async findManyByUserId(
  userId: string,
  { page, limit }: PageDto,
): Promise&lt;Session[]&gt; {
  return this.prisma.session.findMany({
    where: { userId },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { startedAt: 'desc' },
  });
}

## 5. Testing
- unit: mock Prisma (guide dùng jest-mock-extended)
- e2e: supertest + TestContainer Postgres (hoặc SQLite)
- coverage ≥80 %