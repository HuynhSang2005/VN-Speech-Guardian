# Frontend guide — Clerk integration (recommended setup)

This document is a concise, frontend-focused guide for integrating Clerk with the VN Speech Guardian frontend and the NestJS gateway.

Goals:
- Authenticate users with Clerk on the frontend
- Send Clerk token to the gateway to create/sync a local user
- Use the Clerk token for authenticated REST and WebSocket calls

Prerequisites
- Frontend: React + Vite (TypeScript recommended)
- You have a Clerk project and a publishable key for the frontend

1) Install

```bash
npm install @clerk/clerk-react
```

2) Wrap your app with ClerkProvider

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

3) Auth hook (recommended)

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

4) Small API helper

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

5) WebSocket / audio connections

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

6) Key backend endpoints (quick reference)

- POST /api/auth/clerk
  - Purpose: Verify Clerk token (Authorization header or { token }) and create/sync local user
  - Returns: { success: true, data: { user } }

- GET /api/auth/me
  - Purpose: Get current user (uses guard)

- Sessions and Stats endpoints exist (see OpenAPI snapshot `apps/gateway-nestjs/public/openapi.json`).

7) Environment variables (FE)

Create a `.env` with:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=http://localhost:3000
```

8) WebSocket notes & best practices

- Send token on connection; gateway uses guard to validate.
- If you plan to stream audio, chunk at 200–1000ms windows to reduce latency.
- Handle disconnects & reconnection logic; server may retry to FastAPI on transient errors.

9) Troubleshooting

- 401 from `/api/auth/clerk`: verify token is a Clerk session token and `CLERK_JWT_KEY` is set on backend.
- Generator/Swagger: If generator fails, backend may attempt DB connection; run `npm run generate:openapi` from `apps/gateway-nestjs` after `npm ci`.

10) Example flow (summary)

1. User signs in via Clerk on FE.
2. FE hook retrieves Clerk token and POSTs to `/api/auth/clerk`.
3. Gateway verifies token, creates/updates local user, returns local user in response.
4. FE reuses the Clerk token for REST calls and WebSocket auth.

If you want, I can also produce small copy-paste components for production-ready error handling and retry logic. 
