---
applyTo: "**/*"
---

# Naming Convention Instructions

## File
- **Nest**: camelCase – `tên.controller.ts`, `tên.service.ts`
- **Python**: snake_case – `tên.py`
- **React**: PascalCase – `TênComponent.tsx`, `useTênHook.ts`

## Biến & hàm
- Boolean: tiền tố `is/has/should` → `isConnected`, `hasPermission`
- Constant: UPPER_SNAKE – `MAX_CHUNK_SIZE = 1024`
- Hàm: động từ – `createSession()`, `validateChunk()`

## Type
- Type: tiền tố `T` – `TDetection`, `ISession`
- Schema Zod: thêm `Schema` hậu tố – `DetectionSchema`
```
