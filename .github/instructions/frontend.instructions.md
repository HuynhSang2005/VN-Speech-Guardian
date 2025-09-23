---
applyTo: "apps/web/**/*"
---

# Frontend Instructions

## 1. Tech stack với latest stable versions
- **React v19** - Actions, useActionState, useOptimistic, ref as prop
- **Vite v7** - Fast dev server + optimized build
- **TypeScript v5.9.2** - Strict mode với latest compiler
- **Radix UI v1.4.3** - Headless accessible components
- **TailwindCSS v4** - Modern CSS-in-JS với container queries
- **TanStack Query v5** - Powerful server state management
- **TanStack Router v1** - Type-safe file-based routing
- **socket.io-client v4** - Real-time WebSocket communication
- **@clerk/clerk-react v5** - Modern authentication
- **Axios v1.7** - HTTP client với interceptors & auto-retry
- **Recharts v2** - Responsive dashboard charts
- **Vitest v2** - Fast unit testing với React Testing Library

## 1.1. Enhanced Libraries for Speech Processing
- **wavesurfer.js v7** - Audio waveform visualization và playback
- **@wavesurfer/react v1** - React wrapper for wavesurfer
- **react-audio-visualizer-pro v3** - Real-time audio spectrum analysis
- **react-use v17** - Essential React hooks collection
- **framer-motion v12** - Hardware-accelerated animations với independent transforms
- **zustand v5** - Lightweight state management với enhanced TypeScript
- **react-hook-form v7** - Performant forms với @hookform/resolvers/zod integration

## 2. Folder structure theo React 19 best practices
```
src/
├─ main.tsx                    # React 19 StrictMode + concurrent features
├─ router.tsx                  # TanStack Router với type registration
├─ routes/                     # File-based routing structure
│  ├─ __root.tsx              # Root layout với error boundaries
│  ├─ _authenticated/         # Protected routes layout
│  │  ├─ dashboard.tsx        # Analytics & metrics dashboard
│  │  ├─ live.tsx             # Real-time speech processing
│  │  └─ sessions/
│  │     ├─ index.tsx         # Session list với pagination
│  │     └─ $sessionId.tsx    # Session detail modal
│  ├─ login.tsx               # Clerk authentication
│  └─ index.tsx               # Landing page
├─ components/
│  ├─ ui/                     # Radix UI composition layer
│  │  ├─ button.tsx           # Button variants với React 19 Actions
│  │  ├─ dialog.tsx           # Modal compositions
│  │  ├─ card.tsx             # Dashboard card components
│  │  └─ form.tsx             # Form với useActionState
│  ├─ audio/
│  │  ├─ visualizer.tsx       # Audio waveform animation
│  │  ├─ recorder.tsx         # Audio capture với AudioWorklet
│  │  └─ controls.tsx         # Start/stop controls
│  ├─ real-time/
│  │  ├─ transcript.tsx       # Live transcription display
│  │  ├─ detection-alert.tsx  # Harmful content notifications
│  │  └─ session-status.tsx   # Connection & processing status
│  └─ dashboard/
│     ├─ metric-card.tsx      # Overview statistics cards
│     ├─ chart-grid.tsx       # Analytics charts grid
│     └─ activity-list.tsx    # Recent sessions list
├─ hooks/
│  ├─ use-auth.ts            # Clerk authentication wrapper
│  ├─ use-socket.ts          # Socket.IO connection management
│  ├─ use-audio.ts           # Audio capture & processing
│  ├─ use-api.ts             # REST API với error handling
│  └─ use-realtime.ts        # Real-time state management
├─ worklets/
│  └─ audio-processor.ts     # AudioWorklet for PCM processing
├─ services/
│  ├─ api.ts                 # HTTP client với interceptors
│  ├─ socket.ts              # Socket.IO configuration
│  ├─ audio.ts               # Audio utilities & validation
│  └─ storage.ts             # Local/session storage helpers
├─ lib/
│  ├─ utils.ts               # Utility functions + cn()
│  ├─ constants.ts           # App constants & configuration
│  └─ validators.ts          # Zod schema validation
└─ types/
   ├─ api.ts                 # API response interfaces
   ├─ audio.ts               # Audio-related types
   └─ global.d.ts            # Global type declarations
```

## 2.1. **CRITICAL**: TypeScript Organization Patterns

### Folder Structure Rules - ALWAYS FOLLOW
> **🚨 KHÔNG ĐƯỢC code trực tiếp types/interfaces hoặc Zod schemas inline**
> **📁 PHẢI đặt trong folder riêng có cấu trúc chuẩn enterprise**

Based on Microsoft TypeScript Guidelines và Bulletproof React architecture:

#### Schemas Folder - Runtime Validation (Zod)
```typescript
src/schemas/
├─ index.ts                  # Central export của tất cả schemas
├─ api/
│  ├─ sessions.schemas.ts    # API response schemas
│  ├─ auth.schemas.ts        # Auth request/response schemas 
│  └─ websocket.schemas.ts   # Socket.IO event schemas
├─ ui/
│  ├─ forms.schemas.ts       # Form validation schemas
│  ├─ app-state.schemas.ts   # App state schemas
│  └─ components.schemas.ts  # Component props schemas
├─ hooks/
│  └─ hook-types.schemas.ts  # Hook configuration schemas
└─ shared/
   ├─ common.schemas.ts      # Shared validation schemas
   └─ constants.schemas.ts   # Enums và constants schemas
```

#### Types Folder - Compile-time Types (TypeScript interfaces)
```typescript
src/types/
├─ index.ts                  # Central export của tất cả types
├─ hooks.ts                  # Hook return types & options interfaces
├─ components.ts             # Component props interfaces (if needed)
├─ api.ts                    # Additional API utility types
├─ utils.ts                  # Utility type definitions
└─ global.d.ts              # Global type declarations & module extensions
```

### **Separation of Concerns Rules**
1. **schemas/ = Runtime validation** với Zod cho data từ external sources
2. **types/ = Compile-time types** với TypeScript interfaces cho internal structure
3. **NEVER mix** - schemas export `z.infer<>` types, types export pure interfaces
4. **Import pattern**: `import type { } from '@/types/*'` và `import { } from '@/schemas/*'`

### **Code Organization Patterns**
```typescript
// ✅ CORRECT - Centralized in schemas/
export const UserSchema = z.object({
  id: z.string(),
  name: z.string()
});
export type TUser = z.infer<typeof UserSchema>;

// ✅ CORRECT - Centralized in types/
export interface UseUserReturn {
  user: TUser | null;
  loading: boolean;
  error: Error | null;
}

// ❌ WRONG - Inline definition
function useUser(): { user: TUser | null; loading: boolean } { ... }
```

### **Modern TypeScript Configuration**
```json
// tsconfig.json - Enterprise settings
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "paths": {
      "@/*": ["./src/*"],
      "@/types/*": ["./src/types/*"],
      "@/schemas/*": ["./src/schemas/*"]
    }
  }
}
```

### **AI Coding Context Rules**
- **Always check** existing schemas/types folders before creating inline definitions
- **Never create** inline interfaces in components, hooks, or utilities
- **Extract immediately** any inline types to appropriate folder structure
- **Research latest** TypeScript enterprise patterns before architectural decisions
- **Follow separation**: Runtime validation (schemas) vs compile-time types (types)

---

## 3. Backend API Integration với comprehensive endpoints

### REST API Endpoints (NestJS Gateway)
```typescript
// Session Management - Full CRUD operations
GET    /api/sessions                    // List với pagination & filtering
POST   /api/sessions                    // Create new session
GET    /api/sessions/:id                // Session detail với metadata
GET    /api/sessions/:id/transcripts    // Complete transcripts với timestamps
GET    /api/sessions/:id/detections     // Filtered detections by severity
DELETE /api/sessions/:id                // Soft delete session

// Authentication & Authorization
POST   /api/auth/clerk                  // Exchange Clerk JWT for session
GET    /api/auth/profile                // Current user profile
PUT    /api/auth/profile                // Update user preferences

// Dashboard Analytics
GET    /api/stats/overview              // Key metrics summary
GET    /api/stats/sessions-timeline     // Session activity over time
GET    /api/stats/detections-breakdown  // Detection types distribution
GET    /api/stats/hourly-activity       // Activity heatmap data

// Health & Monitoring
GET    /api/health                      // Service health check
GET    /api/metrics                     // Performance metrics

// Standardized Response Format
{
  "success": true,
  "data": { ... },
  "meta"?: { 
    "pagination": { "page": 1, "limit": 20, "total": 100 },
    "timestamp": "2025-09-21T10:30:00Z"
  },
  "error"?: { 
    "code": "VSG-001", 
    "message": "Detailed error message",
    "details"?: { ... }
  }
}
```

