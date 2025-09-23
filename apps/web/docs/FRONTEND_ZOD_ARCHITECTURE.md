# Frontend Zod Architecture Plan
**VN Speech Guardian - Comprehensive Type Safety Strategy**

## 🎯 Objectives

1. **Replace all TypeScript interfaces** với Zod schemas for runtime validation
2. **Mirror backend patterns** để maintain consistency across fullstack
3. **Organize schemas** into logical domain folders  
4. **Generate TypeScript types** từ OpenAPI spec for perfect BE-FE alignment
5. **Implement form validation** với react-hook-form + Zod resolvers

## 📁 Proposed Folder Structure

```
src/
├─ schemas/                      # Zod source of truth
│  ├─ api/                      # API request/response schemas  
│  │  ├─ auth.schemas.ts        # Authentication API schemas
│  │  ├─ sessions.schemas.ts    # Session management schemas  
│  │  ├─ stats.schemas.ts       # Dashboard analytics schemas
│  │  ├─ real-time.schemas.ts   # WebSocket events schemas
│  │  └─ index.ts               # Re-export all API schemas
│  ├─ ui/                       # UI state schemas
│  │  ├─ app-state.schemas.ts   # Global app state validation  
│  │  ├─ notifications.schemas.ts # Toast notifications schemas
│  │  ├─ audio.schemas.ts       # Audio processing state
│  │  └─ index.ts               # Re-export all UI schemas
│  ├─ forms/                    # Form validation schemas
│  │  ├─ auth-forms.schemas.ts  # Login/register form validation
│  │  ├─ session-forms.schemas.ts # Create/edit session forms
│  │  ├─ settings-forms.schemas.ts # User settings forms
│  │  └─ index.ts               # Re-export all form schemas
│  └─ generated/                # Generated from OpenAPI
│     ├─ api-types.ts           # Auto-generated từ gateway OpenAPI
│     └─ README.md              # Generation instructions
├─ types/                       # Legacy folder (to be deprecated)
│  └─ legacy.ts                 # Keep existing during migration
├─ lib/
│  ├─ validation.ts             # Zod utilities & helpers
│  └─ api-client.ts             # Type-safe API client
└─ hooks/
   ├─ use-validated-api.ts      # Runtime API validation hook
   └─ use-form-validation.ts    # Form validation utilities
```

## 🧩 Implementation Patterns

### 1. Schema Definition Patterns (Mirror Backend)

```typescript
// schemas/api/sessions.schemas.ts
import { z } from 'zod';

// Base Session Schema - match backend SessionSchema
export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(), 
  device: z.string().optional(),
  lang: z.string().default('vi'),
  startedAt: z.string(), // ISO string from API
  endedAt: z.string().nullable().optional(),
});

// API Request Schemas
export const CreateSessionRequestSchema = SessionSchema.pick({
  device: true,
  lang: true,
});

export const ListSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(), 
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// API Response Schemas
export const SessionResponseSchema = SessionSchema.extend({
  // Add computed fields from API
  duration: z.number().optional(),
  transcriptCount: z.number().default(0),
  detectionCount: z.number().default(0),
});

export const SessionListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(SessionResponseSchema),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      limit: z.number(), 
      total: z.number(),
      pages: z.number(),
    }),
    timestamp: z.string(),
  }),
});

// Type Exports - consistent với backend naming
export type TSession = z.infer<typeof SessionSchema>;
export type TCreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type TListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>; 
export type TSessionResponse = z.infer<typeof SessionResponseSchema>;
export type TSessionListResponse = z.infer<typeof SessionListResponseSchema>;
```

### 2. Form Validation Patterns

```typescript
// schemas/forms/session-forms.schemas.ts
import { z } from 'zod';
import { SessionSchema } from '../api/sessions.schemas';

// Form Schema - client-side validation rules
export const CreateSessionFormSchema = SessionSchema.pick({
  device: true,
  lang: true,
}).extend({
  // Form-specific fields
  name: z.string().min(1, 'Session name is required').max(100),
  description: z.string().max(500).optional(),
  // Client-side only validation
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept terms and conditions'
  }),
});

export const SessionSettingsFormSchema = z.object({
  autoStop: z.boolean().default(false),
  maxDuration: z.coerce.number().min(60).max(3600).default(1800), // seconds
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  language: z.enum(['vi', 'en']).default('vi'),
});

// Type Exports
export type TCreateSessionForm = z.infer<typeof CreateSessionFormSchema>;
export type TSessionSettingsForm = z.infer<typeof SessionSettingsFormSchema>;
```

### 3. Real-time Event Schemas

```typescript
// schemas/api/real-time.schemas.ts  
import { z } from 'zod';

// WebSocket Event Schemas
export const AudioChunkDataSchema = z.object({
  sessionId: z.string(),
  chunk: z.instanceof(ArrayBuffer),
  sequence: z.number().int().nonnegative(),
  timestamp: z.number(),
  final: z.boolean().optional().default(false),
});

export const TranscriptPartialSchema = z.object({
  sessionId: z.string(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.number(),
});

export const DetectionAlertSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.enum(['CLEAN', 'OFFENSIVE', 'HATE']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  confidence: z.number().min(0).max(1),
  snippet: z.string(),
  context: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  timestamp: z.string(),
  recommendedAction: z.enum(['LOG', 'WARN', 'BLOCK']),
});

export const SessionStatusSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['idle', 'recording', 'processing', 'completed', 'error']),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
});

// Socket.IO Event Type Definitions
export const ClientToServerEventsSchema = z.object({
  'audio-chunk': z.function().args(AudioChunkDataSchema).returns(z.void()),
  'session-start': z.function().args(z.string()).returns(z.void()),
  'session-stop': z.function().returns(z.void()),
  'heartbeat': z.function().returns(z.void()),
});

export const ServerToClientEventsSchema = z.object({
  'transcript-partial': z.function().args(TranscriptPartialSchema).returns(z.void()),
  'transcript-final': z.function().args(TranscriptPartialSchema).returns(z.void()),
  'detection-alert': z.function().args(DetectionAlertSchema).returns(z.void()),
  'session-status': z.function().args(SessionStatusSchema).returns(z.void()),
  'error': z.function().args(z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  })).returns(z.void()),
  'heartbeat-ack': z.function().returns(z.void()),
});

// Type Exports
export type TAudioChunkData = z.infer<typeof AudioChunkDataSchema>;
export type TTranscriptPartial = z.infer<typeof TranscriptPartialSchema>;
export type TDetectionAlert = z.infer<typeof DetectionAlertSchema>;
export type TSessionStatus = z.infer<typeof SessionStatusSchema>;
```

### 4. Validation Utilities

```typescript
// lib/validation.ts - Zod utilities
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Safe parsing with detailed error handling
 * Returns either parsed data or formatted error
 */
export function safeParse<T>(
  schema: ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: string; issues: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const issues = result.error.issues.map(issue => 
    `${issue.path.join('.')}: ${issue.message}`
  );
  
  return {
    success: false,
    error: `Validation failed: ${issues[0]}`,
    issues,
  };
}

/**
 * Create type-safe API client with runtime validation
 */
export function createValidatedFetcher<TRequest, TResponse>(
  requestSchema: ZodSchema<TRequest>,
  responseSchema: ZodSchema<TResponse>
) {
  return async (url: string, requestData: TRequest): Promise<TResponse> => {
    // Validate request
    const requestResult = safeParse(requestSchema, requestData);
    if (!requestResult.success) {
      throw new Error(`Request validation failed: ${requestResult.error}`);
    }
    
    // Make API call
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestResult.data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Validate response 
    const responseResult = safeParse(responseSchema, responseData);
    if (!responseResult.success) {
      console.error('API Response validation failed:', responseResult.issues);
      throw new Error(`Response validation failed: ${responseResult.error}`);
    }
    
    return responseResult.data;
  };
}

/**
 * React Hook Form resolver for Zod schemas
 */
export function zodResolver<T>(schema: ZodSchema<T>) {
  return async (values: any) => {
    const result = safeParse(schema, values);
    
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    
    const errors: Record<string, { message: string }> = {};
    result.issues.forEach(issue => {
      const path = issue.split(':')[0];
      const message = issue.split(':')[1]?.trim() || 'Invalid value';
      errors[path] = { message };
    });
    
    return { values: {}, errors };
  };
}

/**
 * Environment variable validation
 */
export const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  VITE_WS_ENDPOINT: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type TEnv = z.infer<typeof EnvSchema>;

export function validateEnv(): TEnv {
  const result = safeParse(EnvSchema, import.meta.env);
  
  if (!result.success) {
    console.error('Environment validation failed:', result.issues);
    throw new Error('Invalid environment configuration');
  }
  
  return result.data;
}
```

## 🔄 Migration Strategy

### Phase 1: Schema Foundation (1-2 hours)
1. Create schemas folder structure
2. Define core API schemas (sessions, auth, stats)  
3. Create validation utilities
4. Setup form validation helpers

### Phase 2: Component Migration (2-3 hours)
1. Replace interfaces in existing components
2. Add runtime validation to API calls
3. Implement form validation với react-hook-form
4. Update type imports across codebase

### Phase 3: OpenAPI Integration (1 hour) 
1. Generate TypeScript types từ gateway OpenAPI
2. Compare generated types vs Zod schemas
3. Create mapping between OpenAPI và Zod schemas
4. Document API alignment strategy

### Phase 4: Testing & Validation (1 hour)
1. Test runtime validation in dev environment
2. Verify form validation works correctly
3. Check API response validation catches errors
4. Update existing tests to use new schemas

## 🎉 Benefits Expected

- **Runtime Type Safety**: Catch API inconsistencies at runtime
- **Form Validation**: Rich validation messages với i18n support
- **Developer Experience**: Better autocomplete và IntelliSense
- **Error Prevention**: Invalid data caught early trong development
- **API Alignment**: Perfect sync between frontend và backend types
- **Maintainability**: Single source of truth cho data structures

## 📋 Implementation Checklist

- [ ] Create schemas folder structure
- [ ] Migrate authentication schemas  
- [ ] Migrate session management schemas
- [ ] Migrate dashboard/stats schemas
- [ ] Migrate WebSocket event schemas
- [ ] Create validation utilities
- [ ] Update API client với validation
- [ ] Implement form validation
- [ ] Generate OpenAPI types
- [ ] Create API alignment documentation
- [ ] Update existing component imports
- [ ] Test runtime validation
- [ ] Update unit tests
- [ ] Document patterns for team

---

*Generated by VN Speech Guardian AI Agent - Frontend Architecture Planning*