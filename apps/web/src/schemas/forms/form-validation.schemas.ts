/**
 * Form validation schemas cho VN Speech Guardian Frontend
 * React Hook Form integration với Zod validation
 */

import { z } from 'zod';
import { CommonPatterns } from '../../lib/validation';

// =============================================================================
// Authentication Form Schemas
// =============================================================================

// Register form schema với client-side specific validation
export const RegisterFormSchema = z.object({
  email: CommonPatterns.email,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-ZÀ-ỹ\s]+$/, 'Name can only contain letters and spaces'),
  password: CommonPatterns.password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  phoneNumber: CommonPatterns.phoneNumberVN.optional(),
  // Client-side only fields
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the Terms of Service'
  }),
  agreeToPrivacyPolicy: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Privacy Policy'
  }),
  marketingEmails: z.boolean().default(false),
}).strict().superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      message: 'Mật khẩu xác nhận không khớp',
      path: ['confirmPassword'],
    });
  }
});

// Login form schema - simple validation
export const LoginFormSchema = z.object({
  email: CommonPatterns.email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
}).strict();

// OTP verification form
export const OTPFormSchema = z.object({
  code: z.string()
    .length(6, 'OTP code must be 6 digits')
    .regex(/^\d{6}$/, 'OTP code must contain only numbers'),
  email: CommonPatterns.email,
}).strict();

// Password reset request form
export const ResetPasswordRequestFormSchema = z.object({
  email: CommonPatterns.email,
}).strict();

// Password reset form
export const ResetPasswordFormSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: CommonPatterns.password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).strict().superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
  }
});

// =============================================================================
// Session Management Form Schemas
// =============================================================================

// Create session form với advanced options
export const CreateSessionFormSchema = z.object({
  name: z.string()
    .min(1, 'Session name is required')
    .max(100, 'Session name must be less than 100 characters'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  language: z.enum(['vi', 'en', 'auto']).default('vi'),
  device: z.string().max(100).optional(),
  // Audio configuration
  audioConfig: z.object({
    sampleRate: z.coerce.number().int().min(8000).max(48000).default(16000),
    channels: z.coerce.number().int().min(1).max(2).default(1),
    vadThreshold: z.coerce.number().min(0).max(1).default(0.5),
  }).optional(),
  // Moderation settings
  moderationConfig: z.object({
    blockThreshold: z.coerce.number().min(0.1).max(1.0).default(0.8),
    warnThreshold: z.coerce.number().min(0.1).max(1.0).default(0.5),
    enableRealTime: z.boolean().default(true),
  }).optional(),
  // Privacy settings
  storeTranscriptions: z.boolean().default(true),
  anonymousMode: z.boolean().default(false),
}).strict().superRefine(({ moderationConfig }, ctx) => {
  if (moderationConfig && moderationConfig.blockThreshold <= moderationConfig.warnThreshold) {
    ctx.addIssue({
      code: 'custom',
      message: 'Block threshold must be higher than warn threshold',
      path: ['moderationConfig', 'blockThreshold'],
    });
  }
});

// Session settings form (update existing session)
export const SessionSettingsFormSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  // Audio settings
  audioSettings: z.object({
    vadThreshold: z.coerce.number().min(0).max(1),
    noiseReduction: z.boolean().default(true),
    autoGainControl: z.boolean().default(true),
    echoCancellation: z.boolean().default(true),
  }).optional(),
  // Moderation settings  
  moderationSettings: z.object({
    blockThreshold: z.coerce.number().min(0.1).max(1.0),
    warnThreshold: z.coerce.number().min(0.1).max(1.0),
    enableRealTime: z.boolean(),
    hysteresisWindow: z.coerce.number().int().min(1).max(10),
  }).optional(),
}).strict();

// =============================================================================
// User Settings Form Schemas  
// =============================================================================

// Profile settings form
export const ProfileSettingsFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-ZÀ-ỹ\s]+$/, 'Name can only contain letters and spaces'),
  phoneNumber: CommonPatterns.phoneNumberVN.optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  bio: z.string().max(300, 'Bio must be less than 300 characters').optional(),
  timezone: z.string().optional(),
  language: z.enum(['vi', 'en']).default('vi'),
}).strict();

