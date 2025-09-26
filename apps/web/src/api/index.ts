/**
 * API Client - Central export for all API functionality
 * 
 * Exports:
 * - Generated OpenAPI client functions and types
 * - Custom API client with authentication
 * - Common API utilities
 */

// Re-export all generated API functions and types
export * from './generated/vNSpeechGuardianAPI';

// Re-export existing API client
export { customInstance } from '../lib/api-client';

// Re-export enhanced API client
export { EnhancedApiClient, apiClient } from '../lib/enhanced-api-client';
export type { 
  ApiClientConfig, 
  ApiResponse, 
  PaginatedResponse,
  UploadProgressCallback
} from '../lib/enhanced-api-client';

// Re-export hooks that exist
export * from '../hooks';