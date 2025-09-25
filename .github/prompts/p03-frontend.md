# PHASE 3 – ENHANCED FRONTEND REACT

| Task    | Mô tả chi tiết                                                                                                             | Check |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ----- |
| **P20** | Setup **React 19 + Vite 7** workspace: cài enhanced dependencies (Radix UI, Tailwind 4, Axios, TanStack Query/Router, Clerk, Socket.IO, Framer Motion v12, Zustand v5, Wavesurfer, React Hook Form v7) | ✅     |
| **P21** | Implement **TanStack Router** với type-safe routing: `/`, `/login`, `/dashboard`, `/live`, `/sessions/:id` routes với error boundaries và loading states | ✅     |
| **P21B** | Complete **TypeScript Organization**: Extract all inline types to dedicated `types/` and `schemas/` folders, implement enterprise patterns với clean separation between runtime validation và compile-time types | ✅     |
| **P21C** | Setup **OpenAPI Code Generation**: Integrate với NestJS OpenAPI schema generation, create type-safe API client với endpoints (`/api/auth/*`, `/api/sessions/*`, `/api/stats/*`), auto-generate DTOs | ✅     |
| **P22** | Setup **Clerk Authentication**: Custom styling với VN Speech Guardian branding, auth guards, user profile management, `/api/auth/clerk` integration với backend token verification | ✅     |
| **P23** | Create **Professional Axios Client**: interceptors cho Clerk JWT, auto-retry logic, error handling với toast notifications, request tracing, binary upload support cho audio files | ✅     |
| **P24** | Build **Advanced AudioWorklet**: `worklets/audio-processor.ts` với 48→16kHz resampling, VAD detection, real-time analysis, PCM buffer management cho Socket.IO streaming | ✅     |
| **P25** | Implement **Socket.IO Management**: `useSocket` hook với auto-reconnection, heartbeat monitoring, binary audio streaming to AI Worker, type-safe event definitions cho transcript/detection events | ✅     |
| **P26** | Create **Live Processing Interface**: immersive dark-theme UI với circular audio visualizer (300px), real-time transcript panel, detection alerts (CLEAN/OFFENSIVE/HATE), session controls với recording states | ✅     |
| **P27** | Build **Dashboard Analytics**: sidebar layout, metric cards với trends (totalSessions, totalDetections, toxicPercent), Recharts integration, sessions table với filters và pagination từ `/api/sessions` | ✅     |
| **P28** | Implement **React 19 + Modern Patterns**: React Hook Form v7 + Zod integration, enhanced Zustand v5 stores với TypeScript subscriptions, Framer Motion v12 performance optimizations, useActionState cho forms | ✅     |
| **P29** | Create **Enhanced Component Library**: Radix UI compositions (Button với Actions, Form với server validation, Cards với trend indicators, Modals), audio components (visualizer, controls), dashboard components | ✅     |
| **P30** | Setup **Comprehensive Error Boundaries**: Error boundary classes, TanStack Query error handling, fallback components for different error types, integration với monitoring service | ✅     |
| **P31** | Implement **Performance Optimizations**: Code splitting với lazy loading, React.memo strategies, TanStack Query caching, bundle analysis với manual chunking, lighthouse scores >90 | ✅     |
| **P32** | Write **Professional Unit Tests**: Vitest + React Testing Library, MSW cho API mocking với OpenAPI schema, component testing, hooks testing, audio processing tests, coverage >80% | ☐     |
| **P33** | Add **Integration Tests**: E2E flows với Playwright, authentication flows, real-time audio processing, WebSocket testing, cross-browser compatibility cho speech features | ☐     |
| **P34** | Build **Production Docker**: Multi-stage build (Node build → Nginx serve), optimized asset serving, health checks, security headers, environment-based configuration | ☐     |

## 📋 Chi tiết Implementation

### Core Architecture
- **React 19**: Server Components, Actions, useActionState, useOptimistic, concurrent features, ref as prop
- **Vite 7**: Fast dev server, optimized builds, hot module replacement, manual chunking strategy  
- **TypeScript 5.9**: Strict mode với enterprise config (exactOptionalPropertyTypes, noUncheckedIndexedAccess), proper type definitions trong dedicated folders
- **TanStack Ecosystem**: Router (type-safe với file-based routing), Query v5 (enhanced TypeScript inference, queryOptions), optimistic updates