// Audio preferences form
export const AudioPreferencesFormSchema = z.object({
  defaultSampleRate: z.coerce.number().int().min(8000).max(48000).default(16000),
  defaultVADThreshold: z.coerce.number().min(0).max(1).default(0.5),
  enableNoiseCancellation: z.boolean().default(true),
  enableEchoCancellation: z.boolean().default(true),
  enableAutoGainControl: z.boolean().default(true),
  inputDeviceId: z.string().optional(),
  outputDeviceId: z.string().optional(),
}).strict();

// Moderation preferences form
export const ModerationPreferencesFormSchema = z.object({
  defaultBlockThreshold: z.coerce.number().min(0.1).max(1.0).default(0.8),
  defaultWarnThreshold: z.coerce.number().min(0.1).max(1.0).default(0.5),
  enableRealTimeModeration: z.boolean().default(true),
  showConfidenceScores: z.boolean().default(true),
  autoBlockHighSeverity: z.boolean().default(false),
  notificationSettings: z.object({
    onDetection: z.boolean().default(true),
    onBlock: z.boolean().default(true),
    soundAlerts: z.boolean().default(true),
    desktopNotifications: z.boolean().default(false),
  }),
}).strict().superRefine(({ defaultBlockThreshold, defaultWarnThreshold }, ctx) => {
  if (defaultBlockThreshold <= defaultWarnThreshold) {
    ctx.addIssue({
      code: 'custom',
      message: 'Block threshold must be higher than warn threshold',
      path: ['defaultBlockThreshold'],
    });
  }
});

// Privacy settings form
export const PrivacySettingsFormSchema = z.object({
  storeTranscriptions: z.boolean().default(true),
  anonymousMode: z.boolean().default(false),
  dataRetention: z.coerce.number().int().min(1).max(365).default(30), // Days
  shareUsageData: z.boolean().default(false),
  allowAnalytics: z.boolean().default(true),
  enableCookies: z.boolean().default(true),
  // Data export/deletion
  requestDataExport: z.boolean().default(false),
  requestDataDeletion: z.boolean().default(false),
}).strict();

// Notification preferences form
export const NotificationPreferencesFormSchema = z.object({
  emailNotifications: z.object({
    systemUpdates: z.boolean().default(true),
    securityAlerts: z.boolean().default(true),
    weeklyReports: z.boolean().default(false),
    marketingEmails: z.boolean().default(false),
  }),
  pushNotifications: z.object({
    realTimeAlerts: z.boolean().default(true),
    sessionComplete: z.boolean().default(true),
    systemMaintenance: z.boolean().default(true),
  }),
  inAppNotifications: z.object({
    soundEnabled: z.boolean().default(true),
    vibrationEnabled: z.boolean().default(false),
    badgeCount: z.boolean().default(true),
  }),
}).strict();

// =============================================================================
// System Configuration Form Schemas (Admin)
// =============================================================================

// System settings form (admin only)
export const SystemSettingsFormSchema = z.object({
  apiSettings: z.object({
    baseUrl: z.string().url('Invalid API base URL'),
    timeout: z.coerce.number().int().min(1000).max(60000).default(30000), // milliseconds
    retryAttempts: z.coerce.number().int().min(0).max(5).default(3),
  }),
  moderationSettings: z.object({
    globalBlockThreshold: z.coerce.number().min(0.1).max(1.0).default(0.9),
    globalWarnThreshold: z.coerce.number().min(0.1).max(1.0).default(0.6),
    enableGlobalModeration: z.boolean().default(true),
    autoEscalateThreshold: z.coerce.number().min(0.8).max(1.0).default(0.95),
  }),
  storageSettings: z.object({
    maxSessionDuration: z.coerce.number().int().min(300).max(7200).default(3600), // seconds
    maxTranscriptionLength: z.coerce.number().int().min(1000).max(10000).default(5000), // characters
    defaultDataRetention: z.coerce.number().int().min(1).max(365).default(90), // days
  }),
}).strict();