### WebSocket Events (Socket.IO /audio namespace)
```typescript
// Type-safe Socket.IO event definitions
interface ClientToServerEvents {
  'audio-chunk': (data: AudioChunkData) => void;
  'session-start': (sessionId: string) => void;
  'session-stop': () => void;
  'heartbeat': () => void;
}

interface ServerToClientEvents {
  'transcript-partial': (data: PartialTranscriptData) => void;
  'transcript-final': (data: FinalTranscriptData) => void;
  'detection-alert': (data: DetectionAlertData) => void;
  'session-status': (data: SessionStatusData) => void;
  'error': (error: SocketErrorData) => void;
  'heartbeat-ack': () => void;
}

// Data Transfer Objects với validation
interface AudioChunkData {
  sessionId: string;
  chunk: ArrayBuffer;          // PCM 16-bit 16kHz mono
  sequence: number;            // Chunk ordering
  timestamp: number;           // Client timestamp
  final?: boolean;             // End of stream marker
}

interface DetectionAlertData {
  id: string;
  sessionId: string;
  type: 'CLEAN' | 'OFFENSIVE' | 'HATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;          // 0-1 confidence score
  snippet: string;             // Detected text fragment
  context: string;             // Surrounding text context
  startMs: number;             // Audio timestamp start
  endMs: number;               // Audio timestamp end
  timestamp: string;           // ISO 8601 timestamp
  recommended_action: 'LOG' | 'WARN' | 'BLOCK';
}
```

## 4. React 19 Authentication Flow (Clerk Integration)
```tsx
// App.tsx - Modern Clerk Provider với React 19
import { ClerkProvider } from '@clerk/clerk-react';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routes/__root';

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // Will be set by ClerkProvider
  },
});

// Register router types
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      navigate={(to) => router.navigate({ to })}
      appearance={{
        variables: {
          colorPrimary: '#3B82F6',    // Blue primary
          colorBackground: '#FAFAFA', // Light background  
          colorInputBackground: '#FFFFFF',
          colorText: '#1F2937',       // Dark text
        },
        elements: {
          formButtonPrimary: 'bg-primary hover:bg-primary/90 text-white',
          card: 'shadow-lg border-0 rounded-xl',
          headerTitle: 'text-2xl font-semibold text-gray-900',
          headerSubtitle: 'text-gray-600 mt-2',
          socialButtonsBlockButton: 'border border-gray-300 hover:bg-gray-50',
          formFieldInput: 'border-gray-300 focus:border-primary focus:ring-primary',
        },
      }}
    >
      <RouterProvider router={router} />
    </ClerkProvider>
  );
}

// hooks/use-auth.ts - Comprehensive auth wrapper
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useCallback, useMemo } from 'react';

export function useAuth() {
  const { getToken, isSignedIn, isLoaded, signOut } = useClerkAuth();
  const { user } = useUser();
  
  const getAuthHeaders = useCallback(async () => {
    if (!isSignedIn) throw new Error('User not authenticated');
    const token = await getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'X-Client-Version': '1.0.0',
    };
  }, [getToken, isSignedIn]);

  const profile = useMemo(() => ({
    id: user?.id,
    email: user?.emailAddresses[0]?.emailAddress,
    name: user?.fullName || user?.firstName,
    avatar: user?.imageUrl,
    preferences: user?.publicMetadata as UserPreferences,
  }), [user]);

  return {
    user: profile,
    isAuthenticated: isSignedIn,
    isLoaded,
    getAuthHeaders,
    signOut,
  };
}
```

## 5. Real-time Audio Processing với React 19 Features
```tsx
// hooks/use-socket.ts - Advanced Socket.IO management
import { useAuth } from './use-auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const { getToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const reconnectAttempts = useRef(0);
  
  const connect = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setConnectionState('connecting');
    const token = await getToken();
    
    const newSocket = io('/audio', {
      auth: { token },
      transports: ['websocket'],
      timeout: 10000,
      retries: 3,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      setConnectionState('connected');
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      setConnectionState('disconnected');
      if (reason === 'io server disconnect') {
        // Reconnect manually
        setTimeout(() => connect(), 1000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current < 5) {
        setTimeout(() => connect(), Math.pow(2, reconnectAttempts.current) * 1000);
      }
    });

    setSocket(newSocket);
  }, [getToken, isAuthenticated]);

  useEffect(() => {
    connect();
    return () => {
      socket?.disconnect();
    };
  }, [connect]);

  return { 
    socket, 
    connectionState,
    reconnect: connect,
  };
}

// hooks/use-audio.ts - Professional audio capture
export function useAudio() {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const processorRef = useRef<AudioWorkletNode | null>(null);

  const startCapture = useCallback(async () => {
    try {
      // Request high-quality audio capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          latency: 0.01, // 10ms latency
        },
      });

      const context = new AudioContext({ 
        sampleRate: 16000,
        latencyHint: 'interactive',
      });

      // Load AudioWorklet processor
      await context.audioWorklet.addModule('/worklets/audio-processor.ts');
      
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, 'audio-processor', {
        processorOptions: {
          bufferSize: 4096,
          chunkDuration: 400, // 400ms chunks for optimal processing
        },
      });

      source.connect(processor);
      processor.connect(context.destination);
      
      setMediaStream(stream);
      setAudioContext(context);
      processorRef.current = processor;
      setIsCapturing(true);

      return { context, processor };
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }, []);

  const stopCapture = useCallback(() => {
    mediaStream?.getTracks().forEach(track => track.stop());
    audioContext?.close();
    processorRef.current?.disconnect();
    
    setMediaStream(null);
    setAudioContext(null);
    processorRef.current = null;
    setIsCapturing(false);
  }, [mediaStream, audioContext]);

  return { 
    mediaStream, 
    audioContext, 
    isCapturing, 
    startCapture, 
    stopCapture,
  };
}
```

## 6. Advanced API Layer với Axios & TanStack Query v5
```tsx
// services/api.ts - Professional Axios HTTP client  
import axios, { AxiosResponse, AxiosError } from 'axios';
import { useAuth } from '../hooks/use-auth';
import { toast } from 'sonner';

// Create Axios instance với base configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
  },
});

// Request interceptor - Auto-inject auth headers
axiosInstance.interceptors.request.use(
  async (config) => {
    // Inject auth token if user is authenticated
    const token = await getTokenSafely();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors & auto-retry
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Auto-retry logic for network errors
    if (error.code === 'NETWORK_ERROR' && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      if (originalRequest._retryCount <= 3) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, originalRequest._retryCount - 1) * 1000)
        );
        return axiosInstance(originalRequest);
      }
    }
    
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear auth state and redirect
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Handle 429 Rate Limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      toast.error(`Rate limited. Retry after ${retryAfter || '60'} seconds`);
    }
    
    // Handle 500+ Server Errors
    if (error.response?.status && error.response.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// Helper function to safely get token
async function getTokenSafely(): Promise<string | null> {
  try {
    const { getToken, isSignedIn } = useAuth();
    return isSignedIn ? await getToken() : null;
  } catch {
    return null;
  }
}

// API client class với typed methods
class ApiClient {
  // Session management endpoints  
  sessions = {
    list: (params: SessionListParams) => 
      axiosInstance.get<PaginatedResponse<Session>>('/api/sessions', { params }).then(r => r.data),
    
    create: (data: CreateSessionRequest) => 
      axiosInstance.post<Session>('/api/sessions', data).then(r => r.data),
    
    get: (id: string) => 
      axiosInstance.get<SessionDetail>(`/api/sessions/${id}`).then(r => r.data),
    
    getTranscripts: (id: string) => 
      axiosInstance.get<Transcript[]>(`/api/sessions/${id}/transcripts`).then(r => r.data),
    
    getDetections: (id: string, params?: DetectionFilters) => 
      axiosInstance.get<Detection[]>(`/api/sessions/${id}/detections`, { params }).then(r => r.data),
    
    delete: (id: string) => 
      axiosInstance.delete(`/api/sessions/${id}`).then(r => r.data),

    // Binary audio upload với progress tracking
    uploadAudio: (sessionId: string, audioData: ArrayBuffer, onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      formData.append('audio', new Blob([audioData], { type: 'application/octet-stream' }));
      
      return axiosInstance.post(`/api/sessions/${sessionId}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          onProgress?.(progress);
        },
      }).then(r => r.data);
    },
  };

  // Dashboard stats endpoints
  stats = {
    overview: () => axiosInstance.get<OverviewStats>('/api/stats/overview').then(r => r.data),
    timeline: (params: TimelineParams) => 
      axiosInstance.get<TimelineData>('/api/stats/sessions-timeline', { params }).then(r => r.data),
    detections: () => axiosInstance.get<DetectionBreakdown>('/api/stats/detections-breakdown').then(r => r.data),
    activity: () => axiosInstance.get<HourlyActivity[]>('/api/stats/hourly-activity').then(r => r.data),
  };

  // Health check endpoint
  health = {
    check: () => axiosInstance.get<HealthStatus>('/api/health').then(r => r.data),
  };
}

