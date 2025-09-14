applyTo:
  - "apps/gateway-nest/prisma/**/*"
  - "infra/*"

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
  id        String    @id @default(cuid())
  clerkId   String    @unique
  email     String
  role      Role      @default(USER)
  createdAt DateTime  @default(now())
  sessions  Session[]
}

model Session {
  id          String        @id @default(cuid())
  userId      String
  device      String?
  lang        String        @default("vi")
  startedAt   DateTime      @default(now())
  endedAt     DateTime?
  transcripts Transcript[]
  detections  Detection[]
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Transcript {
  id        String       @id @default(cuid())
  sessionId String
  segIdx    Int
  text      String
  startMs   Int
  endMs     Int
  words     Json         // word-level timestamps
  session   Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  detections Detection[]
}

model Detection {
  id           String     @id @default(cuid())
  sessionId    String
  transcriptId String?
  label        Label
  score        Float
  startMs      Int
  endMs        Int
  snippet      String
  severity     Severity
  createdAt    DateTime   @default(now())
  session      Session    @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  transcript   Transcript? @relation(fields: [transcriptId], references: [id], onDelete: SetNull)
}

enum Role  { USER ADMIN }
enum Label { CLEAN OFFENSIVE HATE }
enum Severity { LOW MEDIUM HIGH }
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