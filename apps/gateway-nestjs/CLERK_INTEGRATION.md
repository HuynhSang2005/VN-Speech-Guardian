# Clerk integration — Frontend + Backend (2025-09)

This guide explains how VN Speech Guardian integrates with Clerk on both the frontend (React) and the backend (NestJS Gateway) using the modern server SDK `@clerk/backend`.

Goals:
- FE: Authenticate users with Clerk and obtain a session token.
- BE: Verify the Clerk token using `@clerk/backend`, then create/sync a local user in Postgres.
- Reuse the Clerk session token for authenticated REST and WebSocket calls.

Prerequisites
- Frontend: React + Vite
- Backend: NestJS v11, Node 22 LTS
- You have a Clerk project with Publishable and Secret keys

Important
- Server SDK: `@clerk/backend` (replaces deprecated `@clerk/clerk-sdk-node`).
- Token verification on BE is stateless via the public key (`CLERK_JWT_KEY`) or via `CLERK_SECRET_KEY` fallback.

## 1) Frontend: install & provider

```bash
npm install @clerk/clerk-react
```

Wrap your app with ClerkProvider

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
```

## 2) Frontend: Auth hook (recommended)

Create a small hook to centralise token retrieval and backend sync. Key behaviors:
- Wait until Clerk is loaded
- When signed in, get the Clerk token and POST to `/api/auth/clerk` to sync the user
- Expose { user, token, isLoading, isAuthenticated }

```tsx
// src/hooks/useAuth.ts
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'

type UserShape = { id: string; email: string; role: string; clerkId: string }

export function useAuth() {
  const { isSignedIn, getToken, isLoaded } = useClerkAuth()
  const { user } = useUser()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [localUser, setLocalUser] = useState<UserShape | null>(null)

  useEffect(() => {
    let mounted = true
    async function sync() {
      if (!isLoaded) return
      if (!isSignedIn || !user) {
        if (mounted) {
          setToken(null)
          setLocalUser(null)
          setIsLoading(false)
        }
        return
      }

      try {
        const t = await getToken()
        if (!mounted) return
        setToken(t)

        // Sync with gateway. Gateway accepts token in Authorization header or body.
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/clerk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        })

        if (res.ok) {
          const body = await res.json()
          if (mounted) setLocalUser(body.data?.user ?? null)
        } else {
          console.warn('Auth sync failed', await res.text())
        }
      } catch (err) {
        console.error('Auth error', err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    sync()
    return () => {
      mounted = false
    }
  }, [isLoaded, isSignedIn, user, getToken])

  return { user: localUser, token, isLoading, isAuthenticated: !!localUser }
}
```

## 3) Frontend: small API helper

Don't call Clerk hooks from non-component code — pass token down or create a thin helper that receives token.

```ts
// src/services/apiClient.ts
export class ApiClient {
  constructor(private baseUrl = (import.meta.env.VITE_API_URL || '')) {}

  async request(path: string, token: string | null, options: RequestInit = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers })
    return res
  }

  async getJson(path: string, token: string | null) {
    const res = await this.request(path, token)
    return res.json()
  }
}

export const apiClient = new ApiClient()
```

## 4) WebSocket / audio connections

Use the Clerk token for authentication when opening Socket.IO connections. Send token either via `auth` payload or `extraHeaders`.

```ts
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

export function useWebSocket(namespace = '/audio', token?: string | null) {
  const ref = useRef<Socket | null>(null)
  useEffect(() => {
    if (!token) return
    ref.current = io(`${import.meta.env.VITE_API_URL || ''}${namespace}`, {
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
    })

    return () => ref.current?.disconnect()
  }, [namespace, token])

  return ref.current
}
```

## 5) Backend endpoints (quick reference)

- POST /api/auth/clerk
  - Purpose: Verify Clerk token (Authorization header or { token }) and create/sync local user
  - Returns: { success: true, data: { user } }

- GET /api/auth/me
  - Purpose: Get current user (uses guard)

- Sessions and Stats endpoints exist (see OpenAPI snapshot `apps/gateway-nestjs/public/openapi.json`).

## 6) Environment variables — Frontend

Create a `.env` with:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=http://localhost:3000
```

## 7) WebSocket notes & best practices

- Send token on connection; gateway uses guard to validate.
- If you plan to stream audio, chunk at 200–1000ms windows to reduce latency.
- Handle disconnects & reconnection logic; server may retry to FastAPI on transient errors.

## 8) Troubleshooting

- 401 from `/api/auth/clerk`: verify token is a valid Clerk session token and `CLERK_JWT_KEY` is set on backend (or `CLERK_SECRET_KEY` fallback is configured).
- Generator/Swagger: If generator fails, backend may attempt DB connection; run `npm run generate:openapi` from `apps/gateway-nestjs` after `npm ci`.

## 9) Example flow (summary)

1. User signs in via Clerk on FE.
2. FE hook retrieves Clerk token and POSTs to `/api/auth/clerk`.
3. Gateway verifies token, creates/updates local user, returns local user in response.
4. FE reuses the Clerk token for REST calls and WebSocket auth.

If you want, I can also produce small copy-paste components for production-ready error handling and retry logic. 

---

## 10) Backend integration (NestJS Gateway)

Server SDK: `@clerk/backend`.

- Code path
  - Verify token: `src/modules/auth/clerk-integration.service.ts` uses `verifyToken` from `@clerk/backend`.
  - Guard: `src/common/guards/clerk.guard.ts` extracts Bearer token or `__session` cookie, calls the service, and attaches `req.user`.
  - REST: `POST /api/auth/clerk` exchanges the Clerk token and syncs user.

- Env vars (Backend)
  - `CLERK_SECRET_KEY` — Required. Your Clerk secret key (`sk_live_...` or `sk_test_...`). Used to initialize the Clerk client for user fetch.
  - `CLERK_JWT_KEY` — Recommended. Public key (PEM) used to verify session JWT statelessly. If present, BE uses it first. If missing, BE falls back to `secretKey` verification.
  - `ADMIN_EMAIL_DOMAINS` — Optional. Comma-separated domains to auto-assign ADMIN role (e.g., `@company.com`).

- How to obtain `CLERK_JWT_KEY` (Public Key)
  1. Open Clerk Dashboard.
  2. Go to “JWT Templates”. Create a template if needed (defaults are fine for FE session tokens).
  3. Open the template and copy the Public Key (PEM) or JWKS URL.
  4. Paste the Public Key (PEM) into your backend env as `CLERK_JWT_KEY`.

  Note: For key rotation or multi-tenant setups, consider using JWKS. Our current code expects a PEM via `CLERK_JWT_KEY`. If you need JWKS, we can extend verification to use `{ issuer }` and a JWKS fetcher.

- Minimal BE usage pattern (already implemented)
  - `verifyToken(token, { jwtKey })` if `CLERK_JWT_KEY` is set.
  - Fallback: `verifyToken(token, { secretKey })`.
  - Fetch user profile from Clerk via `createClerkClient({ secretKey }).users.getUser(id)` to sync email/metadata into Postgres.

Security notes
- Prefer `CLERK_JWT_KEY` verification for stateless, cache-friendly checks.
- Ensure HTTPS termination and set proper CORS for FE origin.
- Rate-limit is provided by `@nestjs/throttler` (v6.x) and can be disabled with `DISABLE_THROTTLER=1` for CI.

Versioning and packages
- Backend server SDK: `@clerk/backend` (stable).
- The deprecated `@clerk/clerk-sdk-node` has been removed from the project.
