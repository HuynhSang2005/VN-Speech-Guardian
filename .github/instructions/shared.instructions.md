---
applyTo: "packages/shared-protocol/**/*"
---

# Shared Protocol Guidelines

## 1. Mọi thay đổi phải đồng bộ TS (Zod) & Python (Pydantic v2)
## 2. Export từ index.ts & python/__init__.py
## 3. Không import từ apps/ vào shared – chỉ chiều ngược lại
## 4. Test validate: TS object stringify → Python parse OK