/**
 * Enhanced Session Form - P28 Simplified Implementation
 * Mục đích: React 19 + React Hook Form v7 + Zod integration (simplified for build)
 * Tech: useActionState, React Hook Form v7, Zod validation, Framer Motion v12
 */

import { useActionState, useOptimistic, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';

// Simplified UI components for P28 build
const Input = ({ className, ...props }: any) => <input className={`border rounded px-3 py-2 ${className}`} {...props} />;
const Textarea = ({ className, ...props }: any) => <textarea className={`border rounded px-3 py-2 ${className}`} {...props} />;
const Label = ({ className, ...props }: any) => <label className={`block text-sm font-medium ${className}`} {...props} />;
const Button = ({ className, disabled, children, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded ${disabled ? 'bg-gray-300' : 'bg-blue-500 text-white'} ${className}`} 
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

// Simplified types for P28 build
interface Session {
  id: string;
  name: string;
  description?: string;
  startedAt: string;
  endedAt?: string;
  lang: string;
}

// P28 Zod Schema - simplified for build compatibility
const sessionFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  description: z
    .string()
    .max(200, 'Description cannot exceed 200 characters')
    .optional(),
  language: z.enum(['vi', 'en']),
  sensitivity: z.enum(['low', 'medium', 'high']),
  autoStop: z.boolean().default(false),
  maxDuration: z.number().min(60).max(3600).default(300),
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

// Mock server action for P28 demonstration
async function createSessionAction(
  _prevState: any,
  formData: SessionFormData
): Promise<{ success: boolean; message: string; data?: Session }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate success/error based on name
  if (formData.name.toLowerCase().includes('error')) {
    return {
      success: false,
      message: 'Session name contains invalid content'
    };
  }
  
  const newSession: Session = {
    id: `session-${Date.now()}`,
    name: formData.name,
    description: formData.description || undefined,
    startedAt: new Date().toISOString(),
    lang: formData.language
  };
  
  return {
    success: true,
    message: 'Session created successfully',
    data: newSession
  };
}

// Props interface
interface EnhancedSessionFormProps {
  onSuccess?: (session: Session) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function EnhancedSessionForm({ 
  onSuccess, 
  onError, 
  className 
}: EnhancedSessionFormProps) {
  const [isPending, startTransition] = useTransition();
  
  // React Hook Form v7 with Zod integration
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      language: 'vi',
      sensitivity: 'medium',
      autoStop: false,
      maxDuration: 300,
    },
  });
  
  // React 19 useActionState for server-side form handling
  const [actionState] = useActionState(createSessionAction, null);
  
  // Optimistic updates for immediate UI feedback
  const [_optimisticSessions, addOptimisticSession] = useOptimistic(
    [] as Session[],
    (state: Session[], newSession: Session) => [...state, newSession]
  );
  
  // Enhanced form submission with React 19 patterns
  const onSubmit = (data: SessionFormData) => {
    startTransition(async () => {
      try {
        // Add optimistic session immediately
        const optimisticSession: Session = {
          id: `temp-${Date.now()}`,
          name: data.name,
          description: data.description || undefined,
          startedAt: new Date().toISOString(),
          lang: data.language,
        };
        
        addOptimisticSession(optimisticSession);
        
        // Submit via server action
        const result = await createSessionAction(actionState, data);
        
        if (result?.success) {
          console.log('Session created:', result.message);
          onSuccess?.(result.data!);
          reset(); // Clear form on success
        } else {
          console.error('Session creation failed:', result?.message);
          onError?.(result?.message || 'Failed to create session');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        onError?.('An unexpected error occurred');
      }
    });
  };
  
  // Form variants for Framer Motion animations
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
    <motion.form
      className={`space-y-6 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}
      variants={formVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit(onSubmit)}
    >
      <motion.div variants={fieldVariants}>
        <Label htmlFor="name">Session Name *</Label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="name"
              type="text"
              placeholder="Enter session name"
              className={`w-full mt-1 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
          )}
        />
        {errors.name && (
          <motion.p 
            className="text-red-500 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {errors.name.message}
          </motion.p>
        )}
      </motion.div>
      
      <motion.div variants={fieldVariants}>
        <Label htmlFor="description">Description</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="description"
              rows={3}
              placeholder="Optional session description"
              className={`w-full mt-1 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
          )}
        />
        {errors.description && (
          <motion.p 
            className="text-red-500 text-sm mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {errors.description.message}
          </motion.p>
        )}
      </motion.div>
      
      <motion.div variants={fieldVariants} className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="language">Language</Label>
          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="language"
                className={`w-full mt-1 border rounded px-3 py-2 ${errors.language ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="vi">Vietnamese</option>
                <option value="en">English</option>
              </select>
            )}
          />
        </div>
        
        <div>
          <Label htmlFor="sensitivity">Sensitivity</Label>
          <Controller
            name="sensitivity"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="sensitivity"
                className={`w-full mt-1 border rounded px-3 py-2 ${errors.sensitivity ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            )}
          />
        </div>
      </motion.div>
      
      <motion.div variants={fieldVariants} className="flex items-center space-x-4">
        <Controller
          name="autoStop"
          control={control}
          render={({ field }) => (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={field.value}
                onChange={field.onChange}
                className="mr-2"
              />
              Auto-stop after max duration
            </label>
          )}
        />
      </motion.div>
      
      <motion.div variants={fieldVariants}>
        <Label htmlFor="maxDuration">Max Duration (seconds)</Label>
        <Controller
          name="maxDuration"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="maxDuration"
              type="number"
              min={60}
              max={3600}
              step={30}
              onChange={(e: any) => field.onChange(parseInt(e.target.value, 10) || 300)}
              className={`w-full mt-1 ${errors.maxDuration ? 'border-red-500' : 'border-gray-300'}`}
            />
          )}
        />
      </motion.div>
      
      <motion.div 
        variants={fieldVariants}
        className="flex justify-between pt-4"
      >
        <Button
          type="button"
          onClick={() => reset()}
          disabled={isSubmitting || isPending}
          className="bg-gray-500 text-white"
        >
          Reset
        </Button>
        
        <Button
          type="submit"
          disabled={isSubmitting || isPending}
          className="bg-blue-500 text-white"
        >
          {isSubmitting || isPending ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
          ) : (
            'Create Session'
          )}
        </Button>
      </motion.div>
      
      {/* Action State Display */}
      {actionState && (
        <motion.div
          className={`p-3 rounded ${actionState.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {actionState.message}
        </motion.div>
      )}
    </motion.form>
  );
}