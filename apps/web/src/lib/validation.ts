/**
 * Zod validation utilities cho VN Speech Guardian Frontend
 * Core utilities theo backend patterns để maintain consistency
 */

import { z, ZodError, ZodSchema } from 'zod';

// =============================================================================
// Safe Parsing với Detailed Error Handling
// =============================================================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  issues: string[];
  details?: ZodError;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Safe parsing với detailed error handling
 * Returns either parsed data or formatted error
 * 
 * @example
 * const result = safeParse(UserSchema, userData);
 * if (result.success) {
 *   console.log(result.data.email);
 * } else {
 *   console.error(result.issues);
 * }
 */
export function safeParse<T>(
  schema: ZodSchema<T>, 
  data: unknown,
  context?: string
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    const issues = result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    });
    
    const contextStr = context ? `[${context}] ` : '';
    
    return {
      success: false,
      error: `${contextStr}Validation failed: ${issues[0]}`,
      issues,
      details: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      issues: ['Schema validation threw an exception'],
    };
  }
}

/**
 * Parse với exception throwing - dùng khi chắc chắn data valid
 * Throws descriptive error nếu validation fails
 */
export function parseOrThrow<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = safeParse(schema, data, context);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.data;
}

// =============================================================================
// Type-Safe API Client với Runtime Validation  
// =============================================================================

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Create type-safe API client với runtime validation
 * Validates both request và response data
 * 
 * @example
 * const createSession = createValidatedFetcher(
 *   CreateSessionRequestSchema,
 *   SessionResponseSchema
 * );
 */
export function createValidatedFetcher<TRequest, TResponse>(
  requestSchema: ZodSchema<TRequest>,
  responseSchema: ZodSchema<TResponse>,
  options: ApiClientOptions = {}
) {
  return async (
    url: string, 
    requestData: TRequest,
    fetchOptions: RequestInit = {}
  ): Promise<TResponse> => {
    // Validate request data
    const requestResult = safeParse(requestSchema, requestData, 'API Request');
    if (!requestResult.success) {
      console.error('API Request validation failed:', requestResult.issues);
      throw new Error(requestResult.error);
    }
    
    // Prepare fetch options
    const { baseUrl = '', timeout = 30000, headers = {} } = options;
    const fullUrl = baseUrl + url;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
      ...headers,
    };
    
    // Add timeout support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Make API call
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(requestResult.data),
        signal: controller.signal,
        ...fetchOptions,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Validate response data
      const responseResult = safeParse(responseSchema, responseData, 'API Response');
      if (!responseResult.success) {
        console.error('API Response validation failed:', {
          url: fullUrl,
          status: response.status,
          issues: responseResult.issues,
          data: responseData,
        });
        
        // In development, show detailed error
        if (import.meta.env.DEV) {
          console.warn('Response data that failed validation:', responseData);
        }
        
        throw new Error(responseResult.error);
      }
      
      return responseResult.data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  };
}

// =============================================================================
// React Hook Form Integration
// =============================================================================

/**
 * React Hook Form resolver cho Zod schemas
 * Provides proper error mapping và type safety
 * 
 * @example
 * const { register, handleSubmit, formState } = useForm({
 *   resolver: zodResolver(CreateSessionFormSchema)
 * });
 */
export function zodResolver<T>(schema: ZodSchema<T>) {
  return async (values: any): Promise<{
    values: T | {};
    errors: Record<string, { message: string }>;
  }> => {
    const result = safeParse(schema, values, 'Form Validation');
    
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    
    // Map Zod errors to react-hook-form format
    const errors: Record<string, { message: string }> = {};
    
    result.details?.issues.forEach(issue => {
      const path = issue.path.join('.');
      if (path) {
        errors[path] = { message: issue.message };
      }
    });
    
    return { values: {}, errors };
  };
}

// =============================================================================
// Environment Variable Validation
// =============================================================================

export const EnvSchema = z.object({
  // Required environment variables
  VITE_API_BASE_URL: z.string().url('API base URL must be a valid URL'),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key is required'),
  
  // Optional environment variables
  VITE_WS_ENDPOINT: z.string().url('WebSocket endpoint must be a valid URL').optional(),
  VITE_SENTRY_DSN: z.string().url('Sentry DSN must be a valid URL').optional(),
  VITE_AI_SERVICE_URL: z.string().url().optional(),
  
  // Runtime environment - handle Vite's env properly
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
}).transform(data => ({
  ...data,
  NODE_ENV: (data.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  DEV: data.DEV || false,
  PROD: data.PROD || false,
}));

export type TEnv = z.infer<typeof EnvSchema>;

/**
 * Validate environment variables at app startup
 * Throws detailed error nếu required vars missing
 */
export function validateEnv(): TEnv {
  const result = EnvSchema.safeParse(import.meta.env);
  
  if (!result.success) {
    const issues = result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    });
    
    console.error('Environment validation failed:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    
    throw new Error(`
Environment validation failed. Please check your .env file:

${issues.map(issue => `  • ${issue}`).join('\n')}

Make sure all required environment variables are set correctly.
    `);
  }
  
  return result.data;
}

// =============================================================================
// Common Schema Patterns
// =============================================================================

/**
 * Common validation patterns reused across schemas
 */
export const CommonPatterns = {
  // Vietnamese phone number validation
  phoneNumberVN: z.string().regex(
    /^(\+84|0)(3[2-9]|5[6-9]|7[0-9]|8[1-6]|9[0-9])[0-9]{7}$/,
    'Invalid Vietnamese phone number'
  ),
  
  // Email với Vietnamese character support
  email: z.string().email('Invalid email address'),
  
  // Password strength
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Date string (ISO 8601)
  dateString: z.string().datetime('Invalid date format'),
  
  // Positive integer
  positiveInt: z.number().int().positive('Must be a positive integer'),
  
  // Percentage (0-100)
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  
  // File size in bytes
  fileSize: z.number().positive().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  
  // Audio duration in seconds
  audioDuration: z.number().positive().max(3600, 'Audio duration must be less than 1 hour'),
};

// =============================================================================
// Debug Utilities (Development Only)
// =============================================================================

/**
 * Log schema validation results for debugging
 * Only active in development environment
 */
export function debugValidation<T>(
  schema: ZodSchema<T>,
  data: unknown,
  label: string = 'Validation'
): ValidationResult<T> {
  const result = safeParse(schema, data, label);
  
  if (import.meta.env.DEV) {
    if (result.success) {
      console.log(`✅ ${label} passed:`, result.data);
    } else {
      console.error(`❌ ${label} failed:`, {
        error: result.error,
        issues: result.issues,
        originalData: data,
      });
    }
  }
  
  return result;
}

/**
 * Type guard utility cho runtime type checking
 */
export function isValidSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): data is T {
  const result = schema.safeParse(data);
  return result.success;
}

// Export useful Zod utilities
export { z, ZodError, type ZodSchema } from 'zod';