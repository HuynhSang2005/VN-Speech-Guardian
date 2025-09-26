/**
 * Form Components với React Hook Form v7 + Zod Integration
 * Modern form patterns với React 19 Actions và comprehensive validation
 */

import React, { type ReactNode } from 'react';
import { 
  useFieldArray, 
  FormProvider, 
  useFormContext,
  type Control,
  type FieldValues,
  type FieldPath,
  type UseFormReturn 
} from 'react-hook-form';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Enhanced form components
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from './textarea';
import { Checkbox } from './checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';

// Icons
import { AlertCircle, Plus, Trash2, Check } from 'lucide-react';

// =============================================================================
// Form Field Wrapper
// =============================================================================

export interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Universal form field wrapper với error handling và accessibility
 */
export function FormField({
  name,
  label,
  description,
  required,
  children,
  className
}: FormFieldProps) {
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
      
      <div className="relative" id={fieldId}>
        {children}
      </div>
      
      {error && (
        <div id={errorId} className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error.message as string}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Enhanced Form Component
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

export interface EnhancedFormProps<T extends FieldValues> 
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>,
    VariantProps<typeof formVariants> {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (errors: any) => void;
  children: ReactNode;
  loading?: boolean;
  resetOnSuccess?: boolean;
}

/**
 * Enhanced form component với comprehensive error handling
 */
export function EnhancedForm<T extends FieldValues>({
  form,
  onSubmit,
  onError,
  children,
  variant,
  size,
  className,
  loading,
  resetOnSuccess = false,
  ...props
}: EnhancedFormProps<T>) {
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    reset,
  } = form;

  const handleFormSubmit = async (data: T) => {
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
        onSubmit={handleSubmit(handleFormSubmit)}
        className={cn(formVariants({ variant, size }), className)}
        {...props}
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
      </form>
    </FormProvider>
  );
}

// =============================================================================
// Specialized Form Fields
// =============================================================================

/**
 * Text input field với validation
 */
export interface TextFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  className?: string;
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
    <FormField
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
    </FormField>
  );
}

/**
 * Textarea field với character counting
 */
export interface TextareaFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  className?: string;
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
  const value = watch(name) || '';
  
  return (
    <FormField
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
    </FormField>
  );
}

/**
 * Select field với React Hook Form integration
 */
export interface SelectFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
}

export function SelectField({
  name,
  label,
  placeholder = 'Select an option...',
  description,
  required,
  options,
  className
}: SelectFieldProps) {
  const { setValue, watch, formState: { errors } } = useFormContext();
  const value = watch(name);
  
  return (
    <FormField
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
    >
      <Select value={value} onValueChange={(val) => setValue(name, val)}>
        <SelectTrigger className={errors[name] ? 'border-destructive focus:ring-destructive' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value} 
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

/**
 * Checkbox field với proper boolean handling
 */
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
  required,
  className
}: CheckboxFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  
  return (
    <div className={cn('flex items-start space-x-3', className)}>
      <Checkbox
        {...register(name)}
        className={errors[name] ? 'border-destructive' : ''}
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
            <span>{errors[name]?.message as string}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Dynamic Field Arrays
// =============================================================================

export interface DynamicFieldArrayProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  description?: string;
  renderField: (index: number, remove: (index: number) => void) => ReactNode;
  addButtonText?: string;
  maxItems?: number;
  minItems?: number;
  className?: string;
}

/**
 * Dynamic field array component với add/remove functionality
 */
export function DynamicFieldArray<T extends FieldValues>({
  name,
  control,
  label,
  description,
  renderField,
  addButtonText = 'Add Item',
  maxItems,
  minItems = 0,
  className
}: DynamicFieldArrayProps<T>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const canAdd = !maxItems || fields.length < maxItems;
  const canRemove = fields.length > minItems;

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="relative group">
            <div className="border rounded-lg p-4 space-y-4">
              {renderField(index, canRemove ? remove : () => {})}
              
              {canRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canAdd && (
        <Button
          type="button"
          variant="outline"
          onClick={() => append({} as any)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {addButtonText}
          {maxItems && (
            <Badge variant="secondary" className="ml-2">
              {fields.length}/{maxItems}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Form Actions & Submit
// =============================================================================

export interface FormActionsProps {
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  showCancel?: boolean;
  submitDisabled?: boolean;
  className?: string;
}

/**
 * Standardized form action buttons
 */
export function FormActions({
  loading,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onCancel,
  showCancel = true,
  submitDisabled,
  className
}: FormActionsProps) {
  return (
    <div className={cn('flex justify-end space-x-3 pt-6 border-t', className)}>
      {showCancel && onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
      )}
      
      <Button
        type="submit"
        disabled={loading || submitDisabled}
        className="min-w-[100px]"
      >
        {loading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2" />
            Submitting...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            {submitText}
          </>
        )}
      </Button>
    </div>
  );
}

// =============================================================================
// Async Validation Hook
// =============================================================================

export interface AsyncValidationOptions {
  debounceMs?: number;
  validateOnMount?: boolean;
}

/**
 * Hook for async field validation với debouncing
 */
export function useAsyncValidation(
  fieldName: string,
  validationFn: (value: any) => Promise<boolean | string>,
  options: AsyncValidationOptions = {}
) {
  const { debounceMs = 300, validateOnMount = false } = options;
  const { watch, setError, clearErrors } = useFormContext();
  const [isValidating, setIsValidating] = React.useState(false);
  
  const fieldValue = watch(fieldName);
  
  React.useEffect(() => {
    if (!fieldValue && !validateOnMount) return;
    
    setIsValidating(true);
    const timer = setTimeout(async () => {
      try {
        const result = await validationFn(fieldValue);
        if (typeof result === 'string') {
          setError(fieldName, { message: result });
        } else if (result === false) {
          setError(fieldName, { message: 'Validation failed' });
        } else {
          clearErrors(fieldName);
        }
      } catch (error) {
        setError(fieldName, { message: 'Validation error occurred' });
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [fieldValue, fieldName, validationFn, debounceMs, validateOnMount, setError, clearErrors]);
  
  return { isValidating };
}