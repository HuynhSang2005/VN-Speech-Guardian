/**
 * Enhanced Form Components - P29 Enhanced Component Library
 * 
 * Professional form system với React 19 + Zod integration:
 * - Enhanced form với server actions và client-side validation
 * - Field components với comprehensive error handling
 * - Form layouts với responsive design
 * - Integration với React Hook Form v7 + Zod resolver
 * 
 * Based on: React 19 useActionState + React Hook Form + shadcn/ui forms
 * Usage: Session creation, user settings, audio configuration
 * Dependencies: React Hook Form, Zod, Radix UI, React 19 hooks
 */

'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useController, type FieldPath, type FieldValues } from 'react-hook-form';
import { cva } from 'class-variance-authority';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Form field variants
const fieldVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-ring",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        warning: "border-amber-500 focus-visible:ring-amber-500",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Enhanced Form Root - Integrates React 19 Server Actions với form state
 */
interface EnhancedFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'action'> {
  action?: (prevState: any, formData: FormData) => Promise<any>;
  children: React.ReactNode;
  onSubmitSuccess?: (result: any) => void;
  onSubmitError?: (error: any) => void;
}

const EnhancedForm = React.forwardRef<HTMLFormElement, EnhancedFormProps>(
  ({ action, children, onSubmitSuccess, onSubmitError, className, ...props }, ref) => {
    const [state, formAction] = useActionState(
      async (prevState: any, formData: FormData) => {
        try {
          const result = action ? await action(prevState, formData) : null;
          onSubmitSuccess?.(result);
          return { success: true, data: result };
        } catch (error) {
          onSubmitError?.(error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Form submission failed',
            fieldErrors: (error as any)?.fieldErrors || {}
          };
        }
      },
      null
    );

    return (
      <form
        ref={ref}
        action={formAction}
        className={cn("space-y-6", className)}
        {...props}
      >
        {children}
        
        {/* Global form error */}
        {state?.error && !state?.fieldErrors && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {state.error}
          </div>
        )}
        
        {/* Success message */}
        {state?.success && (
          <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
            <Check className="h-4 w-4" />
            Form submitted successfully!
          </div>
        )}
      </form>
    );
  }
);
EnhancedForm.displayName = "EnhancedForm";

/**
 * Form Field - Controlled component với comprehensive validation
 */
interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: TName;
  label?: string;
  description?: string;
  required?: boolean;
  control?: any; // React Hook Form control
}

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  required = false,
  control,
  className,
  ...props
}: FormFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error, invalid }
  } = useController({
    name,
    control,
    rules: { required: required ? `${label || name} is required` : false }
  });

  const fieldVariant = invalid ? 'error' : 'default';

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label 
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      {/* Input field */}
      <input
        {...field}
        id={name}
        className={cn(fieldVariants({ variant: fieldVariant }), className)}
        aria-invalid={invalid}
        aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        {...props}
      />
      
      {/* Description */}
      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error.message}
        </p>
      )}
    </div>
  );
}

/**
 * Form Textarea - Multi-line text input với auto-resize
 */
interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: TName;
  label?: string;
  description?: string;
  required?: boolean;
  control?: any;
  autoResize?: boolean;
}

function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  required = false,
  control,
  autoResize = false,
  className,
  ...props
}: FormTextareaProps<TFieldValues, TName>) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  const {
    field,
    fieldState: { error, invalid }
  } = useController({
    name,
    control,
    rules: { required: required ? `${label || name} is required` : false }
  });

  // Auto-resize functionality
  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [field.value, autoResize]);

  const fieldVariant = invalid ? 'error' : 'default';

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <textarea
        {...field}
        ref={textareaRef}
        id={name}
        className={cn(
          fieldVariants({ variant: fieldVariant }),
          "min-h-[80px] resize-vertical",
          autoResize && "resize-none",
          className
        )}
        aria-invalid={invalid}
        aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        {...props}
      />
      
      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error.message}
        </p>
      )}
    </div>
  );
}

/**
 * Form Select - Dropdown selection với custom styling
 */
interface FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: TName;
  label?: string;
  description?: string;
  required?: boolean;
  control?: any;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  required = false,
  control,
  options,
  placeholder,
  className,
  ...props
}: FormSelectProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error, invalid }
  } = useController({
    name,
    control,
    rules: { required: required ? `${label || name} is required` : false }
  });

  const fieldVariant = invalid ? 'error' : 'default';

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <select
        {...field}
        id={name}
        className={cn(fieldVariants({ variant: fieldVariant }), "cursor-pointer", className)}
        aria-invalid={invalid}
        aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value} 
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {description && !error && (
        <p id={`${name}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error.message}
        </p>
      )}
    </div>
  );
}

/**
 * Form Checkbox - Boolean input với custom styling
 */
interface FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: TName;
  label?: string;
  description?: string;
  control?: any;
}

function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  description,
  control,
  className,
  ...props
}: FormCheckboxProps<TFieldValues, TName>) {
  const {
    field: { value, onChange, ...field },
    fieldState: { error }
  } = useController({
    name,
    control,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          {...field}
          type="checkbox"
          id={name}
          checked={value || false}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(
            "h-4 w-4 rounded border border-input bg-background text-primary focus:ring-1 focus:ring-ring",
            className
          )}
          {...props}
        />
        {label && (
          <label 
            htmlFor={name}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
      
      {description && !error && (
        <p className="text-sm text-muted-foreground pl-6">
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 pl-6">
          <AlertCircle className="h-3 w-3" />
          {error.message}
        </p>
      )}
    </div>
  );
}

/**
 * Submit Button - Enhanced button với loading states
 */
interface FormSubmitButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

const FormSubmitButton = React.forwardRef<HTMLButtonElement, FormSubmitButtonProps>(
  ({ 
    children, 
    loading = false, 
    loadingText = "Submitting...", 
    variant = 'default',
    className,
    disabled,
    ...props 
  }, ref) => {
    const buttonVariants = cva(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
      {
        variants: {
          variant: {
            default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
            outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
          },
          size: {
            default: "h-9 px-4 py-2",
            sm: "h-8 rounded-md px-3 text-xs",
            lg: "h-10 rounded-md px-8",
          },
        },
        defaultVariants: {
          variant: "default",
          size: "default",
        },
      }
    );

    return (
      <button
        ref={ref}
        type="submit"
        disabled={loading || disabled}
        className={cn(buttonVariants({ variant }), className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? loadingText : children}
      </button>
    );
  }
);
FormSubmitButton.displayName = "FormSubmitButton";

/**
 * Form Layout Components
 */
const FormSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    description?: string;
  }
>(({ title, description, children, className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props}>
    {(title || description) && (
      <div className="space-y-1">
        {title && (
          <h3 className="text-lg font-medium leading-none">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )}
    {children}
  </div>
));
FormSection.displayName = "FormSection";

const FormGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    columns?: 1 | 2 | 3 | 4;
  }
>(({ columns = 2, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "grid gap-4",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 md:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      className
    )}
    {...props}
  />
));
FormGrid.displayName = "FormGrid";

// Exports
export {
  EnhancedForm,
  FormField,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormSubmitButton,
  FormSection,
  FormGrid,
  fieldVariants,
};

export type {
  EnhancedFormProps,
  FormFieldProps,
  FormTextareaProps,
  FormSelectProps,
  FormCheckboxProps,
  FormSubmitButtonProps,
};