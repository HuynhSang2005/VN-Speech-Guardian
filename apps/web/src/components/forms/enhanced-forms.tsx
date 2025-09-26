/**
 * Form Integration với React Hook Form và Zod - VN Speech Guardian
 * Tích hợp comprehensive form system với modern React patterns
 */

import React from 'react';
import { 
  useForm, 
  FormProvider, 
  useFormContext,
  type FieldValues,
  type UseFormReturn,
  type SubmitHandler
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodSchema } from 'zod';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Core UI components
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Label } from './label';
import { Textarea } from './textarea';
import { Checkbox } from './checkbox';

// Icons
import { AlertCircle, Check } from 'lucide-react';

// =============================================================================
// Core Form Types & Interfaces
// =============================================================================

export interface BaseFormProps<T extends FieldValues> {
  schema: ZodSchema<T>;
  onSubmit: SubmitHandler<T>;
  onError?: (errors: any) => void;
  defaultValues?: Partial<T>;
  resetOnSuccess?: boolean;
  className?: string;
}

export interface FormFieldWrapperProps {
  name: string;
  label?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

// =============================================================================
// Form Variants
// =============================================================================

const formVariants = cva(
  "space-y-6",
  {
    variants: {
      variant: {
        default: "bg-background p-6 rounded-lg border",
        card: "bg-card p-6 rounded-lg border shadow-sm",
        inline: "space-y-4",
        compact: "space-y-3",
      },
      size: {
        sm: "max-w-md",
        md: "max-w-lg", 
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// =============================================================================
// Form Field Wrapper
// =============================================================================

export function FormFieldWrapper({
  name,
  label,
  description,
  required,
  children,
  className
}: FormFieldWrapperProps) {
  const { formState: { errors } } = useFormContext();
  const error = errors[name];
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <div className="relative">
        {children}
      </div>
      
      {error && (
        <div id={errorId} className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{String(error.message)}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Enhanced Form Component
// =============================================================================

export interface EnhancedFormProps<T extends FieldValues> 
  extends BaseFormProps<T>,
    VariantProps<typeof formVariants> {
  children: React.ReactNode;
  loading?: boolean;
}

export function EnhancedForm<T extends FieldValues>({
  schema,
  onSubmit,
  onError,
  defaultValues,
  resetOnSuccess = false,
  children,
  variant,
  size,
  className,
  loading = false,
}: EnhancedFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const handleFormSubmit: SubmitHandler<T> = async (data) => {
    try {
      await onSubmit(data);
      if (resetOnSuccess) {
        reset();
      }
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(handleFormSubmit as any)}
        className={cn(formVariants({ variant, size }), className)}
      >
        {children}
        
        {/* Global form errors */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors above and try again.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Submit section */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="submit"
            disabled={loading || isSubmitting}
            className="min-w-[100px]"
          >
            {loading || isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

// =============================================================================
// Form Field Components
// =============================================================================

export interface TextFieldProps {
  name: string;
  label?: string | undefined;
  placeholder?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  className?: string | undefined;
}

export function TextField({
  name,
  label,
  placeholder,
  description,
  required,
  type = 'text',
  className
}: TextFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className={errors[name] ? 'border-destructive focus:ring-destructive' : ''}
      />
    </FormFieldWrapper>
  );
}

export interface TextareaFieldProps {
  name: string;
  label?: string | undefined;
  placeholder?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  rows?: number | undefined;
  maxLength?: number | undefined;
  className?: string | undefined;
}

export function TextareaField({
  name,
  label,
  placeholder,
  description,
  required,
  rows = 4,
  maxLength,
  className
}: TextareaFieldProps) {
  const { register, watch, formState: { errors } } = useFormContext();
  const value = String(watch(name) || '');
  
  return (
    <FormFieldWrapper
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <div className="space-y-2">
        <Textarea
          {...register(name)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={errors[name] ? 'border-destructive focus:ring-destructive' : ''}
        />
        {maxLength && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{value.length}/{maxLength} characters</span>
            {value.length > maxLength * 0.9 && (
              <Badge variant={value.length >= maxLength ? 'destructive' : 'warning'}>
                {value.length >= maxLength ? 'Limit reached' : 'Near limit'}
              </Badge>
            )}
          </div>
        )}
      </div>
    </FormFieldWrapper>
  );
}

export interface CheckboxFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

export function CheckboxField({
  name,
  label,
  description,
  required = false,
  className
}: CheckboxFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <div className={cn('flex items-start space-x-3', className)}>
      <Checkbox
        {...register(name)}
      />
      <div className="space-y-1 leading-none">
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {errors[name] && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{String(errors[name]?.message)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Form Utilities & Hooks
// =============================================================================

/**
 * Hook để tạo form với Zod validation
 */
export function useZodForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  defaultValues?: Partial<T>
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });
}

/**
 * Form wrapper cho quick prototyping
 */
export interface QuickFormProps<T extends FieldValues> extends BaseFormProps<T> {
  children: (form: UseFormReturn<T>) => React.ReactNode;
}

export function QuickForm<T extends FieldValues>({
  schema,
  onSubmit,
  onError,
  defaultValues,
  resetOnSuccess = false,
  children,
  className
}: QuickFormProps<T>) {
  const form = useZodForm(schema, defaultValues);
  
  const handleFormSubmit: SubmitHandler<T> = async (data) => {
    try {
      await onSubmit(data);
      if (resetOnSuccess) {
        form.reset();
      }
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit as any)}
        className={cn('space-y-6', className)}
      >
        {children(form as any)}
      </form>
    </FormProvider>
  );
}