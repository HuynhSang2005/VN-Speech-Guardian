/**
 * API Client Service for VN Speech Guardian
 * Type-safe HTTP client với OpenAPI integration
 */

import type { 
  DashboardStats, 
  SessionsResponse, 
  RecentActivity,
  SessionDetail 
} from '@/types/components';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// HTTP utility functions
async function request<T>(
  endpoint: string, 
  options: RequestInit & RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Network error', 0, error);
  }
}

// Dashboard API endpoints
export const statsAPI = {
  overview: (): Promise<DashboardStats> => 
    request('/api/stats/overview'),
    
  historical: (days: number = 7): Promise<{
    labels: string[];
    sessions: number[];
    detections: number[];
    accuracy: number[];
  }> => 
    request(`/api/stats/historical?days=${days}`),
};

// Sessions API endpoints  
export const sessionsAPI = {
  list: (filters: {
    page?: number;
    limit?: number;
    status?: string;
    severity?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    dateRange?: { start: string; end: string };
  } = {}): Promise<SessionsResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    return request(`/api/sessions?${params.toString()}`);
  },

  getById: (id: string): Promise<SessionDetail> =>
    request(`/api/sessions/${id}`),

  export: (filters: any, format: 'csv' | 'json'): Promise<{ data: string }> =>
    request(`/api/sessions/export?format=${format}`, {
      method: 'POST',
      body: JSON.stringify(filters),
    }),

  delete: (id: string): Promise<void> =>
    request(`/api/sessions/${id}`, { method: 'DELETE' }),

  bulkDelete: (ids: string[]): Promise<void> =>
    request('/api/sessions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// Activity API endpoints
export const activityAPI = {
  recent: (limit: number = 10): Promise<RecentActivity[]> =>
    request(`/api/activity/recent?limit=${limit}`),

  feed: (page: number = 1, limit: number = 20): Promise<{
    activities: RecentActivity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> =>
    request(`/api/activity?page=${page}&limit=${limit}`),
};

// User API endpoints  
export const userAPI = {
  profile: (): Promise<{
    id: string;
    email: string;
    name: string;
    avatar: string;
    role: string;
    permissions: string[];
    createdAt: string;
    lastLogin: string;
  }> =>
    request('/api/user/profile'),

  updateProfile: (data: {
    name?: string;
    avatar?: string;
  }): Promise<void> =>
    request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  preferences: (): Promise<{
    theme: 'light' | 'dark';
    language: 'vi' | 'en';
    notifications: {
      email: boolean;
      push: boolean;
      realtime: boolean;
    };
  }> =>
    request('/api/user/preferences'),

  updatePreferences: (data: any): Promise<void> =>
    request('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Health check API
export const healthAPI = {
  check: (): Promise<{
    status: 'ok' | 'error';
    services: {
      database: 'up' | 'down';
      aiWorker: 'up' | 'down';
      redis: 'up' | 'down';
    };
    timestamp: string;
  }> =>
    request('/api/health'),
};

// Audio processing API (for live session)
export const audioAPI = {
  startSession: (): Promise<{ sessionId: string }> =>
    request('/api/audio/sessions', { method: 'POST' }),

  endSession: (sessionId: string): Promise<void> =>
    request(`/api/audio/sessions/${sessionId}/end`, { method: 'POST' }),

  // Note: Audio streaming is handled via WebSocket, not HTTP
};

// Consolidated API client
export const apiClient = {
  stats: statsAPI,
  sessions: sessionsAPI,
  activity: activityAPI,
  user: userAPI,
  health: healthAPI,
  audio: audioAPI,
};

// Auth-aware request helper
export async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {},
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();
  
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  }

  return request<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });
}

// Export utility types and classes
export { APIError };