export const apiClient = new ApiClient();

// React Query hooks với comprehensive error handling
export function useSessions(params: SessionListParams = { page: 1, limit: 20 }) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => apiClient.sessions.list(params),
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
    retry: (failureCount, error) => {
      // Retry only on network errors, not 4xx
      return error instanceof ApiError && error.status >= 500 && failureCount < 3;
    },
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => apiClient.sessions.get(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

// Optimistic mutations với React 19 Actions
export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.sessions.create,
    onMutate: async (newSession) => {
      await queryClient.cancelQueries({ queryKey: ['sessions'] });
      const previousSessions = queryClient.getQueryData(['sessions']);
      
      // Optimistically update sessions list
      queryClient.setQueryData(['sessions'], (old: any) => ({
        ...old,
        data: [
          { ...newSession, id: `temp-${Date.now()}`, createdAt: new Date().toISOString() },
          ...old.data,
        ],
      }));
      
      return { previousSessions };
    },
    onError: (err, newSession, context) => {
      queryClient.setQueryData(['sessions'], context?.previousSessions);
      toast.error('Failed to create session');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
```

## 7. Modern Radix UI Component Compositions
```tsx
// components/ui/button.tsx - React 19 Actions integration
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  action?: () => Promise<void>; // React 19 Action support
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, action, ...props }, ref) => {
    const [isPending, startTransition] = React.useTransition();
    
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (action) {
        event.preventDefault();
        startTransition(async () => {
          await action();
        });
      }
      props.onClick?.(event);
    };
    
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isPending || props.disabled}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

// components/ui/form.tsx - React 19 useActionState
import { useActionState } from 'react';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action: (prevState: any, formData: FormData) => Promise<any>;
  children: React.ReactNode;
}

export function Form({ action, children, ...props }: FormProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  
  return (
    <form action={formAction} {...props}>
      {children}
      {state?.error && (
        <div className="text-sm text-destructive mt-2">
          {state.error}
        </div>
      )}
    </form>
  );
}

// components/audio/visualizer.tsx - Advanced audio visualization
export function AudioVisualizer({ 
  isActive, 
  audioData, 
  className 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !audioData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw circular waveform
    ctx.beginPath();
    ctx.strokeStyle = isActive ? '#10B981' : '#6B7280';
    ctx.lineWidth = 3;
    
    const angleStep = (Math.PI * 2) / audioData.length;
    
    audioData.forEach((value, index) => {
      const angle = index * angleStep;
      const waveRadius = radius + value * 30; // Amplitude scaling
      const x = centerX + Math.cos(angle) * waveRadius;
      const y = centerY + Math.sin(angle) * waveRadius;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.closePath();
    ctx.stroke();
    
    // Add breathing effect when idle
    if (!isActive) {
      const breathingRadius = radius + Math.sin(Date.now() * 0.003) * 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, breathingRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [audioData, isActive]);
  
  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className={cn("rounded-full", className)}
    />
  );
}
```

## 8. UI/UX Design Specifications cho AI Tools

### Live Speech Processing Interface (/live)
**Target Design:** Immersive dark-theme interface optimized for real-time speech processing

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Session Timer | Connection Status | Avatar   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           Circular Audio Visualizer (300px)                │
│               with Start/Stop Button                       │
│                                                             │
│               Status: "Ready to start"                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Live Transcript Panel (300px height):                      │
│ • Real-time text streaming left-to-right                   │
│ • Harmful content highlighted in red with underline        │
│ • Auto-scroll to latest content                           │
│ • Word-level confidence via opacity                        │
│ • Detection alerts as toast notifications                  │
└─────────────────────────────────────────────────────────────┘
```

**AI Design Prompt:**
```
Create a modern speech-to-text interface:
- Dark theme: #1F2937 background, #111827 panels
- Central circular waveform visualizer: 300px diameter, #10B981 green animation
- Large gradient button: 80px diameter, #3B82F6 to #1D4ED8 blue gradient
- Typography: Inter font, #FFFFFF primary text, #9CA3AF secondary
- Toast alerts: Top-right positioning, severity-based colors (orange/red/dark-red)
- Responsive: Mobile collapses transcript to bottom sheet
- Animations: Smooth transitions, breathing effect on idle, pulse on active
```

### Dashboard Analytics (/dashboard)
**Target Design:** Clean admin interface với comprehensive data visualization

**Layout Structure:**
```
┌─────────────┬───────────────────────────────────────────────┐
│   Sidebar   │              Main Content                     │
│   (250px)   │                                               │
│             │ ┌─── Overview Cards (3-card row) ───────────┐ │
│ • Dashboard │ │ Sessions │ Minutes │ Safety Score         │ │
│ • Sessions  │ └─────────────────────────────────────────────┘ │
│ • Settings  │                                               │
│             │ ┌─── Charts Grid (2x2) ──────────────────────┐ │
│ User        │ │ Line Chart    │ Donut Chart               │ │
│ Profile     │ │ Timeline      │ Detection Types          │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ Heatmap       │ Top Phrases Table        │ │
│             │ │ Activity      │ Harmful Content          │ │
│             │ └─────────────────────────────────────────────┘ │
│             │                                               │
│             │ Recent Activity List with Quick Actions       │
└─────────────┴───────────────────────────────────────────────┘
```

**AI Design Prompt:**
```
Design analytics dashboard:
- Light theme: #FAFAFA background, #FFFFFF cards with #E5E7EB borders
- Sidebar: Fixed 250px, #374151 dark gray with #FFFFFF text
- Metric cards: Elevated shadows, trend arrows, large numbers (#1F2937)
- Charts: Recharts components, consistent color palette (#3B82F6, #10B981, #F59E0B)
- Typography: Inter font hierarchy (24px headings, 16px body, 14px captions)
- Responsive: Sidebar collapses to mobile drawer on <768px
```

### Design Tokens cho AI Generation
```css
:root {
  /* Semantic Color System */
  --color-primary: #3B82F6;        /* Blue - primary actions */
  --color-primary-dark: #1D4ED8;   /* Blue dark variant */
  --color-success: #10B981;        /* Green - safe/healthy content */
  --color-warning: #F59E0B;        /* Orange - medium severity alerts */
  --color-danger: #EF4444;         /* Red - harmful content */
  --color-background: #FAFAFA;     /* Light gray app background */
  --color-surface: #FFFFFF;        /* White card/panel surfaces */
  --color-dark: #1F2937;           /* Dark theme background */
  --color-dark-surface: #111827;   /* Dark theme surfaces */
  
  /* Typography Scale */
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-xs: 0.75rem;     /* 12px - tiny labels */
  --font-size-sm: 0.875rem;    /* 14px - small text */
  --font-size-base: 1rem;      /* 16px - body text */
  --font-size-lg: 1.125rem;    /* 18px - subheadings */
  --font-size-xl: 1.25rem;     /* 20px - headings */
  --font-size-2xl: 1.5rem;     /* 24px - page titles */
  --font-size-3xl: 1.875rem;   /* 30px - hero text */
  
  /* Spacing System (8px base) */
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  
  /* Border Radius System */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;  /* Full rounded */
  
  /* Shadow System */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* Animation System */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
  
  /* Z-Index Scale */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal: 1040;
  --z-popover: 1050;
  --z-tooltip: 1060;
}
```

## 9. Performance Optimization Guidelines

### TanStack Router Performance
```typescript
// Optimal route structure for large apps
const routeTree = rootRoute.addChildren({
  // Use object syntax for better TS performance
  authenticatedRoute: authenticatedRoute.addChildren({
    dashboardRoute,
    liveRoute,
    sessionsRoute: sessionsRoute.addChildren({
      sessionListRoute,
      sessionDetailRoute,
    }),
  }),
  publicRoute: publicRoute.addChildren({
    loginRoute,
    indexRoute,
  }),
});

// Narrow LinkProps for better performance
const navigationLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/live', label: 'Live Processing' },
  { to: '/sessions', label: 'Sessions' },
] as const satisfies ReadonlyArray<LinkProps>;
```

### React Query Optimizations
```typescript
// Implement proper caching strategies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,      // 30 seconds
      gcTime: 300000,        // 5 minutes
      retry: (failureCount, error) => {
        return error.status >= 500 && failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Use optimistic updates for better UX
export function useOptimisticSessionUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateSession,
    onMutate: async (variables) => {
      await queryClient.cancelQueries(['session', variables.id]);
      const previous = queryClient.getQueryData(['session', variables.id]);
      
      queryClient.setQueryData(['session', variables.id], {
        ...previous,
        ...variables,
      });
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['session', variables.id], context?.previous);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries(['session', variables.id]);
    },
  });
}
```

## 10. React Templates & Design System Integration

### 10.1. Recommended React Dashboard Templates
**Based on research from shadcn/ui, Horizon UI, and modern React patterns:**

#### A. Dashboard Layout Templates (Choose One)
```tsx
// Template Option 1: Sidebar Dashboard (Horizon UI inspired)
// Best for: Admin interfaces, analytics heavy
// URL: https://github.com/horizon-ui/horizon-tailwind-react-ts
// Features: Collapsible sidebar, breadcrumbs, responsive design

// components/layouts/DashboardLayout.tsx
import { useState } from 'react';
import { Sidebar, Header, Breadcrumbs } from '../ui';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <Breadcrumbs />
            <main className="mt-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Option 2: Top Navigation Dashboard (shadcn/ui blocks)
// Best for: Simple admin, fewer navigation items
// URL: https://ui.shadcn.com/blocks

// components/layouts/SimpleLayout.tsx  
export function SimpleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo />
          <Navigation />
          <UserMenu />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

#### B. Authentication Pages Templates
```tsx
// Template: Centered Auth Card (Clerk + shadcn/ui)
// Source: https://ui.shadcn.com/blocks → Authentication blocks

// components/auth/LoginLayout.tsx
import { SignIn, SignUp } from '@clerk/clerk-react';

export function LoginLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VN Speech Guardian</h1>
          <p className="text-gray-600 mt-2">Protecting Vietnamese Speech</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <SignIn 
            routing="path"
            path="/login"
            appearance={{
              elements: {
                card: 'shadow-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
              }
            }}
          />
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Secured with Clerk Authentication</p>
        </div>
      </div>
    </div>
  );
}

