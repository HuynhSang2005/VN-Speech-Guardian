---
applyTo: "packages/schemas/**/*"
---

# Shared – Zod source-of-truth Instructions

## Version
- zod latest version

## Quy tắc
- **Một schema – ba nơi dùng**:
  - FE validate trước khi gửi
  - NestJS dùng `nestjs-zod` → DTO + OpenAPI
  - FastAPI dùng `datamodel-code-generator` → Pydantic
- **Không đổi tên field** giữa 3 môi trường → tránh lỗi mapping.
- **Export kiểu**:
```ts
export const AudioChunkSchema = z.object({...});
export type AudioChunk = z.infer<typeof AudioChunkSchema>;
```

## Workflow gen
npm run gen   # 1. nestjs DTO, 2. pydantic models, 3. OpenAPI specs
```

---