### API Integration & Data Management
- **OpenAPI Integration**: Generated type-safe client từ NestJS schema, full CRUD operations cho Sessions/Transcripts/Stats
- **REST Endpoints**: `/api/auth/clerk` (token verification), `/api/sessions` (CRUD), `/api/stats/overview` (dashboard metrics)  
- **Real-time WebSocket**: Binary audio streaming, transcript events, detection alerts với type-safe events
- **State Management**: Zustand v5 stores với subscriptions, persist middleware, devtools integration

### Authentication & Security  
- **Clerk Integration**: Custom appearance với VN branding colors, auth guards cho protected routes
- **Token Management**: Automatic JWT injection, refresh tokens, `/api/auth/me` integration
- **Axios Client**: Request/response interceptors, auto-retry logic với exponential backoff, CSRF protection
- **Error Handling**: Comprehensive boundaries, user-friendly messages, centralized error reporting

### Audio Processing & Real-time Features
- **AudioWorklet**: Professional audio processing với PCM 16-bit 16kHz resampling
- **VAD Detection**: Voice Activity Detection cho efficient streaming
- **WebSocket**: Binary audio chunks streaming, heartbeat monitoring, auto-reconnection logic  
- **Live UI**: Dark theme interface, circular visualizer với amplitude-based scaling, real-time transcripts

### UI/UX Excellence & Modern Patterns
- **Design System**: Radix UI + Tailwind v4, consistent design tokens, responsive templates
- **Component Architecture**: Container/Presentation pattern, Compound components, Error boundaries
- **Modern React**: React Hook Form v7 + Zod integration, enhanced Zustand patterns, Framer Motion v12 performance
- **Templates**: Dashboard (sidebar layout), Live (immersive fullscreen), Auth (centered card), Sessions (data table)

### Performance & Optimization
- **Bundle Splitting**: Manual chunking strategy (vendor-react, vendor-ui, audio-processing, charts)
- **Code Splitting**: Route-level lazy loading, component-level splitting cho heavy components
- **Caching**: TanStack Query strategies, optimistic updates, stale-while-revalidate patterns
- **Monitoring**: Performance metrics tracking, bundle analysis, runtime monitoring

### Developer Experience & Testing
- **Testing**: Vitest + RTL + MSW (với OpenAPI mocking), Playwright E2E, >80% coverage target
- **Tooling**: ESLint + Prettier theo enterprise patterns, Storybook cho component development  
- **TypeScript**: Strict enterprise configuration, centralized types trong dedicated folders
- **Development**: Pre-commit hooks, hot module replacement, comprehensive error reporting

### Production Readiness & Deployment
- **Docker**: Multi-stage builds, Nginx optimization với gzip compression, security headers
- **Monitoring**: Error boundaries integration với monitoring service, performance tracking
- **SEO**: Meta tags, structured data, social sharing optimization
- **Security**: Content Security Policy, proper CORS configuration, secure headers

### Specific OpenAPI Integration Tasks
- **Auth Endpoints**: `/api/auth/clerk` (POST - token verification), `/api/auth/me` (GET - user info)
- **Session Management**: Full CRUD với `/api/sessions` (list với pagination, create, get detail, delete)
- **Transcripts**: `/api/sessions/{id}/transcripts` integration cho session detail view
- **Dashboard Stats**: `/api/stats/overview` cho overview metrics (totalSessions, totalDetections, toxicPercent)
- **Type Safety**: Generated TypeScript interfaces từ OpenAPI schema cho all DTOs

## 🔧 Technical Implementation Details

### OpenAPI Client Generation
```bash
# Generate type-safe API client từ NestJS OpenAPI schema
npm run generate:api-types
# Outputs: src/api/generated/types.ts, src/api/generated/client.ts
```

### Key API Endpoints Integration
```typescript
// Authentication Flow
POST /api/auth/clerk { token: string } → UserSwaggerDto
GET /api/auth/me → Current user info

// Session Management  
GET /api/sessions?page=1&perPage=10 → SessionListResponseDto
POST /api/sessions { userId, device?, lang? } → SessionCreateResponseDto
GET /api/sessions/{id} → SessionResponseDto  
DELETE /api/sessions/{id} → Success response
GET /api/sessions/{id}/transcripts → TranscriptListResponseDto

// Dashboard Analytics
GET /api/stats/overview → StatsOverviewResponseDto { totalSessions, totalDetections, toxicPercent }

// Health Monitoring
GET /health → Health check status
GET /ready → Readiness probe
GET /metrics → Application metrics
```