// Alternative: Split Screen Auth (Modern approach)
export function SplitAuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
          <p className="text-xl opacity-90">Advanced Speech Processing Platform</p>
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <SignIn routing="path" path="/login" />
        </div>
      </div>
    </div>
  );
}
```

#### C. Audio Processing Interface Templates
```tsx
// Template: Real-time Audio Dashboard
// Inspired by: Music production interfaces + shadcn/ui blocks

// components/audio/LiveProcessingLayout.tsx
import { AudioVisualizer, TranscriptPanel, DetectionAlerts } from '../ui';

export function LiveProcessingLayout() {
  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Status Bar */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ConnectionStatus />
            <SessionTimer />
          </div>
          <div className="flex items-center space-x-2">
            <RecordingIndicator />
            <EmergencyStop />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4">
        {/* Left Panel - Controls */}
        <div className="col-span-3 space-y-4">
          <AudioControls />
          <SensitivitySettings />
          <DetectionFilters />
        </div>

        {/* Center - Visualizer */}
        <div className="col-span-6 flex items-center justify-center">
          <AudioVisualizer size="large" />
        </div>

        {/* Right Panel - Live Data */}
        <div className="col-span-3 space-y-4">
          <TranscriptPanel />
          <DetectionAlerts />
          <SessionStats />
        </div>
      </div>
    </div>
  );
}

// Alternative: Fullscreen Immersive Mode
export function ImmersiveLiveMode() {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
      {/* Background Particles */}
      <div className="absolute inset-0 opacity-10">
        <ParticleAnimation />
      </div>

      {/* Centered Visualizer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AudioVisualizer size="xlarge" theme="neon" />
      </div>

      {/* Floating Controls */}
      <div className="absolute top-8 left-8">
        <FloatingControls />
      </div>

      {/* Live Transcript Overlay */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <TranscriptOverlay />
      </div>
    </div>
  );
}
```

### 10.2. Radix UI Component Library Extensions

#### A. Enhanced Audio Components
```tsx
// components/ui/audio-visualizer.tsx - Professional audio visualization
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  audioData: Float32Array;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  theme?: 'default' | 'neon' | 'minimal';
}

