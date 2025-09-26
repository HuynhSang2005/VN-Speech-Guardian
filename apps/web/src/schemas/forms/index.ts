/**
 * VN Speech Guardian Form Schemas với Zod validation
 * Định nghĩa validation rules cho tất cả forms trong app
 */

import { z } from 'zod';

// =============================================================================
// Session Management Forms
// =============================================================================

/**
 * Schema cho tạo session mới
 */
export const CreateSessionSchema = z.object({
  name: z.string()
    .min(1, 'Session name is required')
    .max(100, 'Session name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Session name contains invalid characters'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  autoStartRecording: z.boolean().default(false),
  
  maxDurationMinutes: z.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(240, 'Duration cannot exceed 4 hours')
    .default(30),
    
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  
  tags: z.array(z.string().max(20)).max(10).optional(),
});

export type CreateSessionFormData = z.infer<typeof CreateSessionSchema>;

/**
 * Schema cho user preferences
 */
export const UserPreferencesSchema = z.object({
  // Audio settings
  audioSampleRate: z.enum(['16000', '44100', '48000']).default('16000'),
  audioInputDevice: z.string().optional(),
  audioGainLevel: z.number().min(0).max(100).default(50),
  
  // Detection settings
  defaultSensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  enableRealTimeAlerts: z.boolean().default(true),
  alertSoundEnabled: z.boolean().default(true),
  
  // Display settings
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['vi', 'en']).default('vi'),
  showConfidenceScores: z.boolean().default(false),
  
  // Privacy settings
  saveTranscripts: z.boolean().default(true),
  anonymizeData: z.boolean().default(false),
  dataRetentionDays: z.number().min(1).max(365).default(30),
});

export type UserPreferencesFormData = z.infer<typeof UserPreferencesSchema>;

/**
 * Schema cho contact form
 */
export const ContactFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  
  email: z.string()
    .email('Please enter a valid email address'),
  
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
  
  category: z.enum(['bug', 'feature', 'question', 'other']).default('question'),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;

// Form validation schemas với React Hook Form integration
export * from './form-validation.schemas';