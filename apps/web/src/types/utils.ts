/**
 * Utility-related TypeScript types
 * For utility functions and helper interfaces
 */

// =============================================================================
// Validation Utility Types
// =============================================================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  issues: string[];
  details?: any; // ZodError type
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// =============================================================================
// Environment Types
// =============================================================================

export type TEnv = {
  VITE_API_BASE_URL: string;
  VITE_CLERK_PUBLISHABLE_KEY: string;
  VITE_WS_ENDPOINT?: string;
  VITE_SENTRY_DSN?: string;
  VITE_AI_SERVICE_URL?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  DEV: boolean;
  PROD: boolean;
};

// =============================================================================
// Common Utility Types
// =============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonEmptyArray<T> = [T, ...T[]];

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

// =============================================================================
// React Hook Form Types
// =============================================================================

export interface FormField<T = any> {
  value: T;
  error?: string;
  onChange: (value: T) => void;
  onBlur: () => void;
}

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}