export function AudioVisualizer({ 
  audioData, 
  isActive, 
  size = 'medium',
  theme = 'default' 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const sizeMap = {
    small: 150,
    medium: 300,
    large: 400,
    xlarge: 500,
  };

  const themeColors = {
    default: {
      primary: '#3B82F6',
      secondary: '#10B981',
      background: '#1F2937',
    },
    neon: {
      primary: '#00FF88',
      secondary: '#FF0080',
      background: '#000000',
    },
    minimal: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      background: '#F9FAFB',
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = themeColors[theme];
    const size = sizeMap[size];
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    if (!isActive) {
      // Breathing circle when inactive
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/4);
      gradient.addColorStop(0, colors.primary + '40');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/4, 0, 2 * Math.PI);
      ctx.fill();
      return;
    }

    // Draw circular waveform
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 4;
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.primary;
    
    for (let i = 0; i < audioData.length; i++) {
      const angle = (i / audioData.length) * Math.PI * 2;
      const amplitude = audioData[i] * 50; // Scale amplitude
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + amplitude);
      const y2 = centerY + Math.sin(angle) * (radius + amplitude);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }, [audioData, isActive, size, theme]);

  return (
    <motion.canvas
      ref={canvasRef}
      width={sizeMap[size]}
      height={sizeMap[size]}
      className="rounded-full"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  );
}
```

#### B. Dashboard Card Components
```tsx
// components/ui/metric-card.tsx - Enhanced dashboard cards
import { Card, CardContent, CardHeader } from './card';
import { Badge } from './badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    period: string;
    direction: 'up' | 'down';
  };
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
  status?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricCard({ title, value, trend, format, status = 'default' }: MetricCardProps) {
  const formatValue = (val: string | number, fmt?: string) => {
    if (typeof val === 'string') return val;
    
    switch (fmt) {
      case 'percentage': return `${val}%`;
      case 'duration': return `${val}s`;
      case 'bytes': return `${(val / 1024 / 1024).toFixed(1)} MB`;
      default: return val.toLocaleString();
    }
  };

  const statusColors = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
  };

  return (
    <Card className={`${statusColors[status]} transition-all hover:shadow-md`}>
      <CardHeader className="pb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value, format)}
          </div>
          
          {trend && (
            <Badge 
              variant={trend.direction === 'up' ? 'success' : 'destructive'}
              className="flex items-center gap-1"
            >
              {trend.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend.value}% {trend.period}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

## 12. React Coding Patterns & Best Practices

### 12.1. React 19 Patterns

#### A. Server Components và Client Components Pattern
```tsx
// ❌ Không nên: Mixing server and client logic
'use client'; // Toàn bộ component thành client

export function DashboardPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setData);
  }, []);
  
  return <div>{/* Complex UI tree */}</div>;
}

// ✅ Nên: Tách server và client components
// dashboard-page.tsx (Server Component)
import { StatsCards, ChartsGrid } from './dashboard-client';

export async function DashboardPage() {
  // Server-side data fetching
  const stats = await fetch('/api/stats').then(r => r.json());
  
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      <StatsCards initialData={stats} />
      <ChartsGrid />
    </div>
  );
}

// dashboard-client.tsx (Client Component)  
'use client';
import { useQuery } from '@tanstack/react-query';

export function StatsCards({ initialData }: { initialData: any }) {
  const { data } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.stats.overview(),
    initialData,
    staleTime: 30000,
  });
  
  return (/* Interactive UI */);
}
```

#### B. Action Functions Pattern (React 19)
```tsx
// ❌ Không nên: Traditional form handling
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  
  try {
    const formData = new FormData(e.target as HTMLFormElement);
    await createSession(formData);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

// ✅ Nên: React 19 Action pattern
async function createSessionAction(prevState: any, formData: FormData) {
  try {
    const result = await apiClient.sessions.create({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    });
    
    // Redirect with success
    redirect(`/sessions/${result.id}`);
  } catch (error) {
    return {
      error: error.message,
      values: Object.fromEntries(formData),
    };
  }
}

export function CreateSessionForm() {
  const [state, formAction, isPending] = useActionState(createSessionAction, null);
  
  return (
    <form action={formAction}>
      <input name="name" defaultValue={state?.values?.name} />
      <input name="description" defaultValue={state?.values?.description} />
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Session'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

#### C. Optimistic Updates Pattern
```tsx
// ✅ Professional optimistic updates
export function useOptimisticSessions() {
  const queryClient = useQueryClient();
  const [optimisticSessions, setOptimisticSessions] = useOptimistic(
    [], // initial state
    (state, action) => {
      switch (action.type) {
        case 'add':
          return [action.session, ...state];
        case 'update':
          return state.map(s => s.id === action.id ? { ...s, ...action.updates } : s);
        case 'remove':
          return state.filter(s => s.id !== action.id);
        default:
          return state;
      }
    }
  );

  const addSession = async (session: CreateSessionRequest) => {
    const tempId = `temp-${Date.now()}`;
    
    // Optimistically add
    setOptimisticSessions({ 
      type: 'add', 
      session: { ...session, id: tempId, createdAt: new Date().toISOString() }
    });
    
    try {
      const result = await apiClient.sessions.create(session);
      // Replace temp with real data
      queryClient.setQueryData(['sessions'], (old: any) => 
        old.data.map((s: any) => s.id === tempId ? result : s)
      );
    } catch (error) {
      // Revert on error
      setOptimisticSessions({ type: 'remove', id: tempId });
      throw error;
    }
  };
  
  return { optimisticSessions, addSession };
}
```

### 12.2. Custom Hooks Patterns

#### A. Compound Hook Pattern
```tsx
// ❌ Không nên: Hooks quá lớn
export function useDashboard() {
  // 200+ lines of mixed logic
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  // ... more state and effects
}

// ✅ Nên: Compose smaller hooks
export function useDashboard() {
  const sessions = useSessions();
  const stats = useStats();
  const filters = useFilters();
  const permissions = usePermissions();
  
  const isLoading = sessions.isLoading || stats.isLoading;
  const hasError = sessions.error || stats.error;
  
  return {
    sessions: sessions.data,
    stats: stats.data, 
    filters,
    isLoading,
    hasError,
    actions: {
      refreshData: () => {
        sessions.refetch();
        stats.refetch();
      },
    },
  };
}

// Individual focused hooks
export function useSessions(filters = {}) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => apiClient.sessions.list(filters),
    staleTime: 30000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.stats.overview(),
    staleTime: 60000,
  });
}
```

#### B. Polymorphic Hook Pattern
```tsx
// ✅ Flexible, reusable API hook
interface UseApiOptions<T> {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  enabled?: boolean;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = unknown>(options: UseApiOptions<T>) {
  const { endpoint, method = 'GET', body, enabled = true, staleTime = 30000 } = options;
  
  if (method === 'GET') {
    return useQuery({
      queryKey: [endpoint],
      queryFn: () => axiosInstance.get(endpoint).then(r => r.data),
      enabled,
      staleTime,
      onSuccess: options.onSuccess,
      onError: options.onError,
    });
  }
  
  return useMutation({
    mutationFn: () => axiosInstance[method.toLowerCase()](endpoint, body).then(r => r.data),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

// Usage examples
const sessions = useApi<Session[]>({ endpoint: '/api/sessions' });
const createSession = useApi<Session>({ 
  endpoint: '/api/sessions', 
  method: 'POST',
  onSuccess: () => toast.success('Session created!'),
});
```

### 12.3. Component Architecture Patterns  

#### A. Container/Presentation Pattern
```tsx
// ✅ Tách logic và UI rõ ràng

// containers/LiveProcessingContainer.tsx - Logic layer
export function LiveProcessingContainer() {
  const { socket, connectionState } = useSocket();
  const { startCapture, stopCapture, isCapturing } = useAudio();
  const [transcript, setTranscript] = useState('');
  const [detections, setDetections] = useState<Detection[]>([]);
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on('transcript-partial', setTranscript);
    socket.on('detection-alert', (alert) => {
      setDetections(prev => [...prev, alert]);
    });
    
    return () => {
      socket.off('transcript-partial');
      socket.off('detection-alert');
    };
  }, [socket]);
  
  const handlers = {
    onStartRecording: startCapture,
    onStopRecording: stopCapture,
    onClearTranscript: () => setTranscript(''),
  };
  
  return (
    <LiveProcessingView
      isCapturing={isCapturing}
      connectionState={connectionState}
      transcript={transcript}
      detections={detections}
      {...handlers}
    />
  );
}

// components/LiveProcessingView.tsx - Presentation layer
interface LiveProcessingViewProps {
  isCapturing: boolean;
  connectionState: 'connected' | 'connecting' | 'disconnected';
  transcript: string;
  detections: Detection[];
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearTranscript: () => void;
}

export function LiveProcessingView(props: LiveProcessingViewProps) {
  return (
    <div className="live-processing">
      <StatusBar connectionState={props.connectionState} />
      <AudioVisualizer isActive={props.isCapturing} />
      <RecordingControls
        isRecording={props.isCapturing}
        onStart={props.onStartRecording}
        onStop={props.onStopRecording}
      />
      <TranscriptPanel 
        text={props.transcript}
        detections={props.detections}
        onClear={props.onClearTranscript}
      />
    </div>
  );
}
```

#### B. Compound Component Pattern
```tsx
// ✅ Flexible, composable components

// components/ui/card.tsx
const CardContext = createContext<{ variant?: string }>({});

function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <CardContext.Provider value={{ variant }}>
      <div className={cn('rounded-lg border bg-card', className)} {...props}>
        {children}
      </div>
    </CardContext.Provider>
  );
}

function CardHeader({ className, ...props }: CardHeaderProps) {
  const { variant } = useContext(CardContext);
  return (
    <div 
      className={cn('flex flex-col space-y-1.5 p-6', {
        'border-b': variant === 'outlined'
      }, className)} 
      {...props} 
    />
  );
}

function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn('font-semibold leading-none tracking-tight', className)} {...props} />;
}

function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

// Export as compound
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;

// Usage - Flexible composition
<Card variant="outlined">
  <Card.Header>
    <Card.Title>Session Statistics</Card.Title>
  </Card.Header>
  <Card.Content>
    <MetricsList />
  </Card.Content>
</Card>
```

### 12.4. Error Handling Patterns

#### A. Error Boundary Pattern
```tsx
// ✅ Comprehensive error boundaries

// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<
  PropsWithChildren<{ fallback?: ComponentType<ErrorBoundaryState> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to monitoring service
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
    
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent {...this.state} />;
    }

    return this.props.children;
  }
}

// Fallback components cho different error types
function DefaultErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="error-boundary">
      <h2>Something went wrong</h2>
      <details style={{ whiteSpace: 'pre-wrap' }}>
        {error && error.toString()}
      </details>
    </div>
  );
}

function AudioErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="text-center p-8">
      <h3>Audio processing failed</h3>
      <p>Please check your microphone permissions and try again.</p>
      <Button onClick={() => window.location.reload()}>Restart</Button>
    </div>
  );
}
```

#### B. Query Error Handling Pattern
```tsx
// ✅ Centralized query error handling
function QueryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallback={({ error, resetErrorBoundary }) => (
            <div className="query-error">
              <h2>Data loading failed</h2>
              <pre>{error?.message}</pre>
              <Button onClick={resetErrorBoundary}>Try again</Button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Per-component error handling
export function SessionsList() {
  const { data, error, isLoading, refetch } = useSessions();
  
  if (error) {
    return (
      <ErrorFallback
        error={error}
        retry={refetch}
        message="Failed to load sessions"
      />
    );
  }
  
  if (isLoading) {
    return <SessionsSkeleton />;
  }
  
  return <SessionsTable data={data} />;
}
```

### 12.5. Performance Patterns

#### A. Code Splitting & Lazy Loading
```tsx
// ✅ Route-based code splitting
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const DashboardPage = lazy(() => import('../pages/Dashboard'));
const LivePage = lazy(() => import('../pages/Live'));
const SessionsPage = lazy(() => import('../pages/Sessions'));

// Route configuration với suspense
export const routes = [
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </Suspense>
    ),
  },
  {
    path: '/live',
    element: (
      <Suspense fallback={<LivePageSkeleton />}>
        <LivePage />
      </Suspense>
    ),
  },
];

