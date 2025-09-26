/**
 * Enhanced Badge Component System
 * Modern badge variants để hiển thị status, notifications, severity levels
 * Support: removable badges, icons, pulse animations, notification counts
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

import { cn } from "@/lib/utils"

// =============================================================================
// Enhanced Badge with More Variants
// =============================================================================

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600",
        info: "border-transparent bg-blue-500 text-white shadow hover:bg-blue-600",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-accent",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      interactive: {
        false: "",
        true: "cursor-pointer hover:scale-105 active:scale-95",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean
  onRemove?: () => void
  icon?: React.ReactNode
  pulse?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, interactive, removable, onRemove, icon, pulse, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, interactive: interactive || removable }),
          pulse && "animate-pulse",
          className
        )}
        {...props}
      >
        {icon && <span className="mr-1 h-3 w-3">{icon}</span>}
        <span>{children}</span>
        {removable && (
          <button
            type="button"
            className="ml-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-black/20"
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            aria-label="Remove badge"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// =============================================================================
// Status Badge with Icons
// =============================================================================

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral'
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'default' | 'lg'
  showIcon?: boolean
  pulse?: boolean
}

const statusConfig = {
  success: {
    variant: 'success' as const,
    icon: CheckCircle,
  },
  warning: {
    variant: 'warning' as const,
    icon: AlertTriangle,
  },
  error: {
    variant: 'destructive' as const,
    icon: AlertCircle,
  },
  info: {
    variant: 'info' as const,
    icon: Info,
  },
  pending: {
    variant: 'secondary' as const,
    icon: AlertCircle,
  },
  neutral: {
    variant: 'outline' as const,
    icon: null,
  },
}

export function StatusBadge({
  status,
  children,
  className,
  size = 'default',
  showIcon = true,
  pulse = false,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const IconComponent = config.icon

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={showIcon && IconComponent ? <IconComponent /> : undefined}
      pulse={pulse}
      className={className}
    >
      {children}
    </Badge>
  )
}

// =============================================================================
// Severity Badge for Detection System
// =============================================================================

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical'
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

const severityConfig = {
  low: {
    variant: 'outline' as const,
    label: 'Low',
    className: 'text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/20',
  },
  medium: {
    variant: 'warning' as const,
    label: 'Medium',
    className: '',
  },
  high: {
    variant: 'destructive' as const,
    label: 'High',
    className: '',
  },
  critical: {
    variant: 'destructive' as const,
    label: 'Critical',
    className: 'bg-red-600 hover:bg-red-700 animate-pulse',
  },
}

export function SeverityBadge({
  severity,
  className,
  size = 'default',
}: SeverityBadgeProps) {
  const config = severityConfig[severity]

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

// =============================================================================
// Connection Status Badge
// =============================================================================

interface ConnectionStatusBadgeProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  className?: string
  showText?: boolean
}

const connectionConfig = {
  connected: {
    variant: 'success' as const,
    label: 'Connected',
    pulse: false,
  },
  connecting: {
    variant: 'warning' as const,
    label: 'Connecting...',
    pulse: true,
  },
  disconnected: {
    variant: 'secondary' as const,
    label: 'Disconnected',
    pulse: false,
  },
  error: {
    variant: 'destructive' as const,
    label: 'Connection Error',
    pulse: false,
  },
}

export function ConnectionStatusBadge({
  status,
  className,
  showText = true,
}: ConnectionStatusBadgeProps) {
  const config = connectionConfig[status]

  return (
    <Badge
      variant={config.variant}
      pulse={config.pulse}
      className={cn("relative", className)}
    >
      <div className="flex items-center space-x-1">
        <div className={cn(
          "h-2 w-2 rounded-full",
          status === 'connected' && "bg-green-400",
          status === 'connecting' && "bg-yellow-400",
          status === 'disconnected' && "bg-gray-400",
          status === 'error' && "bg-red-400"
        )} />
        {showText && <span>{config.label}</span>}
      </div>
    </Badge>
  )
}

export { Badge, badgeVariants }