/**
 * Enhanced Input Component System
 * Comprehensive form input với validation, icons, descriptions
 * Hỗ trợ React Hook Form và accessibility features
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Eye, EyeOff, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

// =============================================================================
// Base Input Component
// =============================================================================

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-9 px-3",
        lg: "h-11 px-4 text-base",
      },
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500",
        warning: "border-yellow-500 focus-visible:ring-yellow-500",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
  description?: string
  label?: string
  required?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    size, 
    variant, 
    leftIcon, 
    rightIcon, 
    error, 
    description, 
    label, 
    required,
    id,
    ...props 
  }, ref) => {
    const inputId = id || React.useId()
    const hasError = !!error
    const finalVariant = hasError ? 'error' : variant

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <input
            id={inputId}
            type={type}
            className={cn(
              inputVariants({ size, variant: finalVariant }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        
        {(error || description) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {description && !error && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// =============================================================================
// Password Input với show/hide toggle
// =============================================================================

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showToggle?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)
    
    const toggleVisibility = () => setIsVisible(!isVisible)
    
    return (
      <Input
        {...props}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        rightIcon={
          showToggle ? (
            <button
              type="button"
              onClick={toggleVisibility}
              className="p-1 hover:bg-muted rounded"
              tabIndex={-1}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : undefined
        }
      />
    )
  }
)
PasswordInput.displayName = "PasswordInput"

// =============================================================================
// Search Input với clear button
// =============================================================================

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void
  showClearButton?: boolean
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, showClearButton = true, value, ...props }, ref) => {
    const hasClearableValue = showClearButton && value && String(value).length > 0
    
    return (
      <Input
        {...props}
        ref={ref}
        type="search"
        value={value}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          hasClearableValue ? (
            <button
              type="button"
              onClick={onClear}
              className="p-1 hover:bg-muted rounded"
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

// =============================================================================
// Textarea Component
// =============================================================================

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  error?: string
  description?: string
  label?: string
  required?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    error, 
    description, 
    label, 
    required, 
    resize = 'vertical',
    id,
    ...props 
  }, ref) => {
    const textareaId = id || React.useId()
    const hasError = !!error
    const finalVariant = hasError ? 'error' : variant

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    }

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <textarea
          id={textareaId}
          className={cn(
            inputVariants({ variant: finalVariant }),
            resizeClasses[resize],
            "min-h-[80px]",
            className
          )}
          ref={ref}
          {...props}
        />
        
        {(error || description) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {description && !error && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

// =============================================================================
// Select Component (native select với styling)
// =============================================================================

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof inputVariants> {
  error?: string
  description?: string
  label?: string
  required?: boolean
  placeholder?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    variant, 
    size,
    error, 
    description, 
    label, 
    required,
    placeholder,
    options,
    id,
    ...props 
  }, ref) => {
    const selectId = id || React.useId()
    const hasError = !!error
    const finalVariant = hasError ? 'error' : variant

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={selectId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <select
          id={selectId}
          className={cn(
            inputVariants({ size, variant: finalVariant }),
            "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 4 5\"><path fill=\"%23666\" d=\"M2 0L0 2h4zm0 5L0 3h4z\"/></svg>')] bg-no-repeat bg-right bg-[length:12px] pr-8",
            className
          )}
          ref={ref}
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
        
        {(error || description) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {description && !error && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

// =============================================================================
// File Input Component
// =============================================================================

export interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>,
    VariantProps<typeof inputVariants> {
  error?: string
  description?: string
  label?: string
  required?: boolean
  onFileSelect?: (files: FileList | null) => void
  acceptedTypes?: string[]
  maxSize?: number // in bytes
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ 
    className, 
    variant, 
    size,
    error, 
    description, 
    label, 
    required,
    onFileSelect,
    acceptedTypes,
    maxSize,
    onChange,
    id,
    ...props 
  }, ref) => {
    const fileInputId = id || React.useId()
    const hasError = !!error
    const finalVariant = hasError ? 'error' : variant

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      onFileSelect?.(files)
      onChange?.(e)
    }

    const acceptString = acceptedTypes?.join(',')

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={fileInputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <input
          id={fileInputId}
          type="file"
          accept={acceptString}
          className={cn(
            inputVariants({ size, variant: finalVariant }),
            "file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80",
            className
          )}
          onChange={handleFileChange}
          ref={ref}
          {...props}
        />
        
        {(error || description) && (
          <div className="space-y-1">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {description && !error && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        
        {(acceptedTypes || maxSize) && (
          <div className="text-xs text-muted-foreground">
            {acceptedTypes && (
              <span>Accepted: {acceptedTypes.join(', ')}</span>
            )}
            {acceptedTypes && maxSize && <span> • </span>}
            {maxSize && (
              <span>Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB</span>
            )}
          </div>
        )}
      </div>
    )
  }
)
FileInput.displayName = "FileInput"

export { 
  Input, 
  PasswordInput, 
  SearchInput, 
  Textarea, 
  Select, 
  FileInput,
  inputVariants 
}