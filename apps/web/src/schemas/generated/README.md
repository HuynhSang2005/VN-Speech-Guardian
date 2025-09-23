# Generated API Types

This folder contains auto-generated TypeScript types from the VN Speech Guardian
Gateway NestJS OpenAPI specification.

## Files

- `openapi.json` - OpenAPI 3.0 specification từ backend
- `api-types.ts` - Generated TypeScript types từ OpenAPI spec

## Generation Process

### Automatic Regeneration (Recommended)

Add to `package.json` scripts:

```json
{
  "scripts": {
    "generate:api-types": "copy \"../../gateway-nestjs/public/openapi.json\" \"src/schemas/generated/openapi.json\" && npx openapi-typescript src/schemas/generated/openapi.json -o src/schemas/generated/api-types.ts"
  }
}
```

Then run:

```bash
npm run generate:api-types
```

### Manual Steps

1. **Copy OpenAPI spec từ backend:**

   ```bash
   Copy-Item "../../gateway-nestjs/public/openapi.json" "src/schemas/generated/openapi.json"
   ```

2. **Generate TypeScript types:**
   ```bash
   npx openapi-typescript src/schemas/generated/openapi.json -o src/schemas/generated/api-types.ts
   ```

### Backend Update Process

Khi backend có API changes:

1. **Rebuild backend và regenerate OpenAPI:**

   ```bash
   cd ../../gateway-nestjs
   npm run build
   npm run generate:openapi
   ```

2. **Update frontend types:**
   ```bash
   cd ../../web
   npm run generate:api-types
   ```

## Usage in Code

### Import Generated Types

```typescript
import type { paths, components } from "@/schemas/generated/api-types"

// Specific endpoint types
type GetSessionsResponse =
  paths["/api/sessions"]["get"]["responses"][200]["content"]["application/json"]

// Component schemas
type SessionDto = components["schemas"]["SessionDto"]
type CreateSessionDto = components["schemas"]["CreateSessionDto"]
```

### Type-Safe API Client

```typescript
import type { paths } from "@/schemas/generated/api-types"

// Create type-safe fetch wrapper
async function apiRequest<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Response = paths[Path][Method] extends {
    responses: { 200: { content: { "application/json": infer R } } }
  }
    ? R
    : never,
>(path: Path, method: Method, options?: RequestInit): Promise<Response> {
  const response = await fetch(path as string, {
    method: method as string,
    ...options,
  })

  return response.json()
}

// Usage với perfect type inference
const sessions = await apiRequest("/api/sessions", "get")
// sessions is typed as GetSessionsResponse
```

### Integration với Zod Schemas

```typescript
// Compare generated types với our Zod schemas
import type { components } from "@/schemas/generated/api-types"
import { SessionSchema } from "@/schemas/api/sessions.schemas"
import { z } from "zod"

// Ensure our Zod schema matches backend DTO
type BackendSession = components["schemas"]["SessionDto"]
type FrontendSession = z.infer<typeof SessionSchema>

// TypeScript will error if these don't match
const ensureCompatibility: BackendSession = {} as FrontendSession
```

## Benefits

### Type Safety

- **Compile-time validation** of API requests/responses
- **IntelliSense support** for all API endpoints
- **Automatic error detection** when backend changes

### Developer Experience

- **Auto-completion** for API paths, methods, and response types
- **Documentation integration** from OpenAPI comments
- **Refactoring safety** across frontend/backend boundaries

### API Contract Enforcement

- **Schema validation** ensures FE/BE alignment
- **Breaking change detection** during development
- **Version consistency** between client and server

## Best Practices

### 1. Version Control

- **Commit generated files** để team members có consistent types
- **Include in CI/CD** để detect API contract changes
- **Review generated changes** để understand backend impacts

### 2. Integration Pattern

```typescript
// Use generated types for API communication
import type { paths } from "@/schemas/generated/api-types"

// Use Zod schemas for runtime validation
import { SessionSchema } from "@/schemas/api/sessions.schemas"

// Combine both for complete type safety
const response = await fetch("/api/sessions")
const data = await response.json()

// Runtime validation với Zod
const validatedData = SessionSchema.parse(data)
// validatedData có both compile-time và runtime safety
```

### 3. Error Handling

```typescript
// Generated types include error responses
type SessionError =
  paths["/api/sessions"]["get"]["responses"][400]["content"]["application/json"]

// Handle errors với type safety
try {
  const sessions = await apiRequest("/api/sessions", "get")
} catch (error) {
  // error is typed based on API specification
  console.error("Session fetch failed:", error)
}
```

---

**⚠️ Important Notes:**

- **DO NOT manually edit** `api-types.ts` - it will be overwritten
- **Always regenerate** after backend API changes
- **Test thoroughly** after regeneration để ensure compatibility
- **Use Zod schemas** for runtime validation alongside generated types

**🔄 Regeneration Schedule:**

- Before major releases
- After significant backend changes
- When API contract tests fail
- When new endpoints are added

---

_Auto-generated documentation - VN Speech Guardian Frontend Team_