### TypeScript Schema Alignment
```typescript
// Generated từ OpenAPI schema
interface SessionDto {
  id: string;
  userId: string; 
  device?: string;
  lang: string; // default "vi"
  startedAt: string;
  endedAt: string | null;
}

interface DetectionDto {
  id: string;
  sessionId: string;
  transcriptId: string | null;
  label: "CLEAN" | "OFFENSIVE" | "HATE";
  score: number; // 0..1 confidence
  startMs: number;
  endMs: number;
  snippet: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
}

interface TranscriptDto {
  id: string;
  sessionId: string;
  segIdx: number; // segment index
  text: string;
  startMs: number;
  endMs: number;
}

interface StatsOverviewDto {
  totalSessions: number;
  totalDetections: number;
  toxicPercent: number;
}
```

### Zustand Store Integration
```typescript
// Audio processing store với OpenAPI types
interface AudioState {
  currentSession: SessionDto | null;
  transcript: TranscriptDto[];
  detections: DetectionDto[];
  // ... other state
}

// Dashboard store với stats integration
interface DashboardState {
  stats: StatsOverviewDto | null;
  sessions: SessionDto[];
  // ... pagination và filtering
}
```

### Component Integration Examples
```typescript
// Dashboard với OpenAPI integration
export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => apiClient.get('/api/stats/overview').then(r => r.data),
  });
  
  return (
    <DashboardLayout>
      <MetricCards 
        totalSessions={stats?.data.totalSessions} 
        totalDetections={stats?.data.totalDetections}
        toxicPercent={stats?.data.toxicPercent}
      />
    </DashboardLayout>
  );
}

// Sessions list với pagination
export function SessionsList() {
  const [page, setPage] = useState(1);
  const { data: sessions } = useQuery({
    queryKey: ['sessions', { page, perPage: 10 }],
    queryFn: () => apiClient.get('/api/sessions', { 
      params: { page, perPage: 10 } 
    }).then(r => r.data),
  });
  
  return (
    <SessionsTable 
      sessions={sessions?.data.items || []}
      total={sessions?.data.total || 0}
      onPageChange={setPage}
    />
  );
}
```

## 📊 Progress Tracking & Quality Gates

### Completion Criteria
- [ ] All OpenAPI endpoints integrated với type-safe client
- [ ] Authentication flow với Clerk + backend token verification
- [ ] Real-time audio processing với WebSocket streaming  
- [ ] Dashboard analytics với live metrics
- [ ] Comprehensive testing coverage >80%
- [ ] Performance optimization với lighthouse score >90
- [ ] Production Docker build ready

### Quality Metrics
- **TypeScript Coverage**: 100% (strict mode, no any types)
- **Test Coverage**: >80% (unit + integration)  
- **Bundle Size**: <500KB (optimized chunking)
- **Performance**: LCP <1.5s, CLS <0.1, FID <100ms
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: CSP headers, secure token handling

## 🚀 Implementation Priority & Dependencies

### Phase 1: Foundation (P21C → P22 → P23)
1. **P21C**: OpenAPI code generation (prerequisite cho tất cả API integration)
2. **P22**: Clerk authentication (prerequisite cho protected routes) 
3. **P23**: Axios client (prerequisite cho API calls)

### Phase 2: Core Features (P24 → P25 → P26)
1. **P24**: AudioWorklet implementation (core audio processing)
2. **P25**: Socket.IO management (real-time communication)
3. **P26**: Live processing interface (main feature UI)

### Phase 3: Dashboard & Analytics (P27 → P28)
1. **P27**: Dashboard analytics (business intelligence)
2. **P28**: Modern React patterns (enhanced UX)

### Phase 4: Polish & Components (P29 → P30 → P31)
1. **P29**: Enhanced component library
2. **P30**: Error boundaries
3. **P31**: Performance optimizations

### Phase 5: Testing & Production (P32 → P33 → P34 → P35)
1. **P32**: Unit tests
2. **P33**: Integration tests  
3. **P34**: Development tooling
4. **P35**: Production build

### Critical Path Dependencies
- **P21C** → All API-related tasks (P22, P23, P27)
- **P22** → Protected routes (P26, P27)
- **P23** → All HTTP requests (P27)
- **P24 + P25** → Live processing (P26)
- **P29** → UI consistency across features
- **P32** → Quality gates cho production readiness