// =============================================================================
// Type Exports
// =============================================================================

export type TRegisterForm = z.infer<typeof RegisterFormSchema>;
export type TLoginForm = z.infer<typeof LoginFormSchema>;
export type TOTPForm = z.infer<typeof OTPFormSchema>;
export type TResetPasswordRequestForm = z.infer<typeof ResetPasswordRequestFormSchema>;
export type TResetPasswordForm = z.infer<typeof ResetPasswordFormSchema>;

export type TCreateSessionForm = z.infer<typeof CreateSessionFormSchema>;
export type TSessionSettingsForm = z.infer<typeof SessionSettingsFormSchema>;

export type TProfileSettingsForm = z.infer<typeof ProfileSettingsFormSchema>;
export type TAudioPreferencesForm = z.infer<typeof AudioPreferencesFormSchema>;
export type TModerationPreferencesForm = z.infer<typeof ModerationPreferencesFormSchema>;
export type TPrivacySettingsForm = z.infer<typeof PrivacySettingsFormSchema>;
export type TNotificationPreferencesForm = z.infer<typeof NotificationPreferencesFormSchema>;

export type TSystemSettingsForm = z.infer<typeof SystemSettingsFormSchema>;

// =============================================================================
// Form Validation Helpers
// =============================================================================

/**
 * Custom hook för form validation với consistent error handling
 */
export function createFormValidator<T extends z.ZodType>(schema: T) {
  return {
    schema,
    validate: (data: unknown) => {
      const result = schema.safeParse(data);
      if (result.success) {
        return { isValid: true, data: result.data, errors: {} };
      }
      
      // Map Zod errors to form-friendly format
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });
      
      return { isValid: false, data: null, errors };
    },
  };
}

/**
 * Generate default form values với proper typing
 */
export function getFormDefaults<T extends z.ZodType>(schema: T): Partial<z.infer<T>> {
  try {
    // Parse empty object to get defaults from schema
    const result = schema.safeParse({});
    if (result.success) {
      return result.data;
    }
    
    // Return empty object if no defaults available
    return {};
  } catch {
    return {};
  }
}

/**
 * Form field validation für real-time feedback
 */
export function validateField<T extends z.ZodType>(
  schema: T, 
  fieldPath: string, 
  value: any,
  formData: Partial<z.infer<T>> = {}
): { isValid: boolean; error?: string } {
  try {
    // Create partial schema för single field validation
    const fullData = { ...formData, [fieldPath]: value };
    const result = schema.safeParse(fullData);
    
    if (result.success) {
      return { isValid: true };
    }
    
    // Find error specific to this field
    const fieldError = result.error.issues.find(issue => 
      issue.path.join('.') === fieldPath
    );
    
    if (fieldError) {
      return {
        isValid: false,
        error: fieldError.message,
      };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Validation error' };
  }
}

// =============================================================================
// Form Constants
// =============================================================================

export const FORM_CONSTANTS = {
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_BIO_LENGTH: 300,
    OTP_LENGTH: 6,
  },
  
  AUDIO: {
    MIN_SAMPLE_RATE: 8000,
    MAX_SAMPLE_RATE: 48000,
    DEFAULT_SAMPLE_RATE: 16000,
    MIN_VAD_THRESHOLD: 0.0,
    MAX_VAD_THRESHOLD: 1.0,
    DEFAULT_VAD_THRESHOLD: 0.5,
  },
  
  MODERATION: {
    MIN_THRESHOLD: 0.1,
    MAX_THRESHOLD: 1.0,
    DEFAULT_WARN_THRESHOLD: 0.5,
    DEFAULT_BLOCK_THRESHOLD: 0.8,
    MAX_HYSTERESIS_WINDOW: 10,
  },
  
  PRIVACY: {
    MIN_DATA_RETENTION: 1, // days
    MAX_DATA_RETENTION: 365, // days  
    DEFAULT_DATA_RETENTION: 30, // days
  },
} as const;