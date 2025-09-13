
### `.github/instructions/db.instructions.md`
```markdown
---
applyTo: ["apps/gateway-nest/prisma/**/*", "infra/*"]
---

# Database Guidelines

## 1. Only edit schema.prisma – không sửa migration tay
```prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  hash      String
  role      String     @default("user")
  createdAt DateTime   @default(now())
  sessions  Session[]
}

model Session {
  id        String       @id @default(cuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  startedAt DateTime     @default(now())
  endedAt   DateTime?
  device    String?
  lang      String       @default("vi")
  transcripts Transcript[]
  detections  Detection[]
  @@index([userId, startedAt])
}

model Transcript {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  segIdx    Int
  text      String
  startMs   Int
  endMs     Int
  words     Json     // [{word,start,end,conf}]
  createdAt DateTime @default(now())
  @@index([sessionId, segIdx])
}

model Detection {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  transcriptId String?
  label     String   // CLEAN | OFFENSIVE | HATE
  score     Float
  startMs   Int
  endMs     Int
  snippet   String
  severity  String   // mild | moderate | severe
  createdAt DateTime @default(now())
  @@index([sessionId, createdAt])
  @@index([label])
}
```

## 2. Naming convention
- table: snake_case plural (users, sessions, transcripts)
- field: camelCase (userId, startedAt)
- index: idx_tablename_field1_field2

## 3. Example index
model Detection {
  ...
  @@index([sessionId, createdAt])
  @@index([label])
}

## 4. Migration flow
pnpm prisma migrate dev --name add_field_xyz
pnpm prisma generate

## 5. Seed data
prisma/seed.ts – tạo 1 user admin/admin, 2 session mẫu