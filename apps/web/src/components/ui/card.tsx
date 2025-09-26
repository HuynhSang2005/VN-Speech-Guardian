import * as React from "react"
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'

import { cn } from "@/lib/utils"

// =============================================================================
// Enhanced Card with Variants
// =============================================================================

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border shadow-lg",
        outline: "border-2 border-border bg-transparent",
        ghost: "border-transparent shadow-none",
        gradient: "border-border bg-gradient-to-br from-card to-card/80",
      },
      interactive: {
        false: "",
        true: "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      padding: "default",
    },
  }
)

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, padding, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "div"
    
    if (asChild) {
      return <>{props.children}</>
    }

    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, interactive, padding }), className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

// =============================================================================
// Enhanced Metric Card
// =============================================================================

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  loading?: boolean
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: () => void
}

const metricVariants = cva(
  "border-l-4",
  {
    variants: {
      variant: {
        default: "border-l-primary/20 bg-card",
        success: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
        warning: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
        danger: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
        info: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  loading = false,
  className,
  variant = 'default',
  onClick,
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const getTrendIcon = () => {
    if (!trend) return null
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    if (!trend) return ''
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card
      interactive={!!onClick}
      className={cn(metricVariants({ variant }), className)}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <p className="text-2xl font-bold">{formatValue(value)}</p>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
        
        {trend && (
          <div className="mt-4 flex items-center space-x-2">
            {getTrendIcon()}
            <span className={cn("text-sm font-medium", getTrendColor())}>
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Interactive Action Card
// =============================================================================

interface ActionCardProps {
  title: string
  description?: string
  children?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ReactNode
  loading?: boolean
  className?: string
  onClick?: () => void
}

export function ActionCard({
  title,
  description,
  children,
  actions,
  icon,
  loading = false,
  className,
  onClick,
}: ActionCardProps) {
  return (
    <Card
      interactive={!!onClick}
      className={cn("group", className)}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {icon}
              </div>
            )}
            <div>
              <CardTitle className="group-hover:text-primary transition-colors">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </CardHeader>
      
      {children && <CardContent>{children}</CardContent>}
      
      {actions && (
        <CardFooter className="justify-end space-x-2">{actions}</CardFooter>
      )}
    </Card>
  )
}

// =============================================================================
// Loading Card Skeleton
// =============================================================================

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-8 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  type CardProps 
}