// Component-level code splitting
const HeavyChart = lazy(() => 
  import('../components/HeavyChart').then(module => ({ default: module.HeavyChart }))
);

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <Button onClick={() => setShowChart(true)}>Show Chart</Button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

#### B. Memoization Patterns
```tsx
// ✅ Strategic memoization

// Expensive calculations
const expensiveValue = useMemo(() => {
  return processAudioData(audioBuffer);
}, [audioBuffer]);

// Component memoization with custom comparison
const SessionCard = memo(function SessionCard({ 
  session, 
  onSelect,
}: SessionCardProps) {
  return (
    <Card onClick={() => onSelect(session)}>
      <Card.Header>
        <Card.Title>{session.name}</Card.Title>
      </Card.Header>
      <Card.Content>
        <SessionStats stats={session.stats} />
      </Card.Content>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - chỉ re-render khi session data thay đổi
  return prevProps.session.id === nextProps.session.id &&
         prevProps.session.updatedAt === nextProps.session.updatedAt;
});

// Callback memoization
function SessionsList({ sessions }: { sessions: Session[] }) {
  const handleSessionSelect = useCallback((session: Session) => {
    navigate(`/sessions/${session.id}`);
  }, [navigate]);
  
  return (
    <div>
      {sessions.map(session => (
        <SessionCard
          key={session.id}
          session={session}
          onSelect={handleSessionSelect} // Stable reference
        />
      ))}
    </div>
  );
}
```

### 12.6. Coding Standards & Rules

#### A. TypeScript Patterns
```tsx
// ✅ Proper type definitions

// Strict component props
interface BaseComponentProps {
  children?: ReactNode;
  className?: string;
}

interface AudioVisualizerProps extends BaseComponentProps {
  audioData: Float32Array;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large';
  theme?: 'default' | 'neon';
  onStateChange?: (isActive: boolean) => void;
}

// Generic type constraints
interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
  error?: ApiError;
}

// Discriminated unions for better type safety
type SessionStatus = 
  | { type: 'idle' }
  | { type: 'recording'; startedAt: Date }
  | { type: 'processing'; progress: number }
  | { type: 'completed'; result: ProcessingResult }
  | { type: 'error'; error: string };

// Type guards
function isRecordingStatus(status: SessionStatus): status is { type: 'recording'; startedAt: Date } {
  return status.type === 'recording';
}
```

#### B. File Organization Rules
```
src/
├─ components/           # Reusable UI components
│  ├─ ui/               # Base design system components  
│  ├─ forms/            # Form-specific components
│  ├─ audio/            # Audio processing components
│  └─ layouts/          # Layout components
├─ pages/               # Route-level pages  
├─ hooks/               # Custom hooks
├─ services/            # API and external services
├─ stores/              # State management (Zustand)
├─ utils/               # Pure utility functions
├─ lib/                 # Third-party library configurations
├─ types/               # TypeScript type definitions
└─ constants/           # App constants and enums
```

#### C. Naming Conventions
```tsx
// ✅ Consistent naming patterns

// Components: PascalCase
export function AudioVisualizer() {}
export function SessionsList() {}

// Hooks: camelCase với 'use' prefix
export function useSocket() {}
export function useAudioRecorder() {}

// Constants: SCREAMING_SNAKE_CASE
export const MAX_AUDIO_DURATION = 300000;
export const DEFAULT_CHUNK_SIZE = 4096;

// Types/Interfaces: PascalCase
export interface SessionData {}
export type AudioState = 'idle' | 'recording' | 'processing';

// Files: kebab-case
// audio-visualizer.tsx
// session-list.tsx
// use-socket.ts

// CSS classes: kebab-case (Tailwind)
className="audio-visualizer border-2 bg-gray-100"
```

## 13. Kỹ thuật Testing nâng cao
**For Speech Guardian Project:**

1. **Dashboard Page**: Use Sidebar Dashboard template (Option A1)
   - Better for analytics-heavy interface
   - Sidebar can contain audio controls + session filters
   - Main area for metrics & charts

2. **Live Processing Page**: Use Immersive Mode (Audio Template C2)
   - Fullscreen experience for real-time processing
   - Centered visualizer for focus
   - Floating controls for minimal distraction

3. **Authentication**: Use Centered Auth Card (Auth Template B1)
   - Simple, clean approach
   - Matches Clerk's modern design
   - Professional appearance

4. **Session Detail Modal**: Use shadcn/ui Dialog blocks
   - Overlay approach for quick access
   - Maintains context of parent page
   - Good for reviewing session data

**Implementation Priority:**
1. 🚀 Start with Simple Layout for rapid prototyping
2. 📊 Implement Sidebar Dashboard for admin features  
3. 🎵 Build Immersive Live Mode for core functionality
4. 🔐 Integrate Clerk auth with styled templates

## 11. Testing Strategy với Vitest v2
```typescript
// vitest.config.ts - Optimized test configuration
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});

// Component testing với React 19
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import { AudioVisualizer } from '../components/audio/visualizer';

describe('AudioVisualizer', () => {
  const mockAudioData = new Float32Array(128).fill(0.5);
  
  it('renders circular waveform when active', async () => {
    render(<AudioVisualizer isActive={true} audioData={mockAudioData} />);
    
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '300');
    expect(canvas).toHaveAttribute('height', '300');
  });
  
  it('shows breathing effect when inactive', () => {
    render(<AudioVisualizer isActive={false} audioData={mockAudioData} />);
    
    // Test breathing animation is present
    expect(screen.getByRole('img', { hidden: true })).toHaveClass('animate-pulse');
  });
});

// API testing với MSW
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/sessions', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', name: 'Test Session', createdAt: '2025-09-21T10:00:00Z' }
      ],
      meta: { pagination: { page: 1, limit: 20, total: 1 } }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Workflow Summary
**Development Flow:** React 19 concurrent features → TanStack Router type-safe routing → Clerk authentication → Socket.IO real-time → Radix UI accessible components → TailwindCSS styling → Vitest testing

**Key Features:**
- ✅ React 19 Actions for optimistic updates
- ✅ Type-safe routing với auto-completion
- ✅ Real-time audio processing với AudioWorklet
- ✅ Comprehensive error boundaries & loading states
- ✅ Accessible UI components từ Radix
- ✅ Production-ready authentication
- ✅ Advanced caching strategies
- ✅ Professional testing setup

## 14. Modern Library Integration Patterns

### 14.1. React Hook Form v7 + Zod Integration

#### A. Enhanced Form Patterns với React 19
```tsx
// ✅ Modern React Hook Form + Zod + React 19 Actions
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState } from 'react';
import { CreateSessionSchema, type TCreateSession } from '@/schemas/sessions';

