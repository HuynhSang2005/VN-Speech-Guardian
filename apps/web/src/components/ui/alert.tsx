/**
 * Enhanced Alert & Toast Component System
 * Modern notification system với comprehensive variants
 * Support: toast notifications, dismissible alerts, auto icons
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  X 
} from 'lucide-react'

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success: "border-green-500/50 text-green-700 bg-green-50/50 dark:border-green-500 dark:text-green-400 dark:bg-green-950/20 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        warning: "border-yellow-500/50 text-yellow-700 bg-yellow-50/50 dark:border-yellow-500 dark:text-yellow-400 dark:bg-yellow-950/20 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
        info: "border-blue-500/50 text-blue-700 bg-blue-50/50 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-950/20 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

// =============================================================================
// Enhanced Alert với Auto Icon và Dismiss
// =============================================================================

interface EnhancedAlertProps {
  variant: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  icon?: React.ReactNode
  autoIcon?: boolean
}

const variantIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
}

export function EnhancedAlert({
  variant,
  title,
  children,
  dismissible = false,
  onDismiss,
  className,
  icon,
  autoIcon = true,
}: EnhancedAlertProps) {
  const IconComponent = icon || (autoIcon ? variantIcons[variant] : null)

  return (
    <Alert variant={variant} className={cn("relative", dismissible && "pr-10", className)}>
      {IconComponent && (
        typeof IconComponent === 'function' ? (
          <IconComponent className="h-4 w-4" />
        ) : (
          <span className="h-4 w-4">{IconComponent}</span>
        )
      )}
      
      <div>
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{children}</AlertDescription>
      </div>

      {dismissible && (
        <button
          type="button"
          className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </Alert>
  )
}

// =============================================================================
// Detection Alert for Speech Guardian
// =============================================================================

interface DetectionAlertProps {
  detection: {
    type: 'offensive' | 'toxic' | 'hate' | 'spam'
    confidence: number
    snippet: string
    timestamp: string
  }
  onDismiss?: () => void
  className?: string
}

const detectionConfig = {
  offensive: {
    variant: 'warning' as const,
    title: 'Offensive Content Detected',
    icon: AlertTriangle,
  },
  toxic: {
    variant: 'destructive' as const,
    title: 'Toxic Language Detected',
    icon: AlertCircle,
  },
  hate: {
    variant: 'destructive' as const,
    title: 'Hate Speech Detected',
    icon: AlertCircle,
  },
  spam: {
    variant: 'info' as const,
    title: 'Spam Content Detected',
    icon: Info,
  },
}

export function DetectionAlert({
  detection,
  onDismiss,
  className,
}: DetectionAlertProps) {
  const config = detectionConfig[detection.type]
  const confidencePercent = Math.round(detection.confidence * 100)

  return (
    <EnhancedAlert
      variant={config.variant}
      title={config.title}
      dismissible={!!onDismiss}
      onDismiss={onDismiss}
      icon={<config.icon />}
      className={className}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <span className="text-xs font-mono">{confidencePercent}%</span>
        </div>
        
        <div className="rounded bg-muted/50 p-2 text-xs font-mono">
          "{detection.snippet}"
        </div>
        
        <div className="text-xs text-muted-foreground">
          Detected at {detection.timestamp}
        </div>
      </div>
    </EnhancedAlert>
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }