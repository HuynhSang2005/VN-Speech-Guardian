# OpenAPI Development Guide

This guide covers the comprehensive OpenAPI integration implemented in the VN Speech Guardian frontend.

## 🏗️ Architecture Overview

```
Gateway NestJS (Backend)
├─ OpenAPI Spec Generation
│  ├─ @nestjs/swagger decorators
│  ├─ Zod validation schemas
│  └─ Generated: openapi.json
│
Frontend React (This App)
├─ Type Generation
│  ├─ openapi-typescript → api-types.ts
│  └─ Schema sync với backend
├─ Client Generation  
│  ├─ orval → TanStack Query hooks
│  └─ Professional Axios instance
└─ Runtime Validation
   ├─ orval → Zod schemas
   └─ Perfect sync with TypeScript types
```

## 🛠️ Daily Development Workflow

### 1. Auto-Generation Setup
```bash
# Start development with auto-regeneration
npm run generate:watch
# In another terminal
npm run dev
```

**What happens:**
- Backend changes OpenAPI spec → File watcher detects change → Frontend auto-regenerates → TypeScript compiler validates → HMR updates browser

### 2. Manual Generation
```bash
# Full regeneration
npm run generate:api

# Just types (faster for quick checks)  
npm run generate:api-types

# Just client hooks
npm run generate:orval
```

## 📝 Code Generation Details

### TypeScript Types (via openapi-typescript)

**Input:** `apps/gateway-nestjs/public/openapi.json`
**Output:** `src/schemas/generated/api-types.ts`

**Generated content:**
- Request/Response interfaces
- Path parameters types  
- Query parameters types
- Request body types
- Error response types

**Example:**
```typescript
// Auto-generated from OpenAPI spec
export interface CreateSessionDto {
  name: string;
  settings?: {
    autoStart?: boolean;
    detectionThreshold?: number;
  };
}
```

### TanStack Query Hooks (via orval)

**Input:** `apps/gateway-nestjs/public/openapi.json` + `orval.config.ts`
**Output:** `src/api/generated/vNSpeechGuardianAPI.ts`

**Generated content:**
- Query hooks (useQuery, useInfiniteQuery)
- Mutation hooks (useMutation) 
- Query options functions (for advanced patterns)
- Axios client integration

**Example:**
```typescript
// Auto-generated TanStack Query hooks
export const useSessionsControllerCreate = <TError = unknown>(
  options?: { mutation?: UseMutationOptions<CreateSessionResponse, TError, CreateSessionDto> }
) => {
  return useMutation<CreateSessionResponse, TError, CreateSessionDto>({
    mutationFn: (createSessionDto: CreateSessionDto) => {
      return SessionsController.createSession(createSessionDto);
    },
    ...options?.mutation
  });
};
```

### Runtime Validation (via orval-zod)

**Input:** `apps/gateway-nestjs/public/openapi.json`
**Output:** `src/schemas/generated/zod-schemas.ts`

**Generated content:**
- Zod validation schemas
- Runtime type guards
- Form validation helpers
- Perfect sync với TypeScript types

**Example:**
```typescript
// Auto-generated Zod schemas
export const CreateSessionDtoSchema = z.object({
  name: z.string(),
  settings: z.object({
    autoStart: z.boolean().optional(),
    detectionThreshold: z.number().optional(),
  }).optional(),
});

// Type-safe runtime validation
const result = CreateSessionDtoSchema.safeParse(userInput);
```

## 🎯 Common Usage Patterns

### 1. Basic Data Fetching
```typescript
import { useStatsControllerOverview } from '@/api/generated/vNSpeechGuardianAPI';

function Dashboard() {
  const { data, isLoading, error } = useStatsControllerOverview();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <StatsCards data={data} />;
}
```

### 2. Mutations with Optimistic Updates
```typescript
import { useSessionsControllerCreate } from '@/api/generated/vNSpeechGuardianAPI';
import { useQueryClient } from '@tanstack/react-query';

function CreateSessionForm() {
  const queryClient = useQueryClient();
  
  const createSession = useSessionsControllerCreate({
    mutation: {
      onMutate: async (newSession) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['sessions'] });
        
        // Optimistically update the cache
        const previousSessions = queryClient.getQueryData(['sessions']);
        queryClient.setQueryData(['sessions'], (old) => ({
          ...old,
          data: { ...old.data, items: [...old.data.items, newSession] }
        }));
        
        return { previousSessions };
      },
      onError: (err, newSession, context) => {
        // Rollback on error
        queryClient.setQueryData(['sessions'], context.previousSessions);
      },
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      },
    },
  });
  
  return <SessionForm onSubmit={createSession.mutate} />;
}
```

### 3. Advanced Query Options
```typescript
import { getStatsControllerOverviewQueryOptions } from '@/api/generated/vNSpeechGuardianAPI';

function useRealtimeStats() {
  return useQuery({
    ...getStatsControllerOverviewQueryOptions(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchIntervalInBackground: false, // Pause when tab inactive
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) return false;
      return failureCount < 3;
    },
  });
}
```

### 4. Form Validation với Zod
```typescript
import { CreateSessionDtoSchema } from '@/schemas/generated/zod-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

function SessionForm() {
  const form = useForm({
    resolver: zodResolver(CreateSessionDtoSchema),
    defaultValues: {
      name: '',
      settings: {
        autoStart: false,
        detectionThreshold: 0.5,
      },
    },
  });
  
  // Full type safety và runtime validation
  const onSubmit = (data) => {
    // data is fully typed as CreateSessionDto
    createSession.mutate(data);
  };
  
  return <Form {...form} onSubmit={form.handleSubmit(onSubmit)} />;
}
```

## 🔧 Configuration & Customization

### Orval Configuration (orval.config.ts)

**Key settings you can customize:**
- **Operation naming**: How API hooks are named
- **Base URL**: API endpoint configuration
- **Auth integration**: How tokens are injected
- **Error handling**: Custom error transformation
- **Type overrides**: Custom type mappings

### API Client Customization (src/lib/api-client.ts)

**Available customizations:**
- **Base URL**: Environment-specific endpoints
- **Timeout settings**: Request timeout configuration
- **Retry logic**: Backoff strategies
- **Interceptors**: Request/response transformation
- **Error handling**: Custom error responses

## 🚨 Troubleshooting

### Common Issues

**1. Generation Fails**
```bash
# Check if OpenAPI spec is valid
npx swagger-codegen-cli validate -i ../gateway-nestjs/public/openapi.json

# Clean and regenerate
rm -rf src/schemas/generated/ src/api/generated/
npm run generate:api
```

**2. Type Mismatches**
- Backend changed schema but frontend not regenerated
- Solution: `npm run generate:api`

**3. Runtime Validation Errors**
- OpenAPI spec không match actual API responses
- Check backend logs and update spec

### Performance Issues

**1. Large Bundle Size**
- Generated code is too large
- Use tree shaking: `"sideEffects": false` trong package.json
- Consider splitting API clients by feature

**2. Too Many API Calls**
- Check TanStack Query devtools
- Adjust `staleTime` and `cacheTime`
- Use `select` to minimize re-renders

## 🔄 Maintenance

### Regular Tasks

**Weekly:**
- Check for orval/openapi-typescript updates
- Review generated code for any breaking changes
- Update API client configurations if needed

**On Backend Schema Changes:**
- Regenerate frontend code: `npm run generate:api`  
- Fix any TypeScript errors
- Update API integration tests
- Test in development environment

### CI/CD Integration

**Option 1: Generate in CI**
```yaml
- name: Generate API Code
  run: |
    npm install
    npm run generate:api
    # Commit generated files or fail if changes detected
```

**Option 2: Pre-commit Generation** 
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run generate:api && git add ."
    }
  }
}
```

## 📚 Additional Resources

- [OpenAPI TypeScript Generator](https://github.com/drwpow/openapi-typescript)
- [Orval Documentation](https://orval.dev/)
- [TanStack Query Guide](https://tanstack.com/query/latest)
- [React Hook Form với Zod](https://react-hook-form.com/get-started#SchemaValidation)

---

**Next Steps:** Move to P22 - Clerk Authentication Integration