// Server Action for form submission
async function createSessionAction(prevState: any, formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}> {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = CreateSessionSchema.parse(rawData);
    
    const result = await apiClient.sessions.create(validatedData);
    redirect(`/sessions/${result.id}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: 'Validation failed',
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    return { error: 'Failed to create session' };
  }
}

// Enhanced form component với comprehensive validation
export function CreateSessionForm() {
  const [actionState, formAction, isPending] = useActionState(createSessionAction, null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<TCreateSession>({
    resolver: zodResolver(CreateSessionSchema),
    defaultValues: {
      name: '',
      description: '',
      settings: {
        language: 'vi',
        sensitivity: 'medium',
        autoStop: true,
      },
    },
  });

  // Sync server-side errors với client-side form state
  useEffect(() => {
    if (actionState?.fieldErrors) {
      Object.entries(actionState.fieldErrors).forEach(([field, errors]) => {
        setError(field as keyof TCreateSession, {
          type: 'server',
          message: errors[0],
        });
      });
    }
  }, [actionState, setError]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Session Name
        </label>
        <input
          {...register('name')}
          className={cn(
            'w-full px-3 py-2 border rounded-md',
            errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
          )}
          placeholder="Enter session name"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={cn(
            'w-full px-3 py-2 border rounded-md',
            errors.description ? 'border-red-500' : 'border-gray-300'
          )}
          placeholder="Describe the session purpose"
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Nested form fields với dot notation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <select {...register('settings.language')} className="w-full px-3 py-2 border rounded-md">
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Sensitivity</label>
          <select {...register('settings.sensitivity')} className="w-full px-3 py-2 border rounded-md">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          {...register('settings.autoStop')}
          className="rounded"
        />
        <label className="text-sm">Auto-stop after silence</label>
      </div>

      {actionState?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{actionState.error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isPending}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isPending || isSubmitting}
        >
          {isPending ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Creating...
            </>
          ) : (
            'Create Session'
          )}
        </Button>
      </div>
    </form>
  );
}
```

#### B. Advanced Form Patterns
```tsx
// ✅ Dynamic form fields với useFieldArray
import { useFieldArray, Control } from 'react-hook-form';

interface DetectionRulesFormProps {
  control: Control<TSessionSettings>;
}

function DetectionRulesForm({ control }: DetectionRulesFormProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detectionRules',
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Detection Rules</h3>
        <Button
          type="button"
          onClick={() => append({ keyword: '', severity: 'medium', action: 'warn' })}
        >
          Add Rule
        </Button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center space-x-3 p-4 border rounded-lg">
          <input
            {...register(`detectionRules.${index}.keyword`)}
            placeholder="Keyword or phrase"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <select
            {...register(`detectionRules.${index}.severity`)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            {...register(`detectionRules.${index}.action`)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="log">Log Only</option>
            <option value="warn">Warn User</option>
            <option value="block">Block Content</option>
          </select>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => remove(index)}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

// ✅ Form validation với custom rules
const advancedSessionSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .refine(async (name) => {
      // Async validation - check if name exists
      const exists = await apiClient.sessions.checkName(name);
      return !exists;
    }, 'Session name already exists'),
  
  settings: z.object({
    maxDuration: z.number()
      .min(60, 'Minimum duration is 1 minute')
      .max(3600, 'Maximum duration is 1 hour'),
    
    detectionRules: z.array(z.object({
      keyword: z.string().min(1, 'Keyword required'),
      severity: z.enum(['low', 'medium', 'high']),
      action: z.enum(['log', 'warn', 'block']),
    })).max(10, 'Maximum 10 detection rules allowed'),
  }),
  
  // Cross-field validation
}).refine((data) => {
  // Complex validation logic across multiple fields
  if (data.settings.detectionRules.some(rule => rule.action === 'block') && 
      data.settings.maxDuration < 300) {
    return false;
  }
  return true;
}, {
  message: 'Sessions with blocking rules must be at least 5 minutes long',
  path: ['settings', 'maxDuration'],
});
```

### 14.2. Zustand v5 Enhanced Patterns

#### A. Type-safe Store với Subscriptions
```tsx
// ✅ Enhanced Zustand store với React 19 integration
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Type-safe store interface
interface AudioState {
  // Core state
  isRecording: boolean;
  audioData: Float32Array | null;
  volume: number;
  sensitivity: number;
  
  // Session data
  currentSession: Session | null;
  transcript: TranscriptSegment[];
  detections: Detection[];
  
  // UI state
  visualizerTheme: 'default' | 'neon' | 'minimal';
  showSettings: boolean;
  
  // Actions với precise typing
  actions: {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    updateAudioData: (data: Float32Array) => void;
    addTranscriptSegment: (segment: TranscriptSegment) => void;
    addDetection: (detection: Detection) => void;
    clearSession: () => void;
    
    // Settings actions
    updateSensitivity: (value: number) => void;
    changeTheme: (theme: 'default' | 'neon' | 'minimal') => void;
    toggleSettings: () => void;
  };
}

// Enhanced store với middleware composition
export const useAudioStore = create<AudioState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          isRecording: false,
          audioData: null,
          volume: 0,
          sensitivity: 0.5,
          currentSession: null,
          transcript: [],
          detections: [],
          visualizerTheme: 'default',
          showSettings: false,

          actions: {
            startRecording: async () => {
              try {
                // Complex async operation
                const sessionId = await apiClient.sessions.create({
                  name: `Session ${new Date().toLocaleString()}`,
                  startedAt: new Date(),
                });

                set({ 
                  isRecording: true,
                  currentSession: { id: sessionId, startedAt: new Date() },
                  transcript: [],
                  detections: [],
                }, false, 'audio/startRecording');
              } catch (error) {
                console.error('Failed to start recording:', error);
              }
            },

            stopRecording: () => {
              const { currentSession } = get();
              
              if (currentSession) {
                // Finalize session
                apiClient.sessions.finalize(currentSession.id);
              }

              set({ 
                isRecording: false,
                audioData: null,
                volume: 0,
              }, false, 'audio/stopRecording');
            },

            updateAudioData: (data: Float32Array) => {
              // Calculate volume from audio data
              const volume = data.reduce((sum, sample) => sum + Math.abs(sample), 0) / data.length;
              
              set({ 
                audioData: data,
                volume: Math.min(volume * 10, 1), // Normalize volume
              }, false, 'audio/updateAudioData');
            },

            addTranscriptSegment: (segment: TranscriptSegment) => {
              set((state) => ({
                transcript: [...state.transcript, segment],
              }), false, 'audio/addTranscript');
            },

            addDetection: (detection: Detection) => {
              set((state) => ({
                detections: [...state.detections, detection],
              }), false, 'audio/addDetection');
            },

            clearSession: () => {
              set({
                currentSession: null,
                transcript: [],
                detections: [],
                audioData: null,
                volume: 0,
              }, false, 'audio/clearSession');
            },

            // Settings actions
            updateSensitivity: (value: number) => {
              set({ sensitivity: Math.max(0, Math.min(1, value)) }, false, 'settings/updateSensitivity');
            },

            changeTheme: (theme) => {
              set({ visualizerTheme: theme }, false, 'settings/changeTheme');
            },

            toggleSettings: () => {
              set((state) => ({ showSettings: !state.showSettings }), false, 'ui/toggleSettings');
            },
          },
        }),
        {
          name: 'audio-storage',
          partialize: (state) => ({
            // Only persist settings, not session data
            sensitivity: state.sensitivity,
            visualizerTheme: state.visualizerTheme,
          }),
        }
      )
    ),
    { name: 'AudioStore' }
  )
);

// Selector hooks for performance
export const useIsRecording = () => useAudioStore((state) => state.isRecording);
export const useAudioData = () => useAudioStore((state) => state.audioData);
export const useCurrentSession = () => useAudioStore((state) => state.currentSession);
export const useTranscript = () => useAudioStore((state) => state.transcript);
export const useDetections = () => useAudioStore((state) => state.detections);
export const useAudioActions = () => useAudioStore((state) => state.actions);

// Advanced selector with computed values
export const useAudioStats = () => useAudioStore((state) => ({
  totalSegments: state.transcript.length,
  totalDetections: state.detections.length,
  highPriorityDetections: state.detections.filter(d => d.severity === 'high').length,
  sessionDuration: state.currentSession 
    ? Date.now() - state.currentSession.startedAt.getTime()
    : 0,
}));

// Subscription hook for side effects
export const useAudioSubscriptions = () => {
  useEffect(() => {
    // Subscribe to recording state changes
    const unsubscribeRecording = useAudioStore.subscribe(
      (state) => state.isRecording,
      (isRecording, prevRecording) => {
        if (isRecording && !prevRecording) {
          // Recording started - setup audio capture
          console.log('🎙️ Recording started');
        } else if (!isRecording && prevRecording) {
          // Recording stopped - cleanup
          console.log('⏹️ Recording stopped');
        }
      }
    );

    // Subscribe to new detections
    const unsubscribeDetections = useAudioStore.subscribe(
      (state) => state.detections,
      (detections, prevDetections) => {
        const newDetections = detections.slice(prevDetections.length);
        newDetections.forEach((detection) => {
          if (detection.severity === 'high') {
            // Show critical alert
            toast.error(`Critical content detected: ${detection.snippet}`);
          }
        });
      }
    );

    return () => {
      unsubscribeRecording();
      unsubscribeDetections();
    };
  }, []);
};
```

#### B. Store Composition Pattern
```tsx
// ✅ Multiple specialized stores với communication
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];
  
  actions: {
    setTheme: (theme: 'light' | 'dark') => void;
    toggleSidebar: () => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
  };
}

export const useUIStore = create<UIState>()((set) => ({
  theme: 'light',
  sidebarOpen: true,
  activeModal: null,
  notifications: [],
  
  actions: {
    setTheme: (theme) => set({ theme }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    openModal: (modalId) => set({ activeModal: modalId }),
    closeModal: () => set({ activeModal: null }),
    
    addNotification: (notification) => set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: crypto.randomUUID() }
      ],
    })),
    
    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    })),
  },
}));

// Cross-store communication
export const useCombinedStore = () => {
  const audioStore = useAudioStore();
  const uiStore = useUIStore();
  
  // Combined actions that affect multiple stores
  const combinedActions = useMemo(() => ({
    startSession: async () => {
      await audioStore.actions.startRecording();
      uiStore.actions.addNotification({
        type: 'success',
        message: 'Recording session started',
        duration: 3000,
      });
    },
    
    stopSession: () => {
      audioStore.actions.stopRecording();
      uiStore.actions.openModal('session-summary');
    },
  }), [audioStore.actions, uiStore.actions]);
  
  return {
    audio: audioStore,
    ui: uiStore,
    actions: combinedActions,
  };
};
```

### 14.3. Framer Motion v12 Performance Optimizations

#### A. Hardware-Accelerated Animations
```tsx
// ✅ Optimized motion components với independent transforms
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// High-performance audio visualizer animation
export function OptimizedAudioVisualizer({ audioData, isActive }: AudioVisualizerProps) {
  const scale = useMotionValue(1);
  const springScale = useSpring(scale, { stiffness: 300, damping: 30 });
  const opacity = useTransform(springScale, [0.8, 1.2], [0.6, 1]);

  useEffect(() => {
    if (isActive && audioData) {
      const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
      scale.set(1 + avgAmplitude * 0.3); // Scale based on audio amplitude
    } else {
      scale.set(1);
    }
  }, [audioData, isActive, scale]);

  return (
    <motion.div
      className="audio-visualizer"
      style={{
        scale: springScale,
        opacity,
      }}
      initial={{ rotate: 0 }}
      animate={{ 
        rotate: isActive ? 360 : 0,
      }}
      transition={{
        rotate: {
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        },
      }}
    >
      <svg width={300} height={300}>
        {audioData?.map((amplitude, index) => {
          const angle = (index / audioData.length) * Math.PI * 2;
          const radius = 80 + amplitude * 40;
          
          return (
            <motion.line
              key={index}
              x1={150}
              y1={150}
              x2={150 + Math.cos(angle) * radius}
              y2={150 + Math.sin(angle) * radius}
              stroke="currentColor"
              strokeWidth={2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: amplitude }}
              transition={{
                pathLength: { duration: 0.1 },
                opacity: { duration: 0.05 },
              }}
            />
          );
        })}
      </svg>
    </motion.div>
  );
}

// ✅ Layout animations với shared elements
const MotionCard = motion.create('div'); // v12 syntax

export function SessionCard({ session, isExpanded, onToggle }: SessionCardProps) {
  return (
    <MotionCard
      layout // Efficient layout animations
      layoutId={`session-${session.id}`} // Shared element transitions
      className="session-card"
      whileHover={{ 
        y: -4,
        transition: { type: "spring", stiffness: 300 } 
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
    >
      <motion.div layout="position" className="card-header">
        <h3>{session.name}</h3>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <ChevronDownIcon />
        </motion.div>
      </motion.div>
      
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <SessionDetails session={session} />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionCard>
  );
}
```

#### B. Gesture Recognition và Touch Interactions
```tsx
// ✅ Advanced gesture handling
import { motion, useDragControls, PanInfo } from 'framer-motion';

export function SwipeableTranscript({ 
  segments, 
  onSwipeDelete 
}: SwipeableTranscriptProps) {
  const dragControls = useDragControls();

  const handleDragEnd = (event: MouseEvent | TouchEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Swipe left to delete (velocity-based detection)
    if (offset < -100 || velocity < -500) {
      onSwipeDelete();
    }
  };

  return (
    <div className="transcript-container">
      {segments.map((segment) => (
        <motion.div
          key={segment.id}
          className="transcript-segment"
          drag="x"
          dragConstraints={{ left: -200, right: 50 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          whileDrag={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            scale: 1.02,
          }}
          layout
        >
          <div className="segment-content">
            <p>{segment.text}</p>
            <div className="segment-actions">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="delete-button"
              >
                <TrashIcon />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ✅ Performance monitoring và optimization
export function useMotionPerformance() {
  useEffect(() => {
    // Track animation performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.includes('motion')) {
          console.log(`Animation ${entry.name}: ${entry.duration}ms`);
          if (entry.duration > 16.67) { // > 60fps threshold
            console.warn('Slow animation detected:', entry.name);
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => observer.disconnect();
  }, []);

  // Reduce motion preference
  const prefersReducedMotion = useReducedMotion();
  
  return {
    shouldAnimate: !prefersReducedMotion,
    animationConfig: prefersReducedMotion 
      ? { duration: 0 }
      : { type: "spring", stiffness: 300, damping: 30 },
  };
}
```

### 14.4. Bundle Analysis và Performance Optimizations

#### A. Modern Bundle Splitting Strategy
```typescript
// ✅ Optimal chunk splitting với Vite
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - stable code that changes infrequently
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['@tanstack/react-router', '@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
          'vendor-motion': ['framer-motion'],
          
          // Feature-based chunks
          'audio-processing': ['wavesurfer.js', 'react-audio-visualizer-pro'],
          'charts': ['recharts', 'd3-scale', 'd3-shape'],
          'utils': ['date-fns', 'lodash-es', 'clsx'],
        },
      },
    },
    
    // Optimize chunk size thresholds
    chunkSizeWarningLimit: 500,
    
    // Enable advanced minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // Tree-shaking optimizations
  define: {
    __DEV__: false, // Remove development code
  },
});

// ✅ Library usage analysis results
const LIBRARY_ANALYSIS = {
  essential: {
    'react': '~45KB (core framework)',
    '@tanstack/react-query': '~15KB (server state)',
    '@tanstack/react-router': '~12KB (routing)',
    'zustand': '~2KB (client state)',
    '@radix-ui/*': '~25KB total (accessibility)',
  },
  
  specialized: {
    'framer-motion': '~35KB (animations - lazy load)',
    'react-hook-form': '~8KB (forms - route-level)',
    'wavesurfer.js': '~45KB (audio - /live route only)',
    'recharts': '~85KB (charts - /dashboard route only)',
  },
  
  utility: {
    'date-fns': '~20KB (cherry-pick functions)',
    'clsx': '~1KB (className utility)',
    'socket.io-client': '~15KB (real-time)',
  },
  
  recommendations: {
    keep: ['All essential libraries are optimally sized'],
    optimize: ['Lazy load framer-motion', 'Tree-shake date-fns', 'Code-split chart components'],
    replace: ['Consider replacing recharts with lighter alternative if not using advanced features'],
  },
} as const;
```

#### B. Runtime Performance Monitoring
```tsx
// ✅ Performance monitoring hook
export function usePerformanceMonitoring() {
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: [],
    bundleSize: 0,
    memoryUsage: [],
  });

  useEffect(() => {
    // Monitor component render performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('Page Load Time:', entry.duration);
        }
        
        if (entry.entryType === 'resource' && entry.name.includes('.js')) {
          metricsRef.current.bundleSize += entry.transferSize || 0;
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    
    // Memory usage monitoring
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metricsRef.current.memoryUsage.push({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        });
      }
    }, 5000);

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  const reportMetrics = useCallback(() => {
    console.table({
      'Bundle Size (KB)': Math.round(metricsRef.current.bundleSize / 1024),
      'Avg Render Time (ms)': metricsRef.current.renderTime.length 
        ? Math.round(metricsRef.current.renderTime.reduce((a, b) => a + b) / metricsRef.current.renderTime.length)
        : 0,
      'Memory Usage (MB)': metricsRef.current.memoryUsage.length
        ? Math.round(metricsRef.current.memoryUsage[metricsRef.current.memoryUsage.length - 1].used / 1024 / 1024)
        : 0,
    });
  }, []);

  return { reportMetrics };
}