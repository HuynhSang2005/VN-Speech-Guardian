/**
 * Enhanced Session Form - P28 Implementation
 * Mục đích: Modern React 19 form với React Hook Form v7 + Zod + useActionState
 * Features: Server actions, optimistic updates, performance optimization, accessibility
 * Tech: React 19, useActionState, React Hook Form v7, Zod validation, Framer Motion v12
 * 
 * Research sources:
 * - https://react-hook-form.com/get-started (RHF v7 patterns)
 * - https://react.dev/reference/react/useActionState (React 19 server actions)
 * - https://zod.dev/api (Zod v4 validation patterns)
 */

import { useActionState, useTransition, useOptimistic } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { Button } from '../ui/button';
// TODO: Import actual UI components when available
// import { Input } from '../ui/input';
// import { Textarea } from '../ui/textarea';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
// import { Label } from '../ui/label';

// Temporary simple components for P28 build
const Input = ({ className, ...props }: any) => <input className={`border rounded px-3 py-2 ${className}`} {...props} />;
const Textarea = ({ className, ...props }: any) => <textarea className={`border rounded px-3 py-2 ${className}`} {...props} />;
const Label = ({ className, ...props }: any) => <label className={`block text-sm font-medium ${className}`} {...props} />;
const Select = ({ children, ...props }: any) => <select className="border rounded px-3 py-2" {...props}>{children}</select>;
const SelectContent = ({ children }: any) => <>{children}</>;
const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
const SelectTrigger = ({ children }: any) => <>{children}</>;
const SelectValue = ({ placeholder }: any) => <option value="">{placeholder}</option>;
import { Loader2, CheckCircle, AlertCircle, Mic, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { Session, CreateSessionRequest } from '../../types/session';

// Enhanced Zod schema với advanced validation patterns
const sessionFormSchema = z.object({
  name: z.string()
    .min(3, 'Session name must be at least 3 characters')
    .max(50, 'Session name cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_àáảãạăắặằẳẵâấậầẩẫèéẻẽẹêếệềểễìíỉĩịòóỏõọôốộồổỗơớợờởỡùúủũụưứựừửữỳýỷỹỵđ]+$/, 
           'Session name contains invalid characters'),
  
  description: z.string()
    .max(200, 'Description cannot exceed 200 characters')
    .optional(),
  
  settings: z.object({
    language: z.enum(['vi', 'en'], {
      errorMap: () => ({ message: 'Please select a valid language' })
    }),
    
    sensitivity: z.enum(['low', 'medium', 'high'], {
      errorMap: () => ({ message: 'Please select sensitivity level' })
    }),
    
    autoStop: z.boolean().default(true),
    
    maxDuration: z.number()
      .min(60, 'Minimum duration is 1 minute')
      .max(3600, 'Maximum duration is 1 hour')
      .default(300),
    
    detectionRules: z.array(z.object({
      keyword: z.string().min(1, 'Keyword is required'),
      severity: z.enum(['low', 'medium', 'high']),
      action: z.enum(['log', 'warn', 'block'])
    })).max(5, 'Maximum 5 detection rules allowed').default([])
  }),
  
  // Cross-field validation
}).refine((data) => {
  // Complex validation: blocking rules require longer sessions
  const hasBlockingRules = data.settings.detectionRules.some(rule => rule.action === 'block');
  return !hasBlockingRules || data.settings.maxDuration >= 300;
}, {
  message: 'Sessions with blocking rules must be at least 5 minutes long',
  path: ['settings', 'maxDuration']
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

// Server Action for form submission với comprehensive error handling
async function createSessionAction(
  prevState: any, 
  formData: FormData
): Promise<{
  success?: boolean;
  data?: Session;
  errors?: Record<string, string[]>;
  message?: string;
}> {
  try {
    // Simulate network delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Parse and validate form data
    const rawData = Object.fromEntries(formData.entries());
    
    // Handle complex nested objects from FormData
    const parsedData = {
      name: rawData.name as string,
      description: rawData.description as string || undefined,
      settings: {
        language: rawData.language as 'vi' | 'en',
        sensitivity: rawData.sensitivity as 'low' | 'medium' | 'high',
        autoStop: rawData.autoStop === 'true',
        maxDuration: parseInt(rawData.maxDuration as string, 10),
        detectionRules: [] // Simplified for demo - would parse from form
      }
    };
    
    // Validate with Zod
    const validatedData = sessionFormSchema.parse(parsedData);
    
    // API call simulation
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatedData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create session');
    }
    
    const sessionData = await response.json();
    
    return {
      success: true,
      data: sessionData.data,
      message: 'Session created successfully!'
    };
    
  } catch (error) {
    console.error('Session creation error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors,
        message: 'Please check the form for errors'
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

interface EnhancedSessionFormProps {
  onSuccess?: (session: Session) => void;
  initialData?: Partial<SessionFormData>;
  mode?: 'create' | 'edit';
}

export function EnhancedSessionForm({ 
  onSuccess, 
  initialData,
  mode = 'create' 
}: EnhancedSessionFormProps) {
  // React 19 useActionState for server-side form handling
  const [actionState, formAction, isPending] = useActionState(createSessionAction, null);
  
  // React Hook Form v7 integration
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      settings: {
        language: 'vi',
        sensitivity: 'medium',
        autoStop: true,
        maxDuration: 300,
        detectionRules: [],
        ...initialData?.settings
      }
    },
    mode: 'onChange' // Real-time validation
  });
  
  // Optimistic updates for better UX
  const [optimisticSessions, addOptimisticSession] = useOptimistic(
    [],
    (state: Session[], newSession: Session) => [...state, newSession]
  );
  
  // Watch form values for dynamic UI updates
  const watchedValues = watch();
  const [isPendingTransition, startTransition] = useTransition();
  
  // Enhanced form submission với optimistic updates
  const onSubmit = async (data: SessionFormData) => {
    startTransition(async () => {
      // Optimistic update
      const tempSession: Session = {
        id: `temp-${Date.now()}`,
        name: data.name,
        description: data.description,
        userId: 'current-user',
        device: navigator.userAgent,
        lang: data.settings.language,
        startedAt: new Date().toISOString(),
        endedAt: null
      };
      
      addOptimisticSession(tempSession);
      
      // Convert form data for server action
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      formData.append('language', data.settings.language);
      formData.append('sensitivity', data.settings.sensitivity);
      formData.append('autoStop', data.settings.autoStop.toString());
      formData.append('maxDuration', data.settings.maxDuration.toString());
      
      // Call server action
      const result = await formAction(formData);
      
      if (result?.success) {
        toast.success(result.message);
        onSuccess?.(result.data!);
        reset();
      } else {
        toast.error(result?.message || 'Failed to create session');
      }
    });
  };
  
  // Animation variants for smooth transitions
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };
  
  const fieldVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };
  
  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700"
    >
      <motion.div variants={fieldVariants} className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Mic className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'create' ? 'Create New Session' : 'Edit Session'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your speech processing session
            </p>
          </div>
        </div>
      </motion.div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <motion.div variants={fieldVariants} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Session Name *
              </Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    placeholder="Enter session name"
                    className={errors.name ? 'border-red-500' : ''}
                    aria-invalid={errors.name ? 'true' : 'false'}
                  />
                )}
              />
              <AnimatePresence>
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-red-600 flex items-center"
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-medium">
                Language *
              </Label>
              <Controller
                name="settings.language"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className={errors.settings?.language ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">Vietnamese</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.settings?.language && (
                <p className="text-sm text-red-600">{errors.settings.language.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Describe the purpose of this session"
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </motion.div>
        
        {/* Advanced Settings Section */}
        <motion.div variants={fieldVariants} className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Advanced Settings
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sensitivity" className="text-sm font-medium">
                Sensitivity Level
              </Label>
              <Controller
                name="settings.sensitivity"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxDuration" className="text-sm font-medium">
                Max Duration (seconds)
              </Label>
              <Controller
                name="settings.maxDuration"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={60}
                    max={3600}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 300)}
                    className={errors.settings?.maxDuration ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.settings?.maxDuration && (
                <p className="text-sm text-red-600">{errors.settings.maxDuration.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Options</Label>
              <div className="flex items-center space-x-2">
                <Controller
                  name="settings.autoStop"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded"
                    />
                  )}
                />
                <Label className="text-sm">Auto-stop after silence</Label>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Server-side validation errors */}
        <AnimatePresence>
          {actionState?.errors && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Please fix the following errors:
              </h4>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {Object.entries(actionState.errors).map(([field, errors]) => (
                  <li key={field}>• {errors.join(', ')}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Form Actions */}
        <motion.div variants={fieldVariants} className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isPending || isPendingTransition}
          >
            Reset Form
          </Button>
          
          <Button
            type="submit"
            disabled={isPending || isPendingTransition || !isValid}
            className="min-w-[120px]"
          >
            {isPending || isPendingTransition ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create Session' : 'Update Session'}
              </>
            )}
          </Button>
        </motion.div>
      </form>
      
      {/* Real-time form preview (development aid) */}
      {process.env.NODE_ENV === 'development' && (
        <motion.details 
          variants={fieldVariants}
          className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Form State (Dev Only)
          </summary>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
            {JSON.stringify({ 
              values: watchedValues, 
              errors: errors,
              isDirty,
              isValid 
            }, null, 2)}
          </pre>
        </motion.details>
      )}
    </motion.div>
  );
}