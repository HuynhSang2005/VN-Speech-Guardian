# Clerk Authentication Integration Guide

## Overview
This guide shows how to integrate Clerk authentication on the frontend with our NestJS backend. The backend automatically handles user creation/sync when you send Clerk tokens.

## Frontend Setup (React with Clerk)

### 1. Install Clerk React
```bash
npm install @clerk/clerk-react
```

### 2. Setup Clerk Provider
```tsx
// src/main.tsx
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
```

### 3. Create Auth Hook
```tsx
// src/hooks/useAuth.ts
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  clerkId: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

export function useAuth(): AuthState {
  const { isSignedIn, user, getToken, isLoaded } = useClerkAuth();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    token: null,
  });

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded) return;

      if (!isSignedIn || !user) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          token: null,
        });
        return;
      }

      try {
        // VI: lấy token từ Clerk
        const token = await getToken();
        
        // VI: sync user với backend
        const response = await fetch('/api/auth/clerk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to sync user');
        }

        const data = await response.json();

        setAuthState({
          user: data.data.user,
          isLoading: false,
          isAuthenticated: true,
          token,
        });
      } catch (error) {
        console.error('Auth sync error:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          token: null,
        });
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken]);

  return authState;
}
```

### 4. API Client with Auto Auth
```tsx
// src/services/apiClient.ts
import { useAuth } from '@clerk/clerk-react';

class ApiClient {
  private baseURL = 'http://localhost:3001';

  async request(endpoint: string, options: RequestInit = {}) {
    const token = await useAuth().getToken();
    
    return fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });
  }

  async get(endpoint: string) {
    const response = await this.request(endpoint);
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }
}

export const apiClient = new ApiClient();
```

### 5. Protected Route Component
```tsx
// src/components/ProtectedRoute.tsx
import { useAuth } from '../hooks/useAuth';
import { SignIn } from '@clerk/clerk-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'ADMIN';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <div>Access denied. Required role: {requiredRole}</div>;
  }

  return <>{children}</>;
}
```

### 6. Usage Examples
```tsx
// src/App.tsx
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SignIn, UserButton } from '@clerk/clerk-react';

function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="App">
      {isAuthenticated ? (
        <>
          <div>Welcome, {user?.email}!</div>
          <div>Role: {user?.role}</div>
          <UserButton />
          
          <ProtectedRoute>
            <SessionsList />
          </ProtectedRoute>

          <ProtectedRoute requiredRole="ADMIN">
            <AdminPanel />
          </ProtectedRoute>
        </>
      ) : (
        <SignIn />
      )}
    </div>
  );
}
```

## WebSocket Authentication

### Frontend WebSocket Setup
```tsx
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export function useWebSocket(namespace: string = '') {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // VI: connect với auth token
    socketRef.current = io(`http://localhost:3001${namespace}`, {
      auth: {
        token,
      },
      extraHeaders: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token, isAuthenticated, namespace]);

  return socketRef.current;
}
```

## Backend API Endpoints

### POST /api/auth/clerk
**Purpose**: Verify Clerk token and sync user to database
**Request**: 
- Body: `{ "token": "clerk-jwt-token" }` (optional if using Authorization header)
- Header: `Authorization: Bearer <clerk-jwt-token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm4abc123",
      "email": "user@example.com", 
      "role": "USER",
      "clerkId": "user_xyz789"
    }
  }
}
```

### GET /api/auth/me
**Purpose**: Get current authenticated user info
**Request**: `Authorization: Bearer <clerk-jwt-token>`
**Response**: Same as above

## Environment Variables

### Frontend (.env)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
```

### Backend (.env)
```env
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_KEY=your-clerk-jwt-key
ADMIN_EMAIL_DOMAINS=@yourcompany.com,@admin.com
```

## Key Benefits

1. **No Token Exchange**: Frontend uses Clerk tokens directly
2. **Auto User Sync**: Backend automatically creates/updates users
3. **Role Management**: Supports role-based access control
4. **WebSocket Support**: Authenticated WebSocket connections
5. **Simple Integration**: Minimal setup required on frontend

## Security Notes

- All Clerk tokens are verified server-side
- Users are automatically synced to local database
- Roles can be managed via Clerk metadata
- WebSocket connections require authentication
- CORS